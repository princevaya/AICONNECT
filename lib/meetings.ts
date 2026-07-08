import { randomUUID } from "crypto";
import pool from "./db";

export type MeetingStatus = "Scheduled" | "WaitingForHost" | "Live" | "Completed" | "Cancelled";

export interface MeetingRecord {
  id: string;
  code: string;
  title: string;
  scheduledFor: Date;
  endTime?: Date | null;
  attendees: string[];
  notes?: string | null;
  status: string;
  isActive: boolean;
  createdBy?: string | null;
  timezone: string;
  duration: string;
  hostJoinedAt?: Date | null;
  hostLeftAt?: Date | null;
  endedAt?: Date | null;
  allowJoinBeforeHost: boolean;
  waitingRoom: boolean;
  muteOnJoin: boolean;
  enableChat: boolean;
  allowScreenSharing: boolean;
  meetingPassword?: string | null;
  meetingStartedBy?: string | null;
  meetingEndedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

let tableReady: Promise<void> | null = null;

type MeetingRow = {
  id: string;
  meeting_code: string;
  title: string;
  scheduled_for: string | Date;
  end_time?: string | Date | null;
  attendees: unknown;
  notes?: string | null;
  status?: string | null;
  is_active: boolean;
  created_by?: string | null;
  timezone?: string | null;
  duration?: string | null;
  host_joined_at?: string | Date | null;
  host_left_at?: string | Date | null;
  ended_at?: string | Date | null;
  allow_join_before_host?: boolean | null;
  waiting_room?: boolean | null;
  mute_on_join?: boolean | null;
  enable_chat?: boolean | null;
  allow_screen_sharing?: boolean | null;
  meeting_password?: string | null;
  meeting_started_by?: string | null;
  meeting_ended_by?: string | null;
  created_at: string | Date;
  updated_at: string | Date;
};

/* ---------- table ---------- */
async function ensureTable() {
  if (!tableReady) {
    tableReady = pool
      .query(`
        CREATE TABLE IF NOT EXISTS meeting_rooms (
          id UUID PRIMARY KEY,
          meeting_code TEXT UNIQUE NOT NULL,
          title TEXT NOT NULL,
          scheduled_for TIMESTAMPTZ NOT NULL,
          attendees JSONB NOT NULL DEFAULT '[]'::jsonb,
          notes TEXT,
          status TEXT NOT NULL DEFAULT 'Scheduled',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS created_by TEXT;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC';
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '30 Minutes';
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS host_joined_at TIMESTAMPTZ;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS host_left_at TIMESTAMPTZ;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS allow_join_before_host BOOLEAN DEFAULT FALSE;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS waiting_room BOOLEAN DEFAULT FALSE;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS mute_on_join BOOLEAN DEFAULT FALSE;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS enable_chat BOOLEAN DEFAULT TRUE;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS allow_screen_sharing BOOLEAN DEFAULT TRUE;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS meeting_password TEXT;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS meeting_started_by TEXT;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS meeting_ended_by TEXT;
        ALTER TABLE meeting_rooms ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_meeting_rooms_schedule
        ON meeting_rooms (scheduled_for);
      `)
      .then(() => undefined)
      .catch((err) => {
        tableReady = null;
        throw err;
      });
  }
  return tableReady;
}

/* ---------- helpers ---------- */
function parseAttendees(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeStatus(status: unknown): string {
  if (typeof status !== "string") return "Scheduled";
  const s = status.trim();
  const lower = s.toLowerCase();
  if (lower === "scheduled") return "Scheduled";
  if (lower === "waitingforhost" || lower === "waiting_for_host") return "WaitingForHost";
  if (lower === "live") return "Live";
  if (lower === "completed" || lower === "closed") return "Completed";
  if (lower === "cancelled") return "Cancelled";
  return "Scheduled";
}

function mapRow(row: MeetingRow): MeetingRecord {
  return {
    id: row.id,
    code: row.meeting_code,
    title: row.title,
    scheduledFor: new Date(row.scheduled_for),
    endTime: row.end_time ? new Date(row.end_time) : null,
    attendees: parseAttendees(row.attendees),
    notes: row.notes ?? null,
    status: normalizeStatus(row.status),
    isActive: row.is_active,
    createdBy: row.created_by ?? null,
    timezone: row.timezone ?? "UTC",
    duration: row.duration ?? "30 Minutes",
    hostJoinedAt: row.host_joined_at ? new Date(row.host_joined_at) : null,
    hostLeftAt: row.host_left_at ? new Date(row.host_left_at) : null,
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    allowJoinBeforeHost: Boolean(row.allow_join_before_host),
    waitingRoom: Boolean(row.waiting_room),
    muteOnJoin: Boolean(row.mute_on_join),
    enableChat: row.enable_chat !== false, // default true
    allowScreenSharing: row.allow_screen_sharing !== false, // default true
    meetingPassword: row.meeting_password ?? null,
    meetingStartedBy: row.meeting_started_by ?? null,
    meetingEndedBy: row.meeting_ended_by ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/* ---------- queries ---------- */
export async function listMeetings(userId?: string, userEmail?: string | null): Promise<MeetingRecord[]> {
  await ensureTable();
  if (userId) {
    if (userEmail) {
      const result = await pool.query(
        `SELECT * FROM meeting_rooms 
         WHERE is_active = true 
           AND (created_by = $1 OR attendees @> $2::jsonb) 
         ORDER BY scheduled_for ASC`,
        [userId, JSON.stringify([userEmail])]
      );
      return result.rows.map(mapRow);
    } else {
      const result = await pool.query(
        "SELECT * FROM meeting_rooms WHERE is_active = true AND created_by = $1 ORDER BY scheduled_for ASC",
        [userId]
      );
      return result.rows.map(mapRow);
    }
  }
  const result = await pool.query(
    "SELECT * FROM meeting_rooms WHERE is_active = true ORDER BY scheduled_for ASC"
  );
  return result.rows.map(mapRow);
}

export async function findByCode(
  code: string
): Promise<MeetingRecord | null> {
  await ensureTable();

  const res = await pool.query(
    `SELECT * FROM meeting_rooms
    WHERE meeting_code = $1 OR id::text = $1
    LIMIT 1`,
    [code]
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function findActiveByCode(
  code: string
): Promise<MeetingRecord | null> {
  await ensureTable();

  const res = await pool.query(
    `SELECT * FROM meeting_rooms
    WHERE (meeting_code = $1 OR id::text = $1)
      AND is_active = true
    LIMIT 1`,
    [code]
  );

  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export interface CreateMeetingPayload {
  title: string;
  scheduledFor: Date;
  endTime?: Date | null;
  attendees: string[];
  notes?: string | null;
  createdBy?: string | null;
  timezone?: string;
  duration?: string;
  allowJoinBeforeHost?: boolean;
  waitingRoom?: boolean;
  muteOnJoin?: boolean;
  enableChat?: boolean;
  allowScreenSharing?: boolean;
  meetingPassword?: string | null;
  status?: string;
}

function generateMeetingCode(): string {
  return Math.random()
    .toString(36)
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);
}

export async function createMeeting(
  payload: CreateMeetingPayload
): Promise<MeetingRecord> {
  await ensureTable();

  let code = "";
  let attempts = 0;

  while (attempts < 5) {
    code = generateMeetingCode();
    const existing = await findByCode(code);
    if (!existing) break;
    attempts++;
  }

  if (!code) {
    throw new Error("Failed to generate unique meeting code");
  }

  const status = payload.status || "Scheduled";
  const timezone = payload.timezone || "UTC";
  const duration = payload.duration || "30 Minutes";
  const allowJoinBeforeHost = payload.allowJoinBeforeHost ?? false;
  const waitingRoom = payload.waitingRoom ?? false;
  const muteOnJoin = payload.muteOnJoin ?? false;
  const enableChat = payload.enableChat ?? true;
  const allowScreenSharing = payload.allowScreenSharing ?? true;
  const meetingPassword = payload.meetingPassword ?? null;
  
  // Calculate end_time if not provided
  let endTime = payload.endTime;
  if (!endTime) {
    let mins = 30;
    const durLower = duration.toLowerCase();
    if (durLower.includes("15 minute")) mins = 15;
    else if (durLower.includes("30 minute")) mins = 30;
    else if (durLower.includes("45 minute")) mins = 45;
    else if (durLower.includes("1 hour 30")) mins = 90;
    else if (durLower.includes("2 hour")) mins = 120;
    else if (durLower.includes("3 hour")) mins = 180;
    else if (durLower.includes("1 hour")) mins = 60;
    else {
      const match = duration.match(/\d+/);
      if (match) {
        const val = parseInt(match[0]);
        if (durLower.includes("hour")) {
          mins = val * 60;
        } else {
          mins = val;
        }
      }
    }
    endTime = new Date(payload.scheduledFor.getTime() + mins * 60 * 1000);
  }

  const result = await pool.query(
    `INSERT INTO meeting_rooms (
      id, meeting_code, title, scheduled_for, end_time,
      attendees, notes, status, is_active,
      created_by, timezone, duration, allow_join_before_host,
      waiting_room, mute_on_join, enable_chat, allow_screen_sharing,
      meeting_password, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,true,$9,$10,$11,$12,$13,$14,$15,$16,$17,NOW(),NOW())
    RETURNING *`,
    [
      randomUUID(),
      code,
      payload.title,
      payload.scheduledFor,
      endTime,
      JSON.stringify(payload.attendees),
      payload.notes ?? null,
      status,
      payload.createdBy ?? null,
      timezone,
      duration,
      allowJoinBeforeHost,
      waitingRoom,
      muteOnJoin,
      enableChat,
      allowScreenSharing,
      meetingPassword,
    ]
  );

  return mapRow(result.rows[0]);
}

export async function updateMeeting(
  code: string,
  payload: Partial<CreateMeetingPayload>
): Promise<MeetingRecord | null> {
  await ensureTable();

  const existing = await findByCode(code);
  if (!existing) return null;

  const sets: string[] = [];
  const vals: any[] = [];
  let paramIdx = 1;

  const addField = (col: string, val: any) => {
    if (val !== undefined) {
      sets.push(`${col} = $${paramIdx++}`);
      vals.push(val);
    }
  };

  addField("title", payload.title);
  if (payload.scheduledFor !== undefined) {
    addField("scheduled_for", payload.scheduledFor);
  }
  if (payload.endTime !== undefined) {
    addField("end_time", payload.endTime);
  }
  if (payload.attendees !== undefined) {
    addField("attendees", JSON.stringify(payload.attendees));
  }
  addField("notes", payload.notes);
  addField("status", payload.status);
  addField("timezone", payload.timezone);
  addField("duration", payload.duration);
  addField("allow_join_before_host", payload.allowJoinBeforeHost);
  addField("waiting_room", payload.waitingRoom);
  addField("mute_on_join", payload.muteOnJoin);
  addField("enable_chat", payload.enableChat);
  addField("allow_screen_sharing", payload.allowScreenSharing);
  addField("meeting_password", payload.meetingPassword);

  if (sets.length === 0) return existing;

  vals.push(code);
  const result = await pool.query(
    `UPDATE meeting_rooms
     SET ${sets.join(", ")}, updated_at = NOW()
     WHERE meeting_code = $${paramIdx} OR id::text = $${paramIdx}
     RETURNING *`,
    vals
  );

  return result.rows[0] ? mapRow(result.rows[0]) : null;
}

export async function startMeeting(code: string, userId: string): Promise<MeetingRecord | null> {
  await ensureTable();
  const res = await pool.query(
    `UPDATE meeting_rooms
     SET status = 'Live',
         host_joined_at = NOW(),
         meeting_started_by = $2,
         updated_at = NOW()
     WHERE meeting_code = $1 OR id::text = $1
     RETURNING *`,
    [code, userId]
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function endMeeting(code: string, userId: string): Promise<MeetingRecord | null> {
  await ensureTable();
  const res = await pool.query(
    `UPDATE meeting_rooms
     SET status = 'Completed',
         ended_at = NOW(),
         is_active = false,
         meeting_ended_by = $2,
         updated_at = NOW()
     WHERE meeting_code = $1 OR id::text = $1
     RETURNING *`,
    [code, userId]
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export async function markMeetingClosed(code: string): Promise<void> {
  await ensureTable();
  await pool.query(
    `UPDATE meeting_rooms
     SET status = 'Completed',
         is_active = false,
         ended_at = NOW(),
         updated_at = NOW()
     WHERE meeting_code = $1 OR id::text = $1`,
    [code]
  );
}

export async function listAllMeetings(userId?: string, userEmail?: string | null): Promise<MeetingRecord[]> {
  await ensureTable();
  if (userId) {
    if (userEmail) {
      const result = await pool.query(
        `SELECT * FROM meeting_rooms 
         WHERE (created_by = $1 OR attendees @> $2::jsonb) 
         ORDER BY scheduled_for DESC`,
        [userId, JSON.stringify([userEmail])]
      );
      return result.rows.map(mapRow);
    } else {
      const result = await pool.query(
        "SELECT * FROM meeting_rooms WHERE created_by = $1 ORDER BY scheduled_for DESC",
        [userId]
      );
      return result.rows.map(mapRow);
    }
  }
  const result = await pool.query(
    "SELECT * FROM meeting_rooms ORDER BY scheduled_for DESC"
  );
  return result.rows.map(mapRow);
}