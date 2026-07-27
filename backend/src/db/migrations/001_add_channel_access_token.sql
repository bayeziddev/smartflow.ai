-- Run this ONLY if you already applied schema.sql before this column
-- existed (check first: `DESCRIBE channel_configs;` — if
-- encrypted_access_token is already listed, skip this file).
ALTER TABLE channel_configs
  ADD COLUMN encrypted_access_token TEXT NULL AFTER external_identifier;
