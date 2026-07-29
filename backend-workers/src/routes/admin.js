import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import * as adminService from '../services/adminService.js';

const admin = new Hono();
admin.use('*', requireAuth);
admin.use('*', requireAdmin);

admin.get('/clients', async (c) => {
  const clients = await adminService.listAllClients(c.env, c.executionCtx);
  return c.json({ clients });
});

admin.get('/clients/export.csv', async (c) => {
  const clients = await adminService.listAllClients(c.env, c.executionCtx);
  const csv = adminService.buildClientsCsv(clients);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="smartgen-clients-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

export default admin;
