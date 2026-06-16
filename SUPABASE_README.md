# Supabase Setup (Single-File)

This project now uses one main SQL file for Supabase:

- `schema.sql`

## How To Apply

1. Open Supabase Dashboard -> SQL Editor.
2. Open `schema.sql` from this repo.
3. Paste and run as a single script (or run section by section).

## What `schema.sql` includes

- Base application schema (users, meetings, chat, files).
- External chat schema (rooms, members, messages, attachments, receipts, reactions).
- Group/admin extensions (invite code, discoverable flag, activity logs, reports, mutes).
- Hidden chats persistence (`external_chat_room_hidden`).
- Generated images + rate limit tables.
- Owner role repair + system-message enum fix.

## Notes

- This file consolidates prior SQL patches and migration scripts into one place.
- If your database already has part of the schema, some duplicate create statements from legacy sections may need to be skipped manually.
- Always take a Supabase backup before running large schema updates in production.

## Verification queries

- `SELECT enum_range(NULL::"ExternalChatMessageType");`
- `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'external_chat%';`
- `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_external_chat%';`
