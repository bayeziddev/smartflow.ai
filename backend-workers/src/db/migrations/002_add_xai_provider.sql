-- Run this ONLY if you already applied schema.sql before 'xai' was
-- added as a provider option (check first: run
-- `SHOW COLUMNS FROM tenant_api_configs LIKE 'provider';` — if the
-- Type column already lists 'xai', skip this file).
ALTER TABLE tenant_api_configs
  MODIFY COLUMN provider ENUM('openai','gemini','manus','groq','xai') NOT NULL;

ALTER TABLE ai_usage_logs
  MODIFY COLUMN provider_requested ENUM('openai','gemini','manus','groq','xai') NOT NULL,
  MODIFY COLUMN provider_used ENUM('openai','gemini','manus','groq','xai') NOT NULL;
