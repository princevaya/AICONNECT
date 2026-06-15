-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create pgvector Embeddings table
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_table TEXT NOT NULL,
    source_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for pgvector semantic search (using Cosine distance index)
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING hnsw (embedding vector_cosine_ops);

-- Partitioned Rate Limit Events Table
CREATE TABLE IF NOT EXISTS rate_limit_events_partitioned (
    id TEXT NOT NULL,
    user_id TEXT,
    route_key TEXT NOT NULL,
    subject_key TEXT NOT NULL,
    window_key TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (route_key, subject_key, window_key, created_at)
) PARTITION BY RANGE (created_at);

-- Partition Slices for Rate Limit Events (June 2026 - August 2026)
CREATE TABLE IF NOT EXISTS rate_limit_events_y2026m06 PARTITION OF rate_limit_events_partitioned FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS rate_limit_events_y2026m07 PARTITION OF rate_limit_events_partitioned FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS rate_limit_events_y2026m08 PARTITION OF rate_limit_events_partitioned FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

-- Partitioned Conversation Messages Table
CREATE TABLE IF NOT EXISTS conversation_messages_partitioned (
    id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    blob_id TEXT,
    metadata JSONB,
    mentions JSONB,
    private_to JSONB,
    reply_to_id TEXT,
    attachment_id TEXT,
    edited_at TIMESTAMPTZ,
    pinned_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    deleted_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partition Slices for Messages
CREATE TABLE IF NOT EXISTS conversation_messages_y2026m06 PARTITION OF conversation_messages_partitioned FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS conversation_messages_y2026m07 PARTITION OF conversation_messages_partitioned FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS conversation_messages_y2026m08 PARTITION OF conversation_messages_partitioned FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

-- Partitioned Activity Logs
CREATE TABLE IF NOT EXISTS external_chat_room_activity_logs_partitioned (
    id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS activity_logs_y2026m06 PARTITION OF external_chat_room_activity_logs_partitioned FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS activity_logs_y2026m07 PARTITION OF external_chat_room_activity_logs_partitioned FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE IF NOT EXISTS activity_logs_y2026m08 PARTITION OF external_chat_room_activity_logs_partitioned FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_messages_user_created ON conversation_messages_partitioned (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_room_created ON conversation_messages_partitioned (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_parent_id ON conversation_messages_partitioned (reply_to_id);

CREATE INDEX IF NOT EXISTS idx_recordings_meeting ON recordings (meeting_id);
CREATE INDEX IF NOT EXISTS idx_recordings_created ON recordings (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_files_uploader ON files (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_files_created ON files (created_at DESC);
