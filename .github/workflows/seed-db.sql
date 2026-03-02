-- Seed database for CI
-- This creates the minimal required entries for the workflow to work

-- Insert bot token (note: this will be replaced by env var at runtime)
INSERT OR IGNORE INTO bot_tokens (app_id, token, created_at) 
VALUES ('1468908006560366699', 'placeholder', datetime('now'));

-- Insert channel mapping for #trains
INSERT OR IGNORE INTO channel_directories (channel_id, directory, channel_type, app_id, created_at) 
VALUES ('1476563389353562142', '/home/runner/work/trains/trains', 'text', '1468908006560366699', datetime('now'));
