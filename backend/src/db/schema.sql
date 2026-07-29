-- ======================================================================
-- FANCHATBOT PLATFORM — CORE SCHEMA (TiDB / MySQL 8+ compatible)
-- ======================================================================
-- Run with: mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p $DB_NAME < schema.sql
-- or via `npm run db:init` (scripts/init-db.js) which applies this file.

CREATE DATABASE IF NOT EXISTS fanchatbot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fanchatbot;

-- ----------------------------------------------------------------------
-- users: tenant/admin accounts. Supports local (email+password) auth
-- AND "Sign in with Manus" OAuth — a user may have either or both.
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_uuid         CHAR(36) NOT NULL UNIQUE,          -- public-safe identifier
  email               VARCHAR(255) NOT NULL UNIQUE,
  password_hash       VARCHAR(255) NULL,                 -- NULL if OAuth-only
  full_name           VARCHAR(150) NULL,
  company_name        VARCHAR(150) NULL,
  role                ENUM('owner','admin','member') NOT NULL DEFAULT 'owner',
  plan                ENUM('trial','starter','pro','enterprise') NOT NULL DEFAULT 'trial',
  -- Platform-wide admin flag — distinct from `role` above. Identifies
  -- the platform owner (you), with access to the cross-tenant Client
  -- List. Never settable through the public API — only via a direct
  -- SQL UPDATE, see backend-workers/README.md.
  is_platform_admin   TINYINT(1) NOT NULL DEFAULT 0,
  manus_user_id       VARCHAR(191) NULL UNIQUE,          -- Manus OAuth subject id
  manus_access_token  TEXT NULL,                          -- encrypted, same AES-GCM scheme
  manus_refresh_token TEXT NULL,                          -- encrypted
  manus_token_expires_at DATETIME NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_manus (manus_user_id)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------
-- tenant_api_configs: one row per (tenant, provider). Stores the
-- tenant's OWN key, AES-256-GCM encrypted at rest. The plaintext key
-- is NEVER stored, logged, or returned by any API response — only
-- `key_preview` (e.g. "sk-...ab12") is ever shown back to the tenant.
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant_api_configs (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT UNSIGNED NOT NULL,
  provider           ENUM('openai','gemini','manus','groq','xai') NOT NULL,
  encrypted_api_key  TEXT NOT NULL,               -- format: base64(iv).base64(authTag).base64(ciphertext)
  key_preview        VARCHAR(24) NOT NULL,        -- masked preview only, e.g. "sk-...ab12"
  is_active          TINYINT(1) NOT NULL DEFAULT 1,
  is_valid           TINYINT(1) NOT NULL DEFAULT 1,   -- flips to 0 after a confirmed 401
  last_used_at       DATETIME NULL,
  last_error_code    VARCHAR(10) NULL,            -- '401' | '429' | etc
  last_error_at      DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tenant_provider (tenant_id, provider),
  CONSTRAINT fk_configs_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------
-- channel_configs: per-tenant channel connection state (toggle on/off).
--
-- external_identifier meaning by channel:
--   whatsapp  -> the Cloud API Phone Number ID (not secret)
--   messenger -> the Facebook Page ID (not secret)
--   telegram  -> the bot's webhook URL
--   email     -> the support inbox address
--
-- encrypted_access_token holds the ONE secret each official channel
-- needs (WhatsApp's permanent access token, or Messenger's Page
-- access token) — AES-256-GCM encrypted with the same crypto.js used
-- for AI provider keys. Never stored, logged, or returned in plaintext.
-- metadata_json holds everything else that ISN'T secret (webhook
-- verify token you chose, business account id, etc).
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS channel_configs (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT UNSIGNED NOT NULL,
  channel            ENUM('whatsapp','telegram','messenger','email') NOT NULL,
  is_enabled         TINYINT(1) NOT NULL DEFAULT 0,
  status             ENUM('disconnected','pending_qr','connected','error') NOT NULL DEFAULT 'disconnected',
  external_identifier VARCHAR(191) NULL,
  encrypted_access_token TEXT NULL,
  metadata_json      JSON NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tenant_channel (tenant_id, channel),
  CONSTRAINT fk_channels_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------
-- sessions: active chat contexts, mapped to a customer's phone/handle
-- on a given channel. This is the conversational memory unit, distinct
-- from the platform's own login/auth sessions.
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT UNSIGNED NOT NULL,
  channel            ENUM('whatsapp','telegram','messenger','email') NOT NULL,
  external_user_id   VARCHAR(191) NOT NULL,       -- phone number / chat id / email address
  display_name       VARCHAR(150) NULL,
  context_json       JSON NULL,                    -- rolling short-term memory / message history
  last_intent        VARCHAR(100) NULL,
  status             ENUM('active','idle','closed') NOT NULL DEFAULT 'active',
  last_message_at    DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_tenant_channel_user (tenant_id, channel, external_user_id),
  CONSTRAINT fk_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------
-- orders: system-of-truth for AI-captured order confirmations. Written
-- with an idempotency key so a retried webhook / duplicate AI extraction
-- cannot double-insert the same order while exceljs export is running.
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT UNSIGNED NOT NULL,
  session_id         BIGINT UNSIGNED NULL,
  idempotency_key    CHAR(64) NOT NULL,            -- sha256 of (tenant_id, channel, external_user_id, order payload)
  channel            ENUM('whatsapp','telegram','messenger','email') NOT NULL,
  customer_identifier VARCHAR(191) NOT NULL,
  customer_name      VARCHAR(150) NULL,
  items_json         JSON NOT NULL,                 -- structured line items extracted by the AI
  total_amount       DECIMAL(12,2) NULL,
  currency           VARCHAR(10) NULL DEFAULT 'USD',
  status             ENUM('pending','confirmed','cancelled','exported') NOT NULL DEFAULT 'confirmed',
  raw_message        TEXT NULL,                     -- original message the order was extracted from
  exported_at        DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_idempotency (idempotency_key),
  CONSTRAINT fk_orders_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_orders_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------
-- ai_usage_logs: lightweight audit trail for the AI Router — which
-- provider served a given request, whether it was a fallback, and
-- what error (if any) triggered the fallback. No prompt/response
-- content is stored here by design (keep it out of the audit trail).
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT UNSIGNED NOT NULL,
  provider_requested ENUM('openai','gemini','manus','groq','xai') NOT NULL,
  provider_used      ENUM('openai','gemini','manus','groq','xai') NOT NULL,
  used_platform_trial_key TINYINT(1) NOT NULL DEFAULT 0,
  was_fallback       TINYINT(1) NOT NULL DEFAULT 0,
  http_status        SMALLINT NULL,
  latency_ms         INT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usage_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_usage_tenant_time (tenant_id, created_at)
) ENGINE=InnoDB;

-- ----------------------------------------------------------------------
-- messages: the actual conversation transcript, one row per inbound or
-- outbound message. `sessions` is the conversation's identity/rolling
-- state; this table is what backs the Conversations inbox page — the
-- full back-and-forth a tenant can read.
-- ----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id          BIGINT UNSIGNED NOT NULL,
  session_id         BIGINT UNSIGNED NOT NULL,
  direction          ENUM('inbound','outbound') NOT NULL,
  content            TEXT NOT NULL,
  provider_used      VARCHAR(20) NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_messages_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  INDEX idx_messages_session (session_id, created_at)
) ENGINE=InnoDB;
