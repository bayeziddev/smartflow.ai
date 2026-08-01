import { createConnection } from 'mysql2/promise';

/**
 * Workers don't hold a long-lived connection pool the way a normal
 * Node server does — Hyperdrive does that pooling for you at the
 * network edge instead. The correct pattern here is: open a
 * connection scoped to this one request, run your queries, then
 * close it (in the background, via ctx.waitUntil, so closing doesn't
 * add latency to the response).
 *
 * `disableEval: true` is required for mysql2 to run inside the
 * Workers runtime (V8 isolates don't allow the same eval-based
 * fast-path Node uses) — see Cloudflare's Hyperdrive + MySQL docs.
 */
async function openConnection(env) {
  // Use Hyperdrive if available, otherwise fall back to direct connection variables
  const config = env.HYPERDRIVE ? {
    host: env.HYPERDRIVE.host,
    user: env.HYPERDRIVE.user,
    password: env.HYPERDRIVE.password,
    database: env.HYPERDRIVE.database,
    port: env.HYPERDRIVE.port,
  } : {
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    port: parseInt(env.DB_PORT || '4000'),
  };

  return createConnection({
    ...config,
    disableEval: true,
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true
    }
  });
}

/**
 * Runs a single query against a fresh, Hyperdrive-pooled connection.
 * @param {object} env - the Worker's env (must include HYPERDRIVE and ctx-friendly waitUntil access via caller)
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
