-- Run this ONLY if you already applied schema.sql before the leads
-- table existed (check first: run `SHOW TABLES LIKE 'leads';` — if it
-- already exists, skip this file).
CREATE TABLE IF NOT EXISTS leads (
  id                 BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email              VARCHAR(255) NOT NULL,
  source             VARCHAR(100) NULL,
  converted_user_id  BIGINT UNSIGNED NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_leads_converted_user FOREIGN KEY (converted_user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_leads_email (email)
) ENGINE=InnoDB;
