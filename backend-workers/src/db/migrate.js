import { withConnection } from './client.js';

/**
 * Self-applying schema migrations, so a deploy never needs someone to paste
 * SQL into the TiDB console. The first API request handled by a fresh Worker
 * isolate runs every migration not yet recorded in `schema_migrations`; later
 * requests skip straight through (the check is memoised per isolate).
 *
 * Every step is idempotent — CREATE TABLE IF NOT EXISTS, MODIFY COLUMN to the
 * full ENUM list, "add column only if missing" — so two isolates racing on
 * the first request, or a database that already has some of these changes
 * from the old hand-run migration files, end up in the same place.
 *
 * Add new migrations to the END of MIGRATIONS with a new id; never edit an
 * old one after it has shipped.
 */

const CHANNELS = "'whatsapp','telegram','messenger','email','whatsapp_qr','test'";

const MIGRATIONS = [
  {
    id: '001_base_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_uuid CHAR(36) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NULL,
        full_name VARCHAR(150) NULL,
        company_name VARCHAR(150) NULL,
        role ENUM('owner','admin','member') NOT NULL DEFAULT 'owner',
        plan ENUM('trial','starter','pro','enterprise') NOT NULL DEFAULT 'trial',
        is_platform_admin TINYINT(1) NOT NULL DEFAULT 0,
        manus_user_id VARCHAR(191) NULL UNIQUE,
        manus_access_token TEXT NULL,
        manus_refresh_token TEXT NULL,
        manus_token_expires_at DATETIME NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB`,
      { addColumnIfMissing: ['users', 'is_platform_admin', 'TINYINT(1) NOT NULL DEFAULT 0'] },
      `CREATE TABLE IF NOT EXISTS tenant_api_configs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        provider ENUM('openai','gemini','manus','groq','xai') NOT NULL,
        encrypted_api_key TEXT NOT NULL,
        key_preview VARCHAR(24) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        is_valid TINYINT(1) NOT NULL DEFAULT 1,
        last_used_at DATETIME NULL,
        last_error_code VARCHAR(10) NULL,
        last_error_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tenant_provider (tenant_id, provider),
        CONSTRAINT fk_configs_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS channel_configs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        channel ENUM('whatsapp','telegram','messenger','email') NOT NULL,
        is_enabled TINYINT(1) NOT NULL DEFAULT 0,
        status ENUM('disconnected','pending_qr','connected','error') NOT NULL DEFAULT 'disconnected',
        external_identifier VARCHAR(191) NULL,
        encrypted_access_token TEXT NULL,
        metadata_json JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tenant_channel (tenant_id, channel),
        CONSTRAINT fk_channels_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        channel ENUM('whatsapp','telegram','messenger','email') NOT NULL,
        external_user_id VARCHAR(191) NOT NULL,
        display_name VARCHAR(150) NULL,
        context_json JSON NULL,
        last_intent VARCHAR(100) NULL,
        status ENUM('active','idle','closed') NOT NULL DEFAULT 'active',
        last_message_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_tenant_channel_user (tenant_id, channel, external_user_id),
        CONSTRAINT fk_sessions_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS orders (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        session_id BIGINT UNSIGNED NULL,
        idempotency_key CHAR(64) NOT NULL,
        channel ENUM('whatsapp','telegram','messenger','email') NOT NULL,
        customer_identifier VARCHAR(191) NOT NULL,
        customer_name VARCHAR(150) NULL,
        items_json JSON NOT NULL,
        total_amount DECIMAL(12,2) NULL,
        currency VARCHAR(10) NULL DEFAULT 'USD',
        status ENUM('pending','confirmed','cancelled','exported') NOT NULL DEFAULT 'confirmed',
        raw_message TEXT NULL,
        exported_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_idempotency (idempotency_key),
        CONSTRAINT fk_orders_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_orders_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        provider_requested ENUM('openai','gemini','manus','groq','xai') NOT NULL,
        provider_used ENUM('openai','gemini','manus','groq','xai') NOT NULL,
        used_platform_trial_key TINYINT(1) NOT NULL DEFAULT 0,
        was_fallback TINYINT(1) NOT NULL DEFAULT 0,
        http_status SMALLINT NULL,
        latency_ms INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_usage_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_usage_tenant_time (tenant_id, created_at)
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS messages (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        session_id BIGINT UNSIGNED NOT NULL,
        direction ENUM('inbound','outbound') NOT NULL,
        content TEXT NOT NULL,
        provider_used VARCHAR(20) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_messages_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_messages_session FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        INDEX idx_messages_session (session_id, created_at)
      ) ENGINE=InnoDB`,
    ],
  },
  {
    // WhatsApp-by-QR is its own channel next to the official Cloud API one,
    // so a tenant can run both. "test" is the dashboard's Test-your-bot chat.
    id: '005_channels_v2',
    statements: [
      `ALTER TABLE channel_configs MODIFY COLUMN channel ENUM(${CHANNELS}) NOT NULL`,
      `ALTER TABLE channel_configs MODIFY COLUMN status ENUM('disconnected','pending_qr','pending_setup','reconnecting','connected','error') NOT NULL DEFAULT 'disconnected'`,
      `ALTER TABLE sessions MODIFY COLUMN channel ENUM(${CHANNELS}) NOT NULL`,
      `ALTER TABLE orders MODIFY COLUMN channel ENUM(${CHANNELS}) NOT NULL`,
    ],
  },
  {
    id: '006_automation',
    statements: [
      `CREATE TABLE IF NOT EXISTS bot_settings (
        tenant_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        business_name VARCHAR(150) NULL,
        ai_instructions TEXT NULL,
        welcome_message TEXT NULL,
        fallback_message TEXT NULL,
        ai_enabled TINYINT(1) NOT NULL DEFAULT 1,
        preferred_provider VARCHAR(20) NOT NULL DEFAULT 'openai',
        is_paused TINYINT(1) NOT NULL DEFAULT 0,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_bot_settings_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS auto_reply_rules (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        tenant_id BIGINT UNSIGNED NOT NULL,
        keywords VARCHAR(500) NOT NULL,
        match_type ENUM('contains','exact') NOT NULL DEFAULT 'contains',
        reply TEXT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        hit_count INT UNSIGNED NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_rules_tenant FOREIGN KEY (tenant_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_rules_tenant (tenant_id, is_active, sort_order)
      ) ENGINE=InnoDB`,
    ],
  },
];

export const MIGRATION_IDS = MIGRATIONS.map((m) => m.id);

async function columnExists(connection, table, column) {
  const [rows] = await connection.execute(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1',
    [table, column]
  );
  return rows.length > 0;
}

/** Applies every pending migration. Returns the ids it applied. */
export async function runMigrations(env, ctx) {
  return withConnection(env, ctx, async (connection) => {
    await connection.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (id VARCHAR(100) NOT NULL PRIMARY KEY, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`
    );
    const [done] = await connection.query('SELECT id FROM schema_migrations');
    const applied = new Set(done.map((r) => r.id));
    const ran = [];
    for (const migration of MIGRATIONS) {
      if (applied.has(migration.id)) continue;
      for (const step of migration.statements) {
        if (typeof step === 'string') {
          await connection.query(step);
        } else if (step.addColumnIfMissing) {
          const [table, column, definition] = step.addColumnIfMissing;
          if (!(await columnExists(connection, table, column))) {
            await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
          }
        }
      }
      await connection.execute('INSERT IGNORE INTO schema_migrations (id) VALUES (?)', [migration.id]);
      ran.push(migration.id);
    }
    if (ran.length) console.log('schema_migrations_applied', ran.join(','));
    return ran;
  });
}

let ready = null;

/** Middleware: make sure the schema is current before the first query in this isolate. */
export async function ensureSchema(c, next) {
  if (String(c.env.AUTO_MIGRATE).toLowerCase() !== 'false') {
    if (!ready) {
      ready = runMigrations(c.env, c.executionCtx).catch((err) => {
        ready = null; // try again on the next request
        throw err;
      });
    }
    await ready;
  }
  await next();
}

/** Test helper: forget that migrations already ran in this isolate. */
export function resetMigrationState() {
  ready = null;
}
