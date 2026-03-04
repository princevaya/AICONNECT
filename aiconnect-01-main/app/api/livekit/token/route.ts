import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    console.log("Token route called");
    const { userId } = await auth();
    console.log("Auth result - userId:", userId);

    const room = req.nextUrl.searchParams.get("room");
    const rawUsername = req.nextUrl.searchParams.get("username");
    const username = rawUsername?.trim() || "Guest";
    const session = req.nextUrl.searchParams.get("session");
    const join = req.nextUrl.searchParams.get("join");
    console.log("Request params - room:", room, "username:", username, "session:", session, "join:", join);

    if (!room || !username || !session || !join) {
      console.error("Missing parameters - room:", room, "username:", username, "session:", session, "join:", join);
      return NextResponse.json(
        { error: "Missing room, username, session, or join" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9-]{8,128}$/.test(session)) {
      return NextResponse.json(
        { error: "Invalid session format" },
        { status: 400 }
      );
    }
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(join)) {
      return NextResponse.json(
        { error: "Invalid join format" },
        { status: 400 }
      );
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      console.error("LiveKit credentials missing - API_KEY:", !!apiKey, "API_SECRET:", !!apiSecret);
      return NextResponse.json(
        { error: "LiveKit credentials missing" },
        { status: 500 }
      );
    }

    // Stable per-browser-tab identity avoids duplicate ghosts on reconnect
    // without force-kicking another active tab for the same user.
    const identityPrefix = userId ? userId : "guest";
    const sessionIdentity = `${identityPrefix}:${session}:${join}`;

    const token = new AccessToken(apiKey, apiSecret, {
      identity: sessionIdentity,
      name: username,
      ttl: "4h",
    });

    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canUpdateOwnMetadata: true,
    });

    const jwtToken = await token.toJwt();
    console.log("Token generated successfully, length:", jwtToken.length);

    return NextResponse.json({
      token: jwtToken,
    });
  } catch (error) {
    console.error("LiveKit token route crashed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error stack:", errorStack);

    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}
