"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Mic,
  MicOff,
  Phone,
  Radio,
  Send,
  User,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { InterviewEvaluation } from "@/lib/interview-types";
import Webcam from "react-webcam";

type LiveInterviewPayload = {
  sessionId: string;
  candidateName: string;
  jobRole: string;
  questions: string[];
};

type InterviewSessionResponse = {
  session?: {
    id: string;
    candidateName: string;
    jobRole: string;
    questions: string[];
  };
  error?: string;
};

type EvaluateInterviewResponse = {
  evaluation?: InterviewEvaluation;
  nextQuestion?: string | null;
  session?: {
    id: string;
    candidateName: string;
    jobRole: string;
    questions: string[];
  };
  error?: string;
};

type WindowWithSpeech = Window & {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
};

type SpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

const recruiterAvatar = "/ai/ai-interviewer.webp";
const sessionStorageKey = "aiconnect-live-interview";
const preferredFemaleVoiceNames = [
  "zira",
  "samantha",
  "susan",
  "victoria",
  "karen",
  "hazel",
  "female",
  "woman",
];

function persistPayload(payload: LiveInterviewPayload) {
  window.sessionStorage.setItem(sessionStorageKey, JSON.stringify(payload));
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getPreferredFemaleVoice() {
  const voices = window.speechSynthesis.getVoices();
  const englishVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));

  return (
    englishVoices.find((voice) =>
      preferredFemaleVoiceNames.some((name) => voice.name.toLowerCase().includes(name))
    ) ||
    voices.find((voice) => preferredFemaleVoiceNames.some((name) => voice.name.toLowerCase().includes(name))) ||
    englishVoices[0] ||
    voices[0]
  );
}

export default function InterviewLiveScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const webcamRef = useRef<Webcam | null>(null);
  const [payload, setPayload] = useState<LiveInterviewPayload | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [candidateVideoReady, setCandidateVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [evaluations, setEvaluations] = useState<InterviewEvaluation[]>([]);
  const [latestFeedback, setLatestFeedback] = useState<InterviewEvaluation | null>(null);
  const [interviewRecording, setInterviewRecording] = useState(false);
  const [interviewError, setInterviewError] = useState("");
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [hrSpeaking, setHrSpeaking] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const questions = payload?.questions || [];
  const currentQuestion = questions[currentQuestionIndex] || "";
  const averageScore = useMemo(() => {
    if (!evaluations.length) return "0.0";
    return (evaluations.reduce((sum, item) => sum + item.score, 0) / evaluations.length).toFixed(1);
  }, [evaluations]);

  function speakQuestion(question: string) {
    setHrSpeaking(true);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(question);
    const voice = getPreferredFemaleVoice();
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    }
    utterance.rate = 0.94;
    utterance.pitch = 1.12;
    utterance.onend = () => setHrSpeaking(false);
    utterance.onerror = () => setHrSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      const stored = window.sessionStorage.getItem(sessionStorageKey);
      let nextPayload: LiveInterviewPayload | null = null;

      if (stored) {
        try {
          const parsed = JSON.parse(stored) as LiveInterviewPayload;
          if (parsed?.sessionId && Array.isArray(parsed.questions)) {
            nextPayload = parsed;
          }
        } catch {
          nextPayload = null;
        }
      }

      const sessionIdFromUrl = searchParams.get("sessionId");
      const sessionId = sessionIdFromUrl || nextPayload?.sessionId;

      if (!sessionId) {
        if (!cancelled) {
          setPayload(nextPayload);
          setSessionLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/interview/session/${sessionId}`, { cache: "no-store" });
        const data = (await response.json()) as InterviewSessionResponse;

        if (!response.ok || !data.session) {
          throw new Error(data.error || "Unable to load interview session.");
        }

        const refreshedPayload = {
          sessionId: data.session.id,
          candidateName: data.session.candidateName,
          jobRole: data.session.jobRole,
          questions: data.session.questions || nextPayload?.questions || [],
        } satisfies LiveInterviewPayload;

        if (!cancelled) {
          setPayload(refreshedPayload);
          persistPayload(refreshedPayload);
        }
      } catch {
        if (!cancelled) {
          setPayload(nextPayload);
        }
      } finally {
        if (!cancelled) {
          setSessionLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  useEffect(() => {
    if (!payload || !currentQuestion) return;

    stopAnswerRecording();
    setCurrentAnswer("");
    setInterviewError("");
    setLatestFeedback(null);
    speakQuestion(currentQuestion);
  }, [currentQuestion, payload]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis.cancel();
    };
  }, []);

  function createRecognition() {
    const speechWindow = window as WindowWithSpeech;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      throw new Error("Speech recognition is not supported in this browser.");
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();
      setCurrentAnswer(transcript);
    };
    recognition.onerror = (event) => {
      setInterviewError(event.error || "Speech recognition error");
      setInterviewRecording(false);
    };
    recognition.onend = () => {
      setInterviewRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    return recognition;
  }

  function startAnswerRecording() {
    setInterviewError("");
    setCurrentAnswer("");
    setLatestFeedback(null);
    setInterviewRecording(true);
    setHrSpeaking(false);
    window.speechSynthesis.cancel();

    try {
      const recognition = createRecognition();
      recognition.start();
    } catch (error) {
      setInterviewRecording(false);
      setInterviewError(error instanceof Error ? error.message : "Speech recognition is unavailable.");
    }
  }

  function stopAnswerRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterviewRecording(false);
  }

  async function replayQuestion() {
    if (!currentQuestion) return;
    stopAnswerRecording();
    setCurrentAnswer("");
    speakQuestion(currentQuestion);
  }

  async function submitAnswer() {
    if (!payload?.sessionId || !currentQuestion || !currentAnswer.trim()) {
      setInterviewError("Please record or type an answer before submitting.");
      return;
    }

    stopAnswerRecording();
    setEvaluationLoading(true);
    setInterviewError("");

    try {
      const response = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: payload.sessionId,
          questionIndex: currentQuestionIndex,
          answer: currentAnswer.trim(),
        }),
      });
      const data = (await response.json()) as EvaluateInterviewResponse;

      if (!response.ok || !data.evaluation) {
        setInterviewError(data.error || "Evaluation failed.");
        return;
      }

      const nextAnswers = [...answers];
      nextAnswers[currentQuestionIndex] = currentAnswer.trim();
      setAnswers(nextAnswers);

      const nextEvaluations = [...evaluations];
      nextEvaluations[currentQuestionIndex] = data.evaluation;
      setEvaluations(nextEvaluations);
      setLatestFeedback(data.evaluation);

      if (data.session) {
        const nextPayload = {
          sessionId: data.session.id,
          candidateName: data.session.candidateName,
          jobRole: data.session.jobRole,
          questions: data.session.questions,
        } satisfies LiveInterviewPayload;

        setPayload(nextPayload);
        persistPayload(nextPayload);
      } else if (data.nextQuestion && questions[currentQuestionIndex + 1]) {
        const nextQuestions = [...questions];
        nextQuestions[currentQuestionIndex + 1] = data.nextQuestion;
        const nextPayload = { ...payload, questions: nextQuestions };
        setPayload(nextPayload);
        persistPayload(nextPayload);
      }

      if (currentQuestionIndex === questions.length - 1) {
        window.sessionStorage.removeItem(sessionStorageKey);
        router.push(`/dashboard/interview/report/${payload.sessionId}`);
        return;
      }

      setCurrentQuestionIndex((value) => value + 1);
      setCurrentAnswer("");
    } finally {
      setEvaluationLoading(false);
    }
  }

  if (sessionLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-xl border-white/10 bg-slate-950/85 text-white">
          <CardContent className="flex items-center justify-center gap-3 p-8 text-sm text-slate-300">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your live interview room...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="w-full max-w-xl border-white/10 bg-slate-950/85 text-white">
          <CardContent className="space-y-4 p-8 text-center">
            <p className="text-2xl font-semibold">Interview session not ready</p>
            <p className="text-sm text-slate-400">
              Start the interview from the setup flow so we can prepare the resume-based questions and live session data first.
            </p>
            <div className="flex justify-center">
              <Button onClick={() => router.push("/dashboard/interview")} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                Back to Interview Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-7rem)] overflow-hidden rounded-[1.4rem] border border-blue-950/40 bg-[#071b3d] text-white shadow-2xl">
      <div className="flex min-h-16 items-center justify-between bg-gradient-to-b from-[#12478d] to-[#0b3472] px-4 py-3 shadow-[0_8px_26px_rgba(0,0,0,0.22)] sm:min-h-20 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 text-sm text-blue-100">
          <span className="shrink-0 rounded-full border border-white/15 bg-white/10 px-3 py-1.5">AIConnect</span>
          <span className="truncate">{payload.candidateName}</span>
          <span className="hidden text-blue-200/70 sm:inline">|</span>
          <span className="hidden truncate sm:inline">{payload.jobRole}</span>
        </div>
        <div className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-2 text-xl font-semibold tracking-tight text-white sm:text-3xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-lg shadow-inner sm:h-11 sm:w-11 sm:text-2xl">
            AI
          </span>
          <span className="hidden sm:inline">AI Interview</span>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/dashboard/interview")}
          className="shrink-0 border-white/15 bg-white/10 text-white hover:bg-white/15"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="relative">
        <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 divide-y-4 divide-[#0b3472] bg-[#0b3472] lg:h-[calc(100vh-12rem)] lg:min-h-[520px] lg:grid-cols-2 lg:divide-x-4 lg:divide-y-0">
            <div className="relative min-h-[42vh] overflow-hidden bg-slate-950 lg:min-h-0">
              <Image
                src={recruiterAvatar}
                alt="AI HR interviewer"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-contain object-center"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,10,10,0),rgba(10,10,10,0.08),rgba(10,10,10,0.26))]" />

              <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2 sm:left-5 sm:top-5">
                <span className="rounded-md border border-white/10 bg-slate-950/55 px-3 py-2 text-xs font-semibold tracking-[0.18em] text-white/95 backdrop-blur-md sm:text-sm">
                  AI INTERVIEWER
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs backdrop-blur-md",
                    hrSpeaking
                      ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                      : "border-white/10 bg-black/45 text-slate-200"
                  )}
                >
                  <Radio className={cn("h-3.5 w-3.5", hrSpeaking ? "animate-pulse" : "")} />
                  {hrSpeaking ? "Speaking" : "Ready"}
                </span>
              </div>

              {/* Question overlay removed from video to avoid covering the interviewer screen. */}
            </div>

            <div className="relative min-h-[42vh] overflow-hidden bg-black lg:min-h-0">
              <div className="absolute right-3 top-3 z-10 flex items-center gap-2 sm:right-5 sm:top-5">
                <span className="rounded-md border border-white/10 bg-slate-950/55 px-3 py-2 text-xs font-semibold tracking-[0.18em] text-white/95 backdrop-blur-md sm:text-sm">
                  CANDIDATE
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300/20 bg-emerald-400/15 px-3 py-2 text-xs text-emerald-100 backdrop-blur-md">
                  <Video className="h-3.5 w-3.5" />
                  {candidateVideoReady ? "Live" : "Connecting"}
                </span>
              </div>

              <div className="relative h-full bg-black">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  mirrored
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                  }}
                  onUserMedia={() => {
                    setCameraReady(true);
                    setCandidateVideoReady(true);
                    setCameraError("");
                  }}
                  onUserMediaError={(error) => {
                    setCameraReady(false);
                    setCandidateVideoReady(false);
                    setCameraError(error instanceof Error ? error.message : "Unable to access webcam.");
                  }}
                  className={cn(
                    "h-full min-h-[42vh] w-full bg-black object-cover object-center transition-opacity lg:min-h-[520px]",
                    candidateVideoReady ? "opacity-100" : "opacity-0"
                  )}
                />
                {!candidateVideoReady ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 text-slate-300">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-semibold text-white">
                      {getInitials(payload.candidateName) || <User className="h-7 w-7" />}
                    </div>
                    <p className="text-sm">{cameraReady ? "Connecting preview..." : "Starting camera..."}</p>
                    {cameraError ? <p className="max-w-[260px] text-center text-xs text-rose-300">{cameraError}</p> : null}
                  </div>
                ) : null}
              </div>

              {/* Candidate answer overlay removed from video to keep camera view clear. */}
            </div>
        </div>

      </div>

      <div className="px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3">
          <div className="w-full max-w-xl rounded-lg border border-white/10 bg-black/46 p-2 shadow-[0_12px_42px_rgba(0,0,0,0.34)] backdrop-blur-xl">
            <div className="mb-2 flex items-start justify-between gap-3 px-1">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.24em] text-blue-100/75">Question</p>
                <p className="mt-1 text-sm leading-5 text-white/95 line-clamp-2">{currentQuestion || "No question loaded"}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end">
                <p className="text-[10px] uppercase tracking-[0.24em] text-blue-100/75">Answer Draft</p>
                <span className="text-xs text-slate-300">{currentQuestionIndex + 1}/{questions.length}</span>
              </div>
            </div>
            <Textarea
              value={currentAnswer}
              onChange={(event) => setCurrentAnswer(event.target.value)}
              placeholder="Speak or type your answer..."
              className="min-h-11 resize-none border-white/10 bg-slate-950/55 text-sm leading-5 text-white"
            />
            {interviewError ? <p className="mt-1 px-1 text-xs text-rose-300">{interviewError}</p> : null}
          </div>

          {showStats || latestFeedback ? (
            <div className="w-full max-w-xl rounded-lg border border-white/10 bg-black/58 p-3 text-sm shadow-[0_12px_42px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              {showStats ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/10 bg-white/8 p-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Answered</p>
                    <p className="mt-1 text-xl font-semibold text-white">{answers.filter(Boolean).length}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/8 p-3">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Avg Score</p>
                    <p className="mt-1 text-xl font-semibold text-white">{averageScore}/10</p>
                  </div>
                </div>
              ) : null}

              {latestFeedback ? (
                <div className={cn("rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-3", showStats ? "mt-3" : "")}>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-200">Latest Evaluation</p>
                  <p className="mt-1 text-sm leading-5 text-slate-100">
                    <span className="mr-2 text-lg font-semibold">{latestFeedback.score}/10</span>
                    {latestFeedback.feedback}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap items-end justify-center gap-3 rounded-full border border-white/10 bg-black/42 px-4 py-3 shadow-[0_12px_42px_rgba(0,0,0,0.34)] backdrop-blur-xl">
              {!interviewRecording ? (
                <Button
                  onClick={startAnswerRecording}
                  disabled={hrSpeaking}
                  className="flex h-14 min-w-16 flex-col gap-1 rounded-full bg-white text-slate-950 hover:bg-blue-50 sm:h-16 sm:min-w-20"
                >
                  <Mic className="h-4 w-4" />
                  <span className="text-xs">Record</span>
                </Button>
              ) : (
                <Button
                  onClick={stopAnswerRecording}
                  className="flex h-14 min-w-16 flex-col gap-1 rounded-full bg-rose-500 text-white hover:bg-rose-400 sm:h-16 sm:min-w-20"
                >
                  <MicOff className="h-4 w-4" />
                  <span className="text-xs">Stop</span>
                </Button>
              )}
                <Button
                  onClick={() => void replayQuestion()}
                  variant="outline"
                  className="flex h-14 min-w-16 flex-col gap-1 rounded-full border-white/15 bg-white text-slate-950 hover:bg-blue-50 sm:h-16 sm:min-w-20"
                >
                  <Phone className="h-4 w-4" />
                  <span className="text-xs">Replay</span>
                </Button>
                <Button
                  onClick={() => setShowStats((value) => !value)}
                  variant="outline"
                  className="flex h-14 min-w-16 flex-col gap-1 rounded-full border-white/15 bg-white text-slate-950 hover:bg-blue-50 sm:h-16 sm:min-w-20"
                >
                  <Radio className="h-4 w-4" />
                  <span className="text-xs">Stats</span>
                </Button>
                <Button
                  onClick={() => void submitAnswer()}
                  disabled={evaluationLoading}
                  className="flex h-14 min-w-16 flex-col gap-1 rounded-full bg-red-500 text-white hover:bg-red-400 sm:h-16 sm:min-w-20"
                >
                  {evaluationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  <span className="text-xs">{currentQuestionIndex === questions.length - 1 ? "Finish" : "Submit"}</span>
                </Button>
            </div>
          </div>
        </div>
      </div>
  );
}

