import type { InterviewSession } from "@/lib/interview-types";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrapText(text: string, lineLength = 92) {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > lineLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines;
}

export function buildInterviewReportPdf(session: InterviewSession) {
  const lines: string[] = [
    "AIConnect Interview Report",
    `Candidate: ${session.candidateName}`,
    `Email: ${session.candidateEmail}`,
    `Phone: ${session.candidatePhone}`,
    `Role: ${session.jobRole}`,
    `Overall score: ${session.overallScore ?? 0}/10`,
    `Completed at: ${new Date(session.updatedAt).toLocaleString()}`,
    "",
  ];

  session.questions.forEach((question, index) => {
    lines.push(`Question ${index + 1}`);
    lines.push(...wrapText(question));
    lines.push("Answer");
    lines.push(...wrapText(session.answers[index] || "No answer recorded."));
    lines.push(`Score: ${session.evaluations[index]?.score ?? 0}/10`);
    lines.push(...wrapText(`Feedback: ${session.evaluations[index]?.feedback || "No feedback available."}`));
    lines.push("");
  });

  const pageSize = 44;
  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += pageSize) {
    pages.push(lines.slice(index, index + pageSize));
  }

  const objects: string[] = [];
  objects.push("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");

  const pageRefs = pages.map((_, index) => `${3 + index * 2} 0 R`).join(" ");
  objects.push(`2 0 obj << /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >> endobj`);

  pages.forEach((pageLines, pageIndex) => {
    const pageObjectId = 3 + pageIndex * 2;
    const contentObjectId = pageObjectId + 1;
    const stream = [
      "BT",
      "/F1 11 Tf",
      "50 790 Td",
      "14 TL",
      ...pageLines.map((line, lineIndex) =>
        `${lineIndex === 0 ? "" : "T* " }(${escapePdfText(line || " ")}) Tj`.trim()
      ),
      "ET",
    ].join("\n");

    objects.push(
      `${pageObjectId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R >> >> /Contents ${contentObjectId} 0 R >> endobj`
    );
    objects.push(
      `${contentObjectId} 0 obj << /Length ${Buffer.byteLength(stream, "utf8")} >> stream\n${stream}\nendstream endobj`
    );
  });

  const fontObjectId = 3 + pages.length * 2;
  objects.push(`${fontObjectId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`);

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += `${object}\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}
