import { NextResponse } from "next/server";

export function success(data: Record<string, unknown>, status = 200) {
  return NextResponse
