-- Run this ONLY if you already applied schema.sql before the
-- Conversations inbox feature existed (check first: run
-- `SHOW TABLES LIKE 'messages';` — if it already exists, skip this file).
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
