import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  saveResumeDetails,
  saveResumeFile,
} from "@/services/interview.service";
import { ensureLocalUser } from "@/services/user.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeResumeText(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextFromPdfBytes(buffer: Buffer) {
  const raw = buffer.toString("latin1");
  const matches = raw.match(/\((?:\\.|[^\\()])+\)/g) || [];
  const decoded = matches
    .map((chunk) =>
      chunk
        .slice(1, -1)
        .replace(/\\n/g, " ")
        .replace(/\\r/g, " ")
        .replace(/\\t/g, " ")
        .replace(/\\\(/g, "(")
        .replace(/\\\)/g, ")")
        .replace(/\\\\/g, "\\")
    )
    .join(" ");

  return normalizeResumeText(decoded);
}

async function extractPdfText(buffer: Buffer) {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdf = await pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
    }).promise;
    const chunks: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();

      if (text) {
        chunks.push(text);
      }
    }

    const parsed = normalizeResumeText(chunks.join("\n"));
    if (parsed) {
      return parsed;
    }
  } catch (error) {
    console.warn("[upload-resume] pdfjs parse failed, using byte fallback", error);
  }

  return normalizeResumeText(extractTextFromPdfBytes(buffer));
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const sessionId = String(formData.get("sessionId") || "");
    const file = formData.get("file");

    if (!sessionId || !(file instanceof File)) {
      return NextResponse.json({ error: "Session ID and PDF file are required." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Please upload a PDF resume." }, { status: 400 });
    }

    const user = await ensureLocalUser(clerkUserId);
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const resumeText = normalizeResumeText(await extractPdfText(buffer));

    if (!resumeText.trim()) {
      return NextResponse.json({ error: "Could not extract text from that PDF." }, { status: 400 });
    }

    const storedFile = await saveResumeFile({
      fileName: file.name,
      buffer,
      contentType: file.type,
    });

    const session = await saveResumeDetails({
      sessionId,
      userId: user.id,
      resumeText,
      resumeFileName: file.name,
      resumeFileUrl: storedFile.fileUrl,
      resumeStorageProvider: storedFile.provider,
    });

    return NextResponse.json({
      session,
      extractedText: resumeText,
      fileUrl: storedFile.fileUrl,
    });
  } catch (error) {
    console.error("[upload-resume] failed", error);
    const message = error instanceof Error ? error.message : "Failed to upload resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
