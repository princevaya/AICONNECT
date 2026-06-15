import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { InterviewSession } from "@/lib/interview-types";

export default function InterviewReport({ session }: { session: InterviewSession }) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(79,209,197,0.18),_transparent_40%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(3,7,18,0.96))] p-8 text-white shadow-2xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">AIConnect Report</p>
            <h1 className="text-3xl font-semibold">{session.candidateName}</h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Resume-based AI interview completed for the {session.jobRole} role. Every question, spoken answer,
              score, and feedback summary is captured below.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild className="bg-cyan-400 text-slate-950 hover:bg-cyan-300">
              <a href={`/api/interview/report/${session.id}/pdf`}>Download PDF</a>
            </Button>
            <Button asChild variant="outline" className="border-white/15 bg-white/5 text-white hover:bg-white/10">
              <Link href="/dashboard/interview">Start New Interview</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Overall Score", value: `${session.overallScore ?? 0}/10` },
          { label: "Questions", value: `${session.questions.length}` },
          { label: "Resume Source", value: session.resumeStorageProvider || "Stored" },
          { label: "Status", value: session.status.replace(/_/g, " ") },
        ].map((item) => (
          <Card key={item.label} className="border-white/10 bg-slate-950/75 text-white">
            <CardHeader className="pb-0">
              <CardDescription className="text-slate-400">{item.label}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        {session.questions.map((question, index) => (
          <Card key={`${session.id}-${index}`} className="border-white/10 bg-slate-950/80 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Question {index + 1}</CardTitle>
              <CardDescription className="text-slate-400">{question}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/75">Candidate Answer</p>
                <p className="mt-3 text-sm leading-7 text-slate-200">
                  {session.answers[index] || "No answer recorded for this question."}
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-emerald-200">Score</p>
                  <p className="mt-2 text-3xl font-semibold">{session.evaluations[index]?.score ?? 0}/10</p>
                </div>
                <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/10 p-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-cyan-200">Feedback</p>
                  <p className="mt-3 text-sm leading-7 text-slate-200">
                    {session.evaluations[index]?.feedback || "No feedback available."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
