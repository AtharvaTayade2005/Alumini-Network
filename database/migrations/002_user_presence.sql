-- 002_user_presence.sql
-- Tracks last-seen time for online/offline indicators. Presence is ephemeral
-- and rebuilt naturally as users connect, so it is a single row per user.

CREATE TABLE user_presence (
    user_id       UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_presence_seen ON user_presence (last_seen_at DESC);
