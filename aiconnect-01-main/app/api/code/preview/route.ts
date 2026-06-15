import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { html, css, javascript } = await req.json();

    // Combine HTML, CSS, and JavaScript into a single document
    const completeHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Web Preview</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        ${css || ""}
    </style>
</head>
<body>
    ${html || ""}
    <script>
        ${javascript || ""}
    </script>
</body>
</html>`;

    // Return the HTML to be displayed in an iframe
    return NextResponse.json({
      success: true,
      html: completeHTML,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Preview failed",
      },
      { status: 500 }
    );
  }
}
