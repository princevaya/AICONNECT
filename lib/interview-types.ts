export type InterviewEvaluation = {
  score: number;
  feedback: string;
};

export type InterviewSession = {
  id: string;
  userId: string | null;
  clerkUserId: string | null;
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  jobRole: string;
  resumeFileUrl: string | null;
  resumeFileName: string | null;
  resumeStorageProvider: string | null;
  resumeText: string;
  questions: string[];
  answers: string[];
  evaluations: InterviewEvaluation[];
  overallScore: number | null;
  status: string;
  micReady: boolean;
  cameraReady: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CandidateDetailsInput = {
  name: string;
  email: string;
  phone: string;
  jobRole: string;
};
