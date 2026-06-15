import type { InterviewEvaluation } from "@/lib/interview-types";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

function sanitizeQuestionText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/[^\p{L}\p{N}\p{P}\p{Zs}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getGeminiApiKey() {
  return (
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ""
  );
}

async function callGemini(prompt: string) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
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
          temperature: 0.7,
        },
      }),
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Gemini request failed: ${message}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  return JSON.parse(text);
}

export async function generateInterviewQuestions(input: {
  candidateName: string;
  jobRole: string;
  resumeText: string;
}) {
  const { candidateName, jobRole, resumeText } = input;

  try {
    const result = await callGemini(`
You are an expert HR interviewer.
Return strict JSON in the shape {"questions":["..."]}.
Generate exactly 10 unique interview questions for a candidate.

Candidate name: ${candidateName}
Target role: ${jobRole}
Resume text:
${resumeText.slice(0, 16000)}

Rules:
- Questions must be HR-style and realistic.
- Personalize them using the resume's skills, projects, internships, achievements, and tools.
- Keep each question under 35 words.
- Do not number the questions.
- Do not include headings or explanations.
    `);

    if (Array.isArray(result?.questions) && result.questions.length >= 10) {
      return result.questions
        .slice(0, 10)
        .map((item: unknown) => sanitizeQuestionText(String(item)))
        .filter(Boolean);
    }

    throw new Error("Gemini did not return 10 questions.");
  } catch {
    return [
      `Tell me about yourself and how your background prepares you for a ${jobRole} position.`,
      `Which project on your resume best reflects your readiness for this ${jobRole} role, and why?`,
      `I noticed your relevant project and technical experience on the resume. What specific impact did you create there?`,
      `What was the most challenging problem you solved in your recent work, and how did you approach it?`,
      `How have your skills and tools from the resume helped you work effectively in a team setting?`,
      `Describe a time when you had to learn something quickly to deliver results on a project.`,
      `What accomplishment on your resume are you most proud of, and what does it say about your strengths?`,
      `Tell me about a setback or failure you faced in one of your projects and what you learned from it.`,
      `Why are you interested in this ${jobRole} opportunity, given the experience shown in your resume?`,
      `If we hire you for this ${jobRole} position, what value would you aim to deliver in your first few months?`,
    ].map(sanitizeQuestionText);
  }
}

function buildFallbackFollowUpQuestion(input: {
  currentQuestion: string;
  answer: string;
  jobRole: string;
  resumeText: string;
}) {
  const answer = input.answer.toLowerCase();
  const resumeText = input.resumeText.toLowerCase();

  if (answer.includes("internship") || resumeText.includes("internship")) {
    return "You mentioned your internship. What were your main responsibilities, and what result or learning came out of that experience?";
  }

  if (answer.includes("project") || resumeText.includes("project")) {
    return "Tell me more about that project. What challenge did you personally solve, and what impact did your contribution make?";
  }

  if (answer.includes("team") || answer.includes("collaborat")) {
    return "Can you share a specific example of how you worked with your team, handled communication, and kept the work moving forward?";
  }

  if (answer.includes("skill") || answer.includes("python") || answer.includes("react") || answer.includes("java")) {
    return `Which skill from your answer would you say is strongest for a ${input.jobRole} role, and how have you applied it in real work?`;
  }

  return `Based on what you just shared, can you give me one specific example that better shows your readiness for this ${input.jobRole} role?`;
}

export async function generateFollowUpQuestion(input: {
  candidateName: string;
  currentQuestion: string;
  answer: string;
  jobRole: string;
  resumeText: string;
  askedQuestions: string[];
}) {
  const { candidateName, currentQuestion, answer, jobRole, resumeText, askedQuestions } = input;

  try {
    const result = await callGemini(`
You are an expert human HR interviewer running a realistic interview.
Return strict JSON in the shape {"question":"..."}.

Candidate name: ${candidateName}
Target role: ${jobRole}
Resume text:
${resumeText.slice(0, 12000)}

Questions already asked:
${askedQuestions.map((item, index) => `${index + 1}. ${item}`).join("\n")}

Latest interviewer question:
${currentQuestion}

Candidate's latest answer:
${answer}

Rules:
- Ask exactly one next interview question.
- The question should feel like a natural HR follow-up to the latest answer whenever possible.
- If the candidate mentioned an internship, project, responsibility, tool, achievement, strength, or challenge, ask deeper about that.
- If the latest answer is weak or vague, ask a clarifying question.
- Use the resume to personalize the question.
- Do not repeat earlier questions.
- Keep it under 32 words.
- Do not number it.
- Do not add explanations.
    `);

    if (typeof result?.question === "string") {
      const sanitized = sanitizeQuestionText(result.question);
      if (sanitized) {
        return sanitized;
      }
    }

    throw new Error("Gemini follow-up response was invalid.");
  } catch {
    return sanitizeQuestionText(buildFallbackFollowUpQuestion(input));
  }
}

function overlapScore(question: string, answer: string) {
  const questionTerms = new Set(
    question
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 4)
  );

  const answerTerms = new Set(
    answer
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((term) => term.length > 4)
  );

  let overlap = 0;
  questionTerms.forEach((term) => {
    if (answerTerms.has(term)) overlap += 1;
  });

  return overlap;
}

export async function evaluateInterviewAnswer(input: {
  question: string;
  answer: string;
  jobRole: string;
  resumeText: string;
}) {
  const { question, answer, jobRole, resumeText } = input;

  try {
    const result = await callGemini(`
You are a professional HR interviewer evaluating a spoken answer.
Return strict JSON in the shape {"score": 0-10, "feedback":"..."}.

Target role: ${jobRole}
Resume text:
${resumeText.slice(0, 12000)}

Question:
${question}

Candidate answer:
${answer}

Rules:
- Score from 0 to 10.
- Feedback must be 1 or 2 concise lines.
- Consider clarity, confidence, relevance, and alignment with the resume.
    `);

    if (typeof result?.score === "number" && typeof result?.feedback === "string") {
      return {
        score: Math.max(0, Math.min(10, Number(result.score))),
        feedback: result.feedback.trim(),
      } satisfies InterviewEvaluation;
    }

    throw new Error("Gemini evaluation response was invalid.");
  } catch {
    const trimmed = answer.trim();
    const baseScore = trimmed.length > 220 ? 8 : trimmed.length > 120 ? 7 : trimmed.length > 60 ? 6 : trimmed.length > 20 ? 5 : 3;
    const score = Math.min(10, baseScore + Math.min(2, overlapScore(question, answer)));
    const feedback =
      trimmed.length < 40
        ? "Your answer was quite short. Add more context, examples, and measurable outcomes."
        : "Your answer is relevant. Make it stronger by adding clearer structure, impact, and a specific example.";

    return { score, feedback };
  }
}
