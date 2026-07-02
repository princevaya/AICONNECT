"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Mic,
  MicOff,
  Phone,
  Radio,
  Sparkles,
  Upload,
  Video,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { InterviewEvaluation } from "@/lib/interview-types";

type FormState = {
  name: string;
  email: string;
  phone: string;
  jobRole: string;
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
  abort?: () => void;
};

type SpeechRecognitionEventLike = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

const steps = [
  "Candidate Details",
  "Resume Upload",
  "Question Generation",
  "Microphone Test",
  "Camera Test",
  "Live Interview",
];

const recruiterAvatar = "/ai/ai-interviewer.webp";
const liveInterviewStorageKey = "aiconnect-live-interview";

const initialFormState: FormState = {
  name: "",
  email: "",
  phone: "",
  jobRole: "",
};

function statusChip(success: boolean, successLabel: string, failureLabel: string) {
  return success ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {successLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-xs text-rose-200">
      <XCircle className="h-3.5 w-3.5" />
      {failureLabel}
    </span>
  );
}

export default function InterviewWorkflow() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [formError, setFormError] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState("");
  const [questions, setQuestions] = useState<string[]>([]);
  const [questionLoading, setQuestionLoading] = useState(false);
  const [questionError, setQuestionError] = useState("");
  const [microphoneTranscript, setMicrophoneTranscript] = useState("");
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [microphoneListening, setMicrophoneListening] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [evaluations, setEvaluations] = useState<InterviewEvaluation[]>([]);
  const [interviewRecording, setInterviewRecording] = useState(false);
  const [interviewError, setInterviewError] = useState("");
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [latestFeedback, setLatestFeedback] = useState<InterviewEvaluation | null>(null);
  const [hrSpeaking, setHrSpeaking] = useState(false);

  const progress = useMemo(() => (currentStep / steps.length) * 100, [currentStep]);

  useEffect(() => {
    if (videoRef.current && cameraStream) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  useEffect(() => {
    if (currentStep === 6 && questions[currentQuestionIndex]) {
      stopAnswerRecording();
      setCurrentAnswer("");
      setInterviewError("");
      setHrSpeaking(true);
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(questions[currentQuestionIndex]);
      utterance.rate = 0.96;
      utterance.pitch = 1;
      utterance.onend = () => setHrSpeaking(false);
      utterance.onerror = () => setHrSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, [currentQuestionIndex, currentStep, questions]);

  useEffect(() => {
    if (currentStep === 6 && !cameraStream) {
      void startCamera();
    }
  }, [cameraStream, currentStep]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, [cameraStream]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function createRecognition({
    onTranscript,
    onEnd,
  }: {
    onTranscript: (value: string) => void;
    onEnd?: () => void;
  }) {
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
      onTranscript(transcript);
    };
    recognition.onend = () => {
      onEnd?.();
    };
    recognition.onerror = (event) => {
      if (event.error === "aborted") {
        setInterviewError("Mic test was interrupted. Please click Start Mic Test again and say Hello Hello.");
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setInterviewError("Microphone permission is blocked. Allow microphone access in the browser and try again.");
      } else if (event.error === "no-speech") {
        setInterviewError("No speech detected. Please say Hello Hello clearly and try again.");
      } else {
        setInterviewError(event.error || "Speech recognition error");
      }
      setMicrophoneListening(false);
      setInterviewRecording(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  }

  async function submitCandidateDetails() {
    setFormError("");

    if (
      form.name.trim().length < 2 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) ||
      form.phone.trim().length < 8 ||
      form.jobRole.trim().length < 2
    ) {
      setFormError("Please complete all candidate details with valid information.");
      return;
    }

    const response = await fetch("/api/interview/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await response.json();
    if (!response.ok) {
      setFormError(data.error || "Unable to create interview session.");
      return;
    }

    setSessionId(data.session.id);
    setCurrentStep(2);
  }

  async function uploadResume(file: File) {
    if (!sessionId) return;

    setResumeUploading(true);
    setResumeError("");
    const formData = new FormData();
    formData.append("sessionId", sessionId);
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-resume", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setResumeError(data.error || "Failed to upload resume.");
        return;
      }

      setResumeText(data.extractedText || "");
      setResumeFileName(file.name);
      setCurrentStep(3);
    } finally {
      setResumeUploading(false);
    }
  }

  async function generateQuestions() {
    if (!sessionId) return;
    setQuestionLoading(true);
    setQuestionError("");

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();

      if (!response.ok) {
        setQuestionError(data.error || "Failed to generate questions.");
        return;
      }

      setQuestions(data.questions || []);
      setCurrentStep(4);
    } finally {
      setQuestionLoading(false);
    }
  }

  function startMicrophoneTest() {
    setInterviewError("");
    setMicrophoneTranscript("");
    setMicrophoneReady(false);
    setMicrophoneListening(true);
    window.speechSynthesis.cancel();
    recognitionRef.current?.abort?.();
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    try {
      const recognition = createRecognition({
        onTranscript: (transcript) => {
          setMicrophoneTranscript(transcript);
          if (transcript.toLowerCase().includes("hello")) {
            setMicrophoneReady(true);
          }
        },
        onEnd: () => setMicrophoneListening(false),
      });
      recognition.start();
    } catch (error) {
      setMicrophoneListening(false);
      setInterviewError(error instanceof Error ? error.message : "Speech recognition is unavailable.");
    }
  }

  async function continueAfterMicrophone() {
    if (!sessionId) return;
    await fetch(`/api/interview/session/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ micReady: microphoneReady, status: "mic_verified" }),
    });
    setCurrentStep(5);
  }

  async function startCamera() {
    setCameraError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      setCameraStream(stream);
      setCameraReady(stream.getVideoTracks().length > 0);
    } catch (error) {
      setCameraReady(false);
      setCameraError(error instanceof Error ? error.message : "Unable to access webcam.");
    }
  }

  async function continueAfterCamera() {
    if (!sessionId) return;
    await fetch(`/api/interview/session/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cameraReady, status: "camera_verified" }),
    });
    window.sessionStorage.setItem(
      liveInterviewStorageKey,
      JSON.stringify({
        sessionId,
        candidateName: form.name,
        jobRole: form.jobRole,
        questions,
      })
    );
    router.push(`/dashboard/interview/live?sessionId=${sessionId}`);
  }

  function startAnswerRecording() {
    setInterviewError("");
    setLatestFeedback(null);
    setCurrentAnswer("");
    window.speechSynthesis.cancel();
    recognitionRef.current?.abort?.();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setHrSpeaking(false);
    setInterviewRecording(true);

    try {
      const recognition = createRecognition({
        onTranscript: (transcript) => setCurrentAnswer(transcript),
        onEnd: () => setInterviewRecording(false),
      });
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

  async function submitAnswer() {
    if (!sessionId || !questions[currentQuestionIndex] || !currentAnswer.trim()) {
      setInterviewError("Please record or type an answer before submitting.");
      return;
    }

    setEvaluationLoading(true);
    setInterviewError("");
    stopAnswerRecording();

    try {
      const response = await fetch("/api/interview/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          questionIndex: currentQuestionIndex,
          answer: currentAnswer.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
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

      if (currentQuestionIndex === questions.length - 1) {
        router.push(`/dashboard/interview/report/${sessionId}`);
        return;
      }

      setCurrentQuestionIndex((value) => value + 1);
      setCurrentAnswer("");
    } finally {
      setEvaluationLoading(false);
    }
  }

  return (
    <div className="space-y-6 text-white">
      <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_45%),linear-gradient(135deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] p-8 shadow-2xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">AIConnect Interview Studio</p>
            <h1 className="text-3xl font-semibold md:text-4xl">Resume-aware AI HR interviews with voice, video, and scoring</h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300">
              Move through a guided interview setup, let Gemini generate role-specific HR questions from the candidate&apos;s resume,
              and finish with a downloadable performance report.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-300/15 bg-white/5 px-5 py-4 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Current Step</p>
            <p className="mt-2 text-xl font-semibold">{steps[currentStep - 1]}</p>
          </div>
        </div>

        <div className="mt-8">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-300 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {steps.map((step, index) => {
              const done = index + 1 < currentStep;
              const active = index + 1 === currentStep;
              return (
                <div
                  key={step}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-sm transition-all",
                    active
                      ? "border-cyan-300/30 bg-cyan-300/10 text-white"
                      : done
                        ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100"
                        : "border-white/10 bg-white/5 text-slate-400"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    <span className="font-medium">{step}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {currentStep === 1 && (
        <Card className="border-white/10 bg-slate-950/80 text-white">
          <CardHeader>
            <CardTitle>Step 1: Candidate Details</CardTitle>
            <CardDescription className="text-slate-400">
              Capture the candidate profile and create the interview session in the database.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input
              placeholder="Candidate name"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              className="border-white/10 bg-white/5 text-white"
            />
            <Input
              placeholder="Email address"
              value={form.email}
              onChange={(event) => updateForm("email", event.target.value)}
              className="border-white/10 bg-white/5 text-white"
            />
            <Input
              placeholder="Phone number"
              value={form.phone}
              onChange={(event) => updateForm("phone", event.target.value)}
              className="border-white/10 bg-white/5 text-white"
            />
            <Input
              placeholder="Job role"
              value={form.jobRole}
              onChange={(event) => updateForm("jobRole", event.target.value)}
              className="border-white/10 bg-white/5 text-white"
            />
            {formError ? <p className="md:col-span-2 text-sm text-rose-300">{formError}</p> : null}
            <div className="md:col-span-2 flex justify-end">
              <Button onClick={submitCandidateDetails} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                Save Candidate Details
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 2 && (
        <Card className="border-white/10 bg-slate-950/80 text-white">
          <CardHeader>
            <CardTitle>Step 2: Upload Resume</CardTitle>
            <CardDescription className="text-slate-400">
              Upload a PDF resume. The server will parse the document and store the extracted text.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-cyan-300/30 bg-cyan-300/5 p-10 text-center transition hover:bg-cyan-300/10">
              <Upload className="mb-3 h-8 w-8 text-cyan-200" />
              <span className="text-lg font-medium">Choose a PDF resume</span>
              <span className="mt-2 text-sm text-slate-400">Only PDF files are accepted for parsing.</span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadResume(file);
                  }
                }}
              />
            </label>
            {resumeUploading ? (
              <div className="flex items-center gap-2 text-sm text-cyan-200">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading and parsing resume...
              </div>
            ) : null}
            {resumeFileName ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                {resumeFileName} uploaded successfully.
              </div>
            ) : null}
            {resumeText ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Extracted Resume Preview</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">{resumeText.slice(0, 700)}...</p>
              </div>
            ) : null}
            {resumeError ? <p className="text-sm text-rose-300">{resumeError}</p> : null}
          </CardContent>
        </Card>
      )}

      {currentStep === 3 && (
        <Card className="border-white/10 bg-slate-950/80 text-white">
          <CardHeader>
            <CardTitle>Step 3: AI Resume Analysis + Question Generation</CardTitle>
            <CardDescription className="text-slate-400">
              Gemini will prepare a resume-based interview plan, then keep adapting the next question from the candidate&apos;s previous answer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl border border-cyan-400/15 bg-cyan-400/10 p-6">
              <div className="flex items-start gap-4">
                <Sparkles className="mt-1 h-5 w-5 text-cyan-200" />
                <div>
                  <p className="font-medium">Candidate profile ready for analysis</p>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Job role: <span className="text-white">{form.jobRole}</span>. Resume extracted and ready for AI-driven question generation.
                  </p>
                </div>
              </div>
            </div>
            {questions.length > 0 ? (
              <div className="grid gap-3">
                {questions.map((question, index) => (
                  <div key={question} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                    <span className="mr-2 text-cyan-200">Q{index + 1}.</span>
                    {question}
                  </div>
                ))}
              </div>
            ) : null}
            {questionError ? <p className="text-sm text-rose-300">{questionError}</p> : null}
            <div className="flex justify-end">
              <Button
                onClick={generateQuestions}
                disabled={questionLoading}
                className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              >
                {questionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Generate Questions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 4 && (
        <Card className="border-white/10 bg-slate-950/80 text-white">
          <CardHeader>
            <CardTitle>Step 4: Microphone Test</CardTitle>
            <CardDescription className="text-slate-400">
              Ask the candidate to say “Hello Hello” to verify speech input.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={startMicrophoneTest} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                <Mic className="h-4 w-4" />
                Start Mic Test
              </Button>
              {microphoneListening ? statusChip(false, "", "Listening...") : null}
              {statusChip(microphoneReady, "Voice detected", "Awaiting voice sample")}
            </div>
            <Textarea
              value={microphoneTranscript}
              onChange={(event) => setMicrophoneTranscript(event.target.value)}
              placeholder="Detected speech will appear here..."
              className="min-h-28 border-white/10 bg-white/5 text-white"
            />
            {interviewError ? <p className="text-sm text-rose-300">{interviewError}</p> : null}
            <div className="flex justify-end">
              <Button
                onClick={() => void continueAfterMicrophone()}
                disabled={!microphoneReady}
                className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              >
                Continue to Camera Test
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 5 && (
        <Card className="border-white/10 bg-slate-950/80 text-white">
          <CardHeader>
            <CardTitle>Step 5: Camera Test</CardTitle>
            <CardDescription className="text-slate-400">
              Verify webcam access and preview the candidate video before the interview begins.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
                <video ref={videoRef} autoPlay muted playsInline className="aspect-video h-full w-full object-cover" />
                {!cameraReady ? (
                  <div className="flex aspect-video items-center justify-center bg-slate-900/90 text-sm text-slate-400">
                    Camera is starting...
                  </div>
                ) : null}
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3">
                  <Video className="h-5 w-5 text-cyan-200" />
                  <p className="font-medium">Webcam readiness</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  Start the webcam preview. A live stream counts as a successful camera check.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button onClick={() => void startCamera()} className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                    Start Camera
                  </Button>
                  {statusChip(cameraReady, "Camera working", "Camera not ready")}
                </div>
                {cameraError ? <p className="mt-4 text-sm text-rose-300">{cameraError}</p> : null}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => void continueAfterCamera()}
                disabled={!cameraReady}
                className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              >
                Start Interview
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {currentStep === 6 && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
          <Card className="border-white/10 bg-slate-950/85 text-white">
            <CardHeader>
              <CardTitle>Candidate Live Camera</CardTitle>
              <CardDescription className="text-slate-400">
                Live video feed stays visible throughout the interview.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900">
                <video ref={videoRef} autoPlay muted playsInline className="aspect-video h-full w-full object-cover" />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Candidate</p>
                  <p className="mt-2 font-medium">{form.name}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Role</p>
                  <p className="mt-2 font-medium">{form.jobRole}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Question</p>
                  <p className="mt-2 font-medium">
                    {currentQuestionIndex + 1}/{questions.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-slate-950/85 text-white">
            <CardHeader>
              <CardTitle>AI HR Recruiter</CardTitle>
              <CardDescription className="text-slate-400">
                Recruiter avatar asks one personalized interview question at a time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-3xl border border-cyan-300/15 bg-cyan-300/10 p-4">
                <div className="flex items-center gap-4">
                  <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-white/15">
                    <Image
                      src={recruiterAvatar}
                      alt="AI HR recruiter avatar"
                      fill
                      sizes="96px"
                      className="object-cover"
                      priority
                    />
                    <div
                      className={cn(
                        "absolute inset-0 rounded-3xl transition-all",
                        hrSpeaking ? "animate-pulse bg-cyan-300/15" : "bg-transparent"
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">AI HR Recruiter</p>
                      <span
                        className={cn(
                          "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs",
                          hrSpeaking
                            ? "border-cyan-300/30 bg-cyan-300/15 text-cyan-100"
                            : "border-white/10 bg-white/5 text-slate-300"
                        )}
                      >
                        <Radio className={cn("h-3.5 w-3.5", hrSpeaking ? "animate-pulse" : "")} />
                        {hrSpeaking ? "HR is speaking..." : "Waiting for your answer"}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-200">{questions[currentQuestionIndex]}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  {!interviewRecording ? (
                    <Button
                      onClick={startAnswerRecording}
                      disabled={hrSpeaking}
                      className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                    >
                      <Mic className="h-4 w-4" />
                      Start Answer Recording
                    </Button>
                  ) : (
                    <Button
                      onClick={stopAnswerRecording}
                      variant="outline"
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    >
                      <MicOff className="h-4 w-4" />
                      Stop Recording
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      stopAnswerRecording();
                      setCurrentAnswer("");
                      setHrSpeaking(true);
                      window.speechSynthesis.cancel();
                      const utterance = new SpeechSynthesisUtterance(questions[currentQuestionIndex]);
                      utterance.onend = () => setHrSpeaking(false);
                      utterance.onerror = () => setHrSpeaking(false);
                      window.speechSynthesis.speak(utterance);
                    }}
                    variant="outline"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    <Phone className="h-4 w-4" />
                    Replay Question
                  </Button>
                </div>
                <Textarea
                  value={currentAnswer}
                  onChange={(event) => setCurrentAnswer(event.target.value)}
                  placeholder="The candidate's spoken answer appears here and can also be edited manually..."
                  className="mt-4 min-h-40 border-white/10 bg-slate-950/70 text-white"
                />
                <p className="mt-3 text-xs text-slate-400">
                  Each new question now starts with a fresh answer box. Record only after the HR speaking indicator stops.
                </p>
                {interviewError ? <p className="mt-3 text-sm text-rose-300">{interviewError}</p> : null}
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => void submitAnswer()}
                    disabled={evaluationLoading}
                    className="bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  >
                    {evaluationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {currentQuestionIndex === questions.length - 1 ? "Finish Interview" : "Submit Answer"}
                  </Button>
                </div>
              </div>

              {latestFeedback ? (
                <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Latest Evaluation</p>
                  <p className="mt-3 text-3xl font-semibold">{latestFeedback.score}/10</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">{latestFeedback.feedback}</p>
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Answered</p>
                  <p className="mt-2 text-2xl font-semibold">{answers.filter(Boolean).length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Average Score</p>
                  <p className="mt-2 text-2xl font-semibold">
                    {evaluations.length
                      ? (evaluations.reduce((sum, item) => sum + item.score, 0) / evaluations.length).toFixed(1)
                      : "0.0"}
                    /10
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
