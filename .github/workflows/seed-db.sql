-- Full database schema for CI
-- This creates all tables and seeds the required data

-- Create all tables
CREATE TABLE IF NOT EXISTS "bot_tokens" (
    "app_id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "channel_directories" (
    "channel_id" TEXT NOT NULL PRIMARY KEY,
    "directory" TEXT NOT NULL,
    "channel_type" TEXT NOT NULL,
    "app_id" TEXT,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "channel_directories_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "bot_tokens" ("app_id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "thread_sessions" (
    "thread_id" TEXT NOT NULL PRIMARY KEY,
    "session_id" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "part_messages" (
    "part_id" TEXT NOT NULL PRIMARY KEY,
    "message_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "part_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "thread_sessions" ("thread_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "pending_auto_start" (
    "thread_id" TEXT NOT NULL PRIMARY KEY,
    "created_at" DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pending_auto_start_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "thread_sessions" ("thread_id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Insert bot token placeholder
INSERT OR IGNORE INTO bot_tokens (app_id, token, created_at) 
VALUES ('1468908006560366699', 'placeholder', datetime('now'));

-- Insert channel mapping for #trains
INSERT OR IGNORE INTO channel_directories (channel_id, directory, channel_type, app_id, created_at) 
VALUES ('1476563389353562142', '/home/runner/work/trains/trains', 'text', '1468908006560366699', datetime('now'));
