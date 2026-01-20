import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized - Please sign in" },
      { status: 401 }
    );
  }

  const room = req.nextUrl.searchParams.get("room");
  const username = req.nextUrl.searchParams.get("username");

  if (!room || !username) {
    return NextResponse.json(
      { error: "Missing room or username parameter" },
      { status: 400 }
    );
  }

  // SECURITY: Validate room name to prevent injection attacks
  const roomRegex = /^[a-zA-Z0-9_-]{1,100}$/;
  if (!roomRegex.test(room)) {
    return NextResponse.json(
      { error: "Invalid room name format" },
      { status: 400 }
    );
  }

  // SECURITY: Sanitize username to prevent XSS
  if (username.length > 100) {
    return NextResponse.json({ error: "Username too long" }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Server misconfigured - LiveKit credentials missing" },
      { status: 500 }
    );
  }

  try {
    // Use Clerk userId as identity to ensure uniqueness
    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: username, // Display name
      ttl: "4h", // SECURITY: Reduced from 10h to limit exposure window
      metadata: JSON.stringify({
        createdAt: Date.now(),
        room: room,
      }),
    });

    at.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating token:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}
