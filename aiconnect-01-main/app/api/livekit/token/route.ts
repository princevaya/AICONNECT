export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  try {
    console.log("Token route called");
    const { userId } = await auth();
    console.log("Auth result - userId:", userId);

    if (!userId) {
      console.error("No userId from Clerk");
      return NextResponse.json(
        { error: "Unauthorized - Clerk user not found" },
        { status: 401 }
      );
    }

    const room = req.nextUrl.searchParams.get("room");
    const username = req.nextUrl.searchParams.get("username");
    console.log("Request params - room:", room, "username:", username);

    if (!room || !username) {
      console.error("Missing parameters - room:", room, "username:", username);
      return NextResponse.json(
        { error: "Missing room or username" },
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

    const token = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: username,
      ttl: "4h",
    });

    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
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