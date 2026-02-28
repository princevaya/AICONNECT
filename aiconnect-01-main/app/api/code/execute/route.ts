import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {

    const { code, language_id } = await req.json();

    const response = await fetch(
      "https://ce.judge0.com/submissions?wait=true",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source_code: code,
          language_id,
          stdin: "",
        }),
      }
    );

    const result = await response.json();

    return NextResponse.json({
      output:
        result.stdout ||
        result.stderr ||
        result.compile_output ||
        "No output",
    });

  } catch (error) {

    return NextResponse.json({
      output: "Execution failed",
    });

  }
}