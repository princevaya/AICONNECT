# External Chat Setup

This is a standalone external chat module.
It does not modify meeting or internal meeting-chat routes/components.

## Route

- `/dashboard/external-chat`

## Required New Environment Variables

Add these to `.env.local`:

```env
CHAT_DATABASE_URL=postgresql://...
EXTERNAL_CHAT_S3_BUCKET=your-bucket
EXTERNAL_CHAT_AWS_REGION=us-east-1
EXTERNAL_CHAT_AWS_ACCESS_KEY_ID=...
EXTERNAL_CHAT_AWS_SECRET_ACCESS_KEY=...
EXTERNAL_CHAT_S3_PREFIX=chat-system
EXTERNAL_CHAT_SIGNED_URL_TTL_SECONDS=900
```

S3 path format:

- `AWS_S3_BUCKET/chat-system/...`

## Database

Generate client:

```bash
npx prisma generate
```

Create migration:

```bash
npx prisma migrate dev --name external-chat-system
```

If direct DB access is blocked, generate SQL script and run it in Supabase SQL editor:

```bash
mkdir -p prisma/migrations/external-chat-system
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > prisma/migrations/external-chat-system/migration.sql
```

## Included Features

- Rooms: direct/group/channel
- Members: list + invite
- Messaging: text/note/poll
- Replies, edit, delete, pin
- Reactions
- Read receipts
- Search + pinned filter
- File upload/download with S3/local fallback
- Realtime updates via SSE
