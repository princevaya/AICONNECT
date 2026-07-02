import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { buildInterviewReportPdf } from "@/lib/interview-report";
import { getInterviewSessionById } from "@/services/interview.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_: Request, context: Context) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await ensureLocalUser(clerkUserId);
    const { sessionId } = await context.params;
    const session = await getInterviewSessionById(sessionId, user.id);

    if (!session) {
      return NextResponse.json({ error: "Interview session not found." }, { status: 404 });
    }

    const pdf = buildInterviewReportPdf(session);

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="aiconnect-interview-report-${session.id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[interview/report/pdf] failed", error);
    const message = error instanceof Error ? error.message : "Failed to create PDF report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
