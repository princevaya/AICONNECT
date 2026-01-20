import { randomUUID } from "crypto";
import pool from "./db";

export type MeetingStatus = "scheduled" | "live" | "closed";

export interface MeetingRecord {
  id: string;
  code: string;
  title: string;
  scheduledFor: Date;          // ✅ FIXED
  attendees: string[];
  notes?: string | null;
  status: MeetingStatus;
  isActive: boolean;
  createdAt: Date;             // ✅ FIXED
  updatedAt: Date;             // ✅ FIXED
}

let tableReady: Promise<void> | null = null;

type MeetingRow = {
  id: string;
  meeting_code: string;
  title: string;
  scheduled_for: string | Date;
  attendees: unknown;
  notes?: string | null;
  status?: string | null;
  is_active: boolean;
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
          status TEXT NOT NULL DEFAULT 'scheduled',
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
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

function mapRow(row: MeetingRow): MeetingRecord {
  return {
    id: row.id,
    code: row.meeting_code,
    title: row.title,
    scheduledFor: new Date(row.scheduled_for),   // ✅ Date
    attendees: parseAttendees(row.attendees),
    notes: row.notes ?? null,
    status: (row.status ?? "scheduled") as MeetingStatus,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),         // ✅ Date
    updatedAt: new Date(row.updated_at),         // ✅ Date
  };
}

/* ---------- queries ---------- */
export async function listMeetings(): Promise<MeetingRecord[]> {
  await ensureTable();
  const result = await pool.query(
    "SELECT * FROM meeting_rooms WHERE is_active = true ORDER BY scheduled_for ASC"
  );
  return result.rows.map(mapRow);
}

export async function findByCode(code: string): Promise<MeetingRecord | null> {
  await ensureTable();
  const res = await pool.query(
    "SELECT * FROM meeting_rooms WHERE meeting_code = $1 LIMIT 1",
    [code]
  );
  return res.rows[0] ? mapRow(res.rows[0]) : null;
}

export interface CreateMeetingPayload {
  title: string;
  scheduledFor: Date;
  attendees: string[];
  notes?: string;
}

export async function createMeeting(
  payload: CreateMeetingPayload
): Promise<MeetingRecord> {
  await ensureTable();

  const code = Math.random().toString(36).slice(2, 10);

  const result = await pool.query(
    `INSERT INTO meeting_rooms (
      id, meeting_code, title, scheduled_for,
      attendees, notes, status, is_active,
      created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5::jsonb,$6,'scheduled',true,NOW(),NOW())
    RETURNING *`,
    [
      randomUUID(),
      code,
      payload.title,
      payload.scheduledFor,
      JSON.stringify(payload.attendees),
      payload.notes ?? null,
    ]
  );

  return mapRow(result.rows[0]);
}
