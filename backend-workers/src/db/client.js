import { createConnection } from 'mysql2/promise';

/**
 * Connects straight to TiDB Cloud rather than through Cloudflare
 * Hyperdrive. Hyperdrive's MySQL proxy doesn't support the
 * AuthSwitchRequest handshake TiDB Cloud uses (fails with error code
 * 2015, "Hyperdrive does not currently support MySQL AuthSwitchRequest
 * messages"), so we go direct instead — mysql2 implements the full
 * handshake itself.
 *
 * Workers don't hold a long-lived connection pool the way a normal
 * Node server does, so the pattern here is: open a connection scoped
 * to this one request, run your queries, then close it (in the
 * background, via ctx.waitUntil, so closing doesn't add latency to
 * the response).
 *
 * `disableEval: true` is required for mysql2 to run inside the
 * Workers runtime (V8 isolates don't allow the same eval-based
 * fast-path Node uses).
 */
async function openConnection(env) {
  return createConnection({
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    port: parseInt(env.DB_PORT || '4000'),
    disableEval: true,
    // TiDB Cloud requires TLS. DB_SSL=false is only for a local MySQL/MariaDB
    // during development and tests (see backend-workers/README.md).
    ...(String(env.DB_SSL).toLowerCase() === 'false' ? {} : { ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true } }),
  });
}

/**
 * Runs a single query against a fresh connection.
 * @param {object} env - the Worker's env (must include DB_HOST/DB_USER/DB_PASSWORD/DB_DATABASE/DB_PORT)
 * @param {ExecutionContext} ctx - Workers execution context, for ctx.waitUntil
 * @param {string} sql
 * @param {any[]} params
 */
export async function query(env, ctx, sql, params = []) {
  const connection = await openConnection(env);
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } finally {
    if (ctx?.waitUntil) {
      ctx.waitUntil(connection.end());
    } else {
      await connection.end();
    }
  }
}

/**
 * For call sites that need several queries in one transaction-like
 * unit of work (e.g. insert-then-select-the-inserted-id) without
 * paying the connection-open cost twice.
 */
export async function withConnection(env, ctx, fn) {
  const connection = await openConnection(env);
  try {
    return await fn(connection);
  } finally {
    if (ctx?.waitUntil) {
      ctx.waitUntil(connection.end());
    } else {
      await connection.end();
    }
  }
}

/**
 * LIMIT / OFFSET values are written into the SQL rather than bound as `?`:
 * prepared-statement LIMIT placeholders fail on some MySQL versions
 * ("Incorrect arguments to mysqld_stmt_execute"). Clamping to an integer in
 * range keeps that safe.
 */
export function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
