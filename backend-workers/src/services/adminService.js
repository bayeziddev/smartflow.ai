import { query } from '../db/client.js';

/**
 * Every signed-up tenant, for the platform owner's own records — this
 * is deliberately separate from anything a tenant can see about
 * themselves. Password hashes and Manus OAuth tokens are never
 * selected here, even for the admin — there's no legitimate reason for
 * this view to need them.
 */
export async function listAllClients(env, ctx) {
  return query(
    env,
    ctx,
    `SELECT id, tenant_uuid, email, full_name, company_name, role, plan, is_active, created_at
     FROM users
     ORDER BY created_at DESC`
  );
}

function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildClientsCsv(clients) {
  const header = ['ID', 'Full Name', 'Company', 'Email', 'Plan', 'Active', 'Signed Up'];
  const lines = [header.join(',')];
  for (const client of clients) {
    lines.push(
      [client.id, client.full_name || '', client.company_name || '', client.email, client.plan, client.is_active ? 'Yes' : 'No', client.created_at]
        .map(csvEscape)
        .join(',')
    );
  }
  return lines.join('\r\n');
}
