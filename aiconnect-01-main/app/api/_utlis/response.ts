import { NextResponse } from "next/server";

export function success(data: Record<string, unknown>, status = 200 as const) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function failure(error: string, status = 400 as const) {
  return NextResponse.json({ success: false, error }, { status });
}