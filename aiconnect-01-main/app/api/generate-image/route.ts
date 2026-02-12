import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt missing" },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
          "Content-Type": "application/json",
          Accept: "image/png",
        },
        body: JSON.stringify({
          inputs: `3D render, ultra realistic, cinematic lighting, ${prompt}`,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text);
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": "image/png",
      },
    });

  } catch (error: any) {
    console.error("HUGGING FACE IMAGE ERROR:", error.message);

    return NextResponse.json(
      {
        error: "Hugging Face image generation failed",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
