import { AccessToken } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getRoomServiceClient } from "@/lib/livekit-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_MAX_PARTICIPANTS = 100;

const MAX_PARTICIPANTS = (() => {
  const raw = process.env.LIVEKIT_MAX_PARTICIPANTS;
  if (!raw) return DEFAULT_MAX_PARTICIPANTS;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_MAX_PARTICIPANTS;
  return parsed;
})();

function failCapacity(message: string, status = 503) {
  return NextResponse.json(
    { error: message, code: "ROOM_CAPACITY_CHECK_FAILED" },
    { status }
  );
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    const room = req.nextUrl.searchParams.get("room");
    const rawUsername = req.nextUrl.searchParams.get("username");
    const username = rawUsername?.trim() || "Guest";
    const session = req.nextUrl.searchParams.get("session");
    const join = req.nextUrl.searchParams.get("join");

    if (!room || !username || !session || !join) {
      return NextResponse.json(
        { error: "Missing room, username, session, or join" },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9-]{8,128}$/.test(session)) {
      return NextResponse.json({ error: "Invalid session format" }, { status: 400 });
    }
    if (!/^[a-zA-Z0-9-]{8,128}$/.test(join)) {
      return NextResponse.json({ error: "Invalid join format" }, { status: 400 });
    }

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: "LiveKit credentials missing" },
        { status: 500 }
      );
    }

    const identityPrefix = userId ? userId : "guest";
    const sessionIdentity = `${identityPrefix}:${session}:${join}`;

    // ---- HARD CAP ENFORCEMENT ----
    let roomService;
    try {
      roomService = getRoomServiceClient();
    } catch (e) {
      console.error("Could not init RoomServiceClient:", e);
      return failCapacity("Room capacity service unavailable.");
    }

    let rooms;
    try {
      rooms = await roomService.listRooms([room]);
    } catch (e) {
      console.error("listRooms failed:", e);
      return failCapacity("Unable to verify room capacity. Please try again.");
    }

    if (rooms.length === 0) {
      // First joiner: create the room WITH the hard cap.
      // LiveKit SFU will atomically reject participant #(MAX+1).
      try {
        await roomService.createRoom({
          name: room,
          maxParticipants: MAX_PARTICIPANTS,
          emptyTimeout: 300, // auto-delete 5 min after empty
        });
      } catch (e) {
        console.error("createRoom failed:", e);
        return failCapacity("Unable to create room with capacity limit.");
      }
    } else {
      // Room already exists. Pre-check count so we can return a clean
      // 403 before the SFU rejects the join (better UX).
      let participants;
      try {
        participants = await roomService.listParticipants(room);
      } catch (e) {
        console.error("listParticipants failed:", e);
        return failCapacity("Unable to verify room capacity. Please try again.");
      }

      const alreadyInRoom = participants.some(
        (p) => p.identity === sessionIdentity
      );

      if (!alreadyInRoom && participants.length >= MAX_PARTICIPANTS) {
        return NextResponse.json(
          {
            error: `Conference is full (max ${MAX_PARTICIPANTS} participants)`,
            code: "ROOM_FULL",
            maxParticipants: MAX_PARTICIPANTS,
          },
          { status: 403 }
        );
      }
    }
    // ---- END HARD CAP ENFORCEMENT ----

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
    return NextResponse.json({ token: jwtToken });
  } catch (error) {
    console.error("LiveKit token route crashed:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Internal server error: ${errorMessage}` },
      { status: 500 }
    );
  }
}