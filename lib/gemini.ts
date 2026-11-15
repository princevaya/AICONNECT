

import type { InterviewEvaluation } from "@/lib/interview-types";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const QUESTION_COUNT = 10;

type JsonObject = Record<string, unknown>;

/* =====================================================
   TEXT CLEANING AND QUESTION VALIDATION
===================================================== */

function sanitizeQuestionText(value: string): string {
  return value
    .replace(/\u0000/g, " ")
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeQuestion(value: string): string {
  return sanitizeQuestionText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getQuestionTerms(value: string): Set<string> {
  const stopWords = new Set([
    "about", "after", "again", "also", "and", "are", "can",
    "could", "describe", "did", "does", "for", "from", "have",
    "help", "how", "into", "more", "most", "that", "their",
    "them", "then", "there", "this", "what", "when", "where",
    "which", "while", "with", "would", "you", "your", "yourself",
    "tell", "explain", "give", "share", "please", "was", "were",
    "the", "why",
  ]);

  return new Set(
    normalizeQuestion(value)
      .split(" ")
      .filter((word) => word.length > 2 && !stopWords.has(word))
  );
}

function similarityScore(first: string, second: string): number {
  const firstTerms = getQuestionTerms(first);
  const secondTerms = getQuestionTerms(second);

  if (!firstTerms.size || !secondTerms.size) return 0;

  const intersection = [...firstTerms].filter((term) =>
    secondTerms.has(term)
  ).length;

  const union = new Set([...firstTerms, ...secondTerms]).size;

  const jaccard = intersection / union;

  const containment =
    intersection / Math.min(firstTerms.size, secondTerms.size);

  return Math.max(jaccard, containment * 0.85);
}

function isDuplicateQuestion(
  question: string,
  previousQuestions: string[],
  threshold = 0.88
): boolean {
  const normalized = normalizeQuestion(question);

  if (!normalized) return true;

  return previousQuestions.some((previous) => {
    if (normalizeQuestion(previous) === normalized) return true;

    return similarityScore(question, previous) >= threshold;
  });
}

function validateUniqueQuestions(
  questions: unknown[],
  previousQuestions: string[] = [],
  limit = QUESTION_COUNT
): string[] {
  const accepted: string[] = [];
  const history = [...previousQuestions];

  for (const item of questions) {
    if (typeof item !== "string") continue;

    const question = sanitizeQuestionText(item);

    if (!question || question.split(/\s+/).length > 45) continue;

    if (isDuplicateQuestion(question, history)) continue;

    accepted.push(question);
    history.push(question);

    if (accepted.length >= limit) break;
  }

  return accepted;
}

/* =====================================================
   GEMINI API
===================================================== */

function getGeminiApiKey(): string {
  return (
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  );
}

function isJsonObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

async function callGemini(prompt: string): Promise<unknown> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error(
      "Gemini API key is missing. Add GOOGLE_GEMINI_API_KEY or GEMINI_API_KEY to .env.local."
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.8,
          maxOutputTokens: 4096,
        },
      }),
    }
  );

  if (!response.ok) {
    const message = await response.text();

    throw new Error(
      `Gemini request failed (${response.status}): ${message}`
    );
  }

  const data: unknown = await response.json();

  if (!isJsonObject(data)) {
    throw new Error("Gemini returned an invalid response.");
  }

  const candidates = data.candidates;

  if (!Array.isArray(candidates) || !isJsonObject(candidates[0])) {
    throw new Error("Gemini returned no response candidates.");
  }

  const content = candidates[0].content;

  if (!isJsonObject(content) || !Array.isArray(content.parts)) {
    throw new Error("Gemini returned an empty response.");
  }

  const textPart = content.parts.find(
    (part) => isJsonObject(part) && typeof part.text === "string"
  );

  if (!isJsonObject(textPart) || typeof textPart.text !== "string") {
    throw new Error("Gemini returned no text.");
  }

  const rawText = textPart.text.trim();

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");

    if (start >= 0 && end > start) {
      try {
        return JSON.parse(rawText.slice(start, end + 1)) as unknown;
      } catch {
        // Return the error below.
      }
    }

    throw new Error("Gemini returned invalid JSON.");
  }
}

/* =====================================================
   RESUME ANALYSIS
===================================================== */

function extractResumeFacts(resumeText: string): string[] {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => sanitizeQuestionText(line))
    .filter((line) => line.length >= 8 && line.length <= 260);

  const keywords = new RegExp(
    [
      "project",
      "intern",
      "experience",
      "developed",
      "built",
      "created",
      "implemented",
      "worked",
      "responsible",
      "achievement",
      "certification",
      "python",
      "java",
      "javascript",
      "react",
      "next",
      "node",
      "sql",
      "mysql",
      "postgresql",
      "machine learning",
      "deep learning",
      "api",
      "flask",
      "fastapi",
      "leadership",
      "team",
      "award",
      "trained",
      "managed",
      "designed",
      "analyzed",
      "cloud",
      "database",
      "frontend",
      "backend",
      "model",
      "application",
      "system",
      "education",
      "degree",
      "course",
      "skill",
    ].join("|"),
    "i"
  );

  return [
    ...new Set(lines.filter((line) => keywords.test(line))),
  ].slice(0, 20);
}

/* =====================================================
   HR-STYLE FALLBACK QUESTIONS
===================================================== */

function buildFallbackInterviewQuestions(input: {
  jobRole: string;
  resumeText: string;
  askedQuestions: string[];
}): string[] {
  const facts = extractResumeFacts(input.resumeText);

  const hasProject = facts.some((fact) =>
    /\b(project|developed|built|created|implemented)\b/i.test(fact)
  );

  const hasExperience = facts.some((fact) =>
    /\b(intern|experience|worked|responsible)\b/i.test(fact)
  );

  const hasSkills = facts.some((fact) =>
    /\b(python|java|javascript|react|next|sql|mysql|machine learning|api|flask|fastapi)\b/i.test(fact)
  );

  const candidates = [
    hasProject
      ? "Can you walk me through one of your projects? What problem were you solving, and what exactly was your contribution?"
      : "Tell me about a practical project or task where you applied your knowledge. What did you learn from it?",

    hasExperience
      ? "What was the most challenging situation you faced during your internship or work experience, and how did you handle it?"
      : "What practical experience have you gained outside your regular academic studies?",

    hasSkills
      ? "Which technical skill from your resume are you most confident about? Can you explain how you have used it in practice?"
      : "Which technical skill are you most confident about, and how have you developed it?",

    "How has your academic journey prepared you for the responsibilities of this position?",

    `Suppose you face a difficult technical problem in your ${input.jobRole} role. How would you approach solving it?`,

    "If you are assigned a task using a technology you have never worked with, how would you complete it?",

    "Tell me about a time you worked with a team. What role did you play, and how did you contribute?",

    "What are your biggest strengths, and can you give an example of how you demonstrated them?",

    "Tell me about a mistake or failure you experienced. What did you learn from it?",

    `Why do you want to work as a ${input.jobRole}, and why should we hire you?`,
  ];

  const questions = validateUniqueQuestions(
    candidates,
    input.askedQuestions,
    QUESTION_COUNT
  );

  const reserveQuestions = [
    "How do you handle pressure when you have multiple deadlines?",
    "How do you respond when a teammate disagrees with your approach?",
    "What motivates you to learn and improve professionally?",
    "Where do you see yourself growing in the next three years?",
    "What kind of work environment helps you perform at your best?",
    "What is one area you are actively working to improve?",
    "How would your teammates describe your working style?",
    "How do you react when you receive critical feedback?",
    "What would you like to achieve in your first few months in this role?",
    "How do you manage your time when several tasks are equally important?",
    "What makes you different from other candidates applying for this role?",
    "How do you stay updated with changes in your technical field?",
  ];

  for (const question of reserveQuestions) {
    if (questions.length >= QUESTION_COUNT) break;

    if (
      !isDuplicateQuestion(
        question,
        [...input.askedQuestions, ...questions]
      )
    ) {
      questions.push(question);
    }
  }

  return questions.slice(0, QUESTION_COUNT);
}

/* =====================================================
   INITIAL INTERVIEW QUESTION GENERATION
===================================================== */

export async function generateInterviewQuestions(input: {
  candidateName: string;
  jobRole: string;
  resumeText: string;
  askedQuestions?: string[];
}): Promise<string[]> {
  const {
    candidateName,
    jobRole,
    resumeText,
    askedQuestions = [],
  } = input;

  if (!resumeText.trim()) {
    throw new Error(
      "Resume text is empty. Upload a valid resume first."
    );
  }

  const history = askedQuestions.filter(
    (question): question is string =>
      typeof question === "string" && question.trim().length > 0
  );

  const facts = extractResumeFacts(resumeText);

  const prompt = `
You are a senior HR interviewer and experienced technical interviewer.

Conduct a realistic job interview for this candidate.

Do not behave like a resume-reading machine. Read the resume, understand the candidate's background, and ask meaningful questions that a real interviewer would ask.

CANDIDATE NAME:
${candidateName}

JOB ROLE:
${jobRole}

CANDIDATE RESUME:
${resumeText.slice(0, 16000)}

RESUME DETAILS:
${facts.length ? facts.join("\n") : "No clearly identified resume details."}

PREVIOUSLY ASKED QUESTIONS:
${history.length ? history.map((q, i) => `${i + 1}. ${q}`).join("\n") : "None"}

GENERATE EXACTLY 10 QUESTIONS.

QUESTION DISTRIBUTION:

1. RESUME AND EXPERIENCE — 4 QUESTIONS

Ask about:
- Projects and the actual problem they solved.
- The candidate's personal contribution.
- Technology choices and reasoning.
- Internship, experience, challenges and learning.

Questions should explore the candidate's understanding.
Do not simply repeat resume statements.

2. ROLE-RELATED TECHNICAL — 2 QUESTIONS

- Ask practical questions relevant to ${jobRole}.
- Match the candidate's experience level.
- Include real-world problem-solving.
- Use technologies from the resume when relevant.

3. HR AND BEHAVIOURAL — 3 QUESTIONS

Ask about:
- Strengths and weaknesses.
- Teamwork and communication.
- Handling pressure and deadlines.
- Mistakes, challenges and feedback.
- Learning attitude and adaptability.

4. CAREER AND MOTIVATION — 1 QUESTION

Ask about career goals, interest in this role, or why the candidate should be selected.

IMPORTANT RULES:

- Questions must sound natural and conversational.
- Read and understand the resume before asking questions.
- Personalize questions using actual resume details.
- Do not start every question with "Your resume mentions".
- Do not merely convert resume lines into questions.
- Do not invent projects, companies, technologies or achievements.
- Do not ask the same question in different words.
- Do not make all questions technical.
- Avoid unnecessary generic questions.
- Each question must have a different purpose.
- Do not repeat previous questions.
- Keep each question under 45 words.
- Do not include answers or explanations.
- Return exactly 10 questions.

Return strict JSON only:

{
  "questions": [
    "Question 1",
    "Question 2",
    "Question 3",
    "Question 4",
    "Question 5",
    "Question 6",
    "Question 7",
    "Question 8",
    "Question 9",
    "Question 10"
  ]
}
`;

  try {
    const result = await callGemini(prompt);

    const rawQuestions =
      isJsonObject(result) && Array.isArray(result.questions)
        ? result.questions
        : [];

    let questions = validateUniqueQuestions(
      rawQuestions,
      history,
      QUESTION_COUNT
    );

    // Retry once if Gemini returns incomplete or duplicate questions.
    if (questions.length < QUESTION_COUNT) {
      console.warn(
        `[generateInterviewQuestions] Gemini returned ${questions.length} valid questions. Retrying.`
      );

      const retryResult = await callGemini(`
${prompt}

Your previous response did not contain 10 valid unique questions.

Generate a fresh set of exactly 10 questions.
Ensure that all questions have different purposes.
Follow the required HR, resume, technical and career distribution.
Return JSON only.
`);

      const retryRaw =
        isJsonObject(retryResult) && Array.isArray(retryResult.questions)
          ? retryResult.questions
          : [];

      questions = validateUniqueQuestions(
        [...questions, ...retryRaw],
        history,
        QUESTION_COUNT
      );
    }

    if (questions.length === QUESTION_COUNT) {
      return questions;
    }

    // Complete missing questions with HR-style fallback questions.
    const fallback = buildFallbackInterviewQuestions({
      jobRole,
      resumeText,
      askedQuestions: [...history, ...questions],
    });

    const completed = validateUniqueQuestions(
      [...questions, ...fallback],
      history,
      QUESTION_COUNT
    );

    if (completed.length === QUESTION_COUNT) {
      return completed;
    }

    throw new Error(
      `Only ${completed.length} unique questions could be generated.`
    );
  } catch (error) {
    console.error(
      "[generateInterviewQuestions] Gemini failed. Using HR fallback:",
      error
    );

    const fallback = buildFallbackInterviewQuestions({
      jobRole,
      resumeText,
      askedQuestions: history,
    });

    if (fallback.length === QUESTION_COUNT) {
      return fallback;
    }

    throw new Error(
      "Could not prepare 10 interview questions. Check the resume text and Gemini API configuration."
    );
  }
}

/* =====================================================
   CONDITIONAL FOLLOW-UP QUESTION
===================================================== */

export async function generateFollowUpQuestion(input: {
  candidateName: string;
  currentQuestion: string;
  answer: string;
  jobRole: string;
  resumeText: string;
  askedQuestions: string[];
}): Promise<string | null> {
  const {
    candidateName,
    currentQuestion,
    answer,
    jobRole,
    resumeText,
    askedQuestions,
  } = input;

  const history = [
    ...askedQuestions,
    currentQuestion,
  ].filter(
    (question): question is string =>
      typeof question === "string" && question.trim().length > 0
  );

  try {
    const result = await callGemini(`
You are an experienced human interviewer.

Decide whether the candidate's latest answer genuinely needs one follow-up question.

CANDIDATE:
${candidateName}

ROLE:
${jobRole}

RESUME:
${resumeText.slice(0, 12000)}

CURRENT QUESTION:
${currentQuestion}

CANDIDATE'S ANSWER:
${answer}

QUESTIONS ALREADY ASKED:
${history.map((q, i) => `${i + 1}. ${q}`).join("\n")}

Return JSON only:

{
  "shouldAskFollowUp": true,
  "question": "One concise follow-up question"
}

OR:

{
  "shouldAskFollowUp": false,
  "question": null
}

RULES:

- Ask a follow-up only if the answer is vague, incomplete, unclear or deserves deeper exploration.
- Ask about personal contribution, technical decisions, challenges or results when relevant.
- Do not ask a follow-up just to continue the interview.
- Do not ask the candidate to repeat information already provided.
- Do not repeat or paraphrase earlier questions.
- Do not invent resume facts.
- Ask exactly one question if clarification is genuinely needed.
- Keep it under 32 words.
- Return JSON only.
`);

    if (
      !isJsonObject(result) ||
      result.shouldAskFollowUp !== true ||
      typeof result.question !== "string"
    ) {
      return null;
    }

    const question = sanitizeQuestionText(result.question);
    const wordCount = question.split(/\s+/).filter(Boolean).length;

    if (
      !question ||
      wordCount > 32 ||
      isDuplicateQuestion(question, history, 0.88)
    ) {
      return null;
    }

    return question;
  } catch (error) {
    console.error(
      "[generateFollowUpQuestion] failed:",
      error
    );

    return null;
  }
}

/* =====================================================
   ANSWER EVALUATION
===================================================== */

function overlapScore(question: string, answer: string): number {
  const questionTerms = getQuestionTerms(question);
  const answerTerms = getQuestionTerms(answer);

  let overlap = 0;

  questionTerms.forEach((term) => {
    if (answerTerms.has(term)) {
      overlap += 1;
    }
  });

  return overlap;
}

export async function evaluateInterviewAnswer(input: {
  question: string;
  answer: string;
  jobRole: string;
  resumeText: string;
}): Promise<InterviewEvaluation> {
  const {
    question,
    answer,
    jobRole,
    resumeText,
  } = input;

  try {
    const result = await callGemini(`
You are a professional HR and technical interviewer evaluating a candidate.

Evaluate the answer fairly based on the question, job role and resume.

TARGET ROLE:
${jobRole}

CANDIDATE RESUME:
${resumeText.slice(0, 12000)}

INTERVIEW QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

Evaluate these factors:

1. Relevance to the question.
2. Clarity and communication.
3. Technical or practical understanding.
4. Examples and explanation.
5. Personal contribution where relevant.
6. Alignment with the job role.

Give a score from 0 to 10.

Do not reward answer length alone.
Do not give a high score to a long but irrelevant answer.
Be constructive and professional.

Return JSON only:

{
  "score": 7,
  "feedback": "One or two concise sentences explaining the evaluation."
}
`);

    if (
      isJsonObject(result) &&
      typeof result.score === "number" &&
      typeof result.feedback === "string"
    ) {
      return {
        score: Math.max(0, Math.min(10, result.score)),
        feedback: result.feedback.trim(),
      };
    }

    throw new Error("Gemini evaluation response was invalid.");
  } catch (error) {
    console.error(
      "[evaluateInterviewAnswer] Gemini evaluation failed:",
      error
    );

    const trimmed = answer.trim();

    const baseScore =
      trimmed.length > 220
        ? 8
        : trimmed.length > 120
          ? 7
          : trimmed.length > 60
            ? 6
            : trimmed.length > 20
              ? 5
              : 3;

    const score = Math.min(
      10,
      baseScore + Math.min(2, overlapScore(question, answer))
    );

    const feedback =
      trimmed.length < 40
        ? "Your answer was quite short. Add context, a specific example and the result."
        : "Your answer has relevant content. Strengthen it with clearer structure, your personal contribution and a specific outcome.";

    return {
      score,
      feedback,
    };
  }
}
