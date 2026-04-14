import { NextResponse } from "next/server";

export function toError(error: unknown, fallback: string, status = 500) {
  const rawMessage = error instanceof Error ? error.message : "";
  const message = rawMessage && rawMessage.trim() ? rawMessage : fallback;
  const lower = message.toLowerCase();
  const directCode =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code || "")
      : "";
  const causeCode =
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    typeof (error as { cause?: unknown }).cause === "object" &&
    (error as { cause?: unknown }).cause !== null &&
    "code" in ((error as { cause?: { code?: unknown } }).cause as { code?: unknown })
      ? String(((error as { cause?: { code?: unknown } }).cause as { code?: unknown }).code || "")
      : "";
  const prismaCode = directCode || causeCode;

  const debugName =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name?: unknown }).name || "UnknownError")
      : "UnknownError";
  const causeMessage =
    typeof error === "object" &&
    error !== null &&
    "cause" in error &&
    (error as { cause?: unknown }).cause instanceof Error
      ? (error as { cause: Error }).cause.message
      : undefined;
  console.error("[external-chat] API error", {
    name: debugName,
    code: prismaCode || undefined,
    message: rawMessage || undefined,
    cause: causeMessage,
  });

  const isDbUnreachable =
    prismaCode === "P1001" ||
    lower.includes("can't reach database server") ||
    lower.includes("can not reach database server") ||
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("connection terminated");
  const isDbAuthIssue =
    prismaCode === "P1000" ||
    lower.includes("tenant or user not found") ||
    lower.includes("password authentication failed") ||
    lower.includes("authentication failed");
  const isSchemaNotReady =
    (lower.includes("table") && lower.includes("does not exist")) ||
    (lower.includes("relation") && lower.includes("does not exist"));

  if (isDbUnreachable) {
    return NextResponse.json(
      {
        error:
          "External chat database is unreachable. Set CHAT_DATABASE_URL to a reachable Postgres endpoint (prefer Supabase pooler host) and restart dev server.",
        setupRequired: true,
      },
      { status: 503 }
    );
  }

  if (isSchemaNotReady) {
    return NextResponse.json(
      {
        error:
          "External chat tables are missing. Run migration for external chat schema.",
        setupRequired: true,
      },
      { status: 503 }
    );
  }

  if (isDbAuthIssue) {
    return NextResponse.json(
      {
        error:
          "External chat database authentication failed. For Supabase pooler, use the exact connection string from Supabase Connect. The username is usually postgres.<project-ref> and the host/region must match your project pooler exactly.",
        setupRequired: true,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: status >= 500 ? fallback : message }, { status });
}

export async function parseJson<T>(req: Request): Promise<T | null> {
  return req.json().catch(() => null);
}
