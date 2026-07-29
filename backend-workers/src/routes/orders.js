import { Hono } from 'hono';
import { requireAuth } from '../middleware/requireAuth.js';
import * as orderService from '../services/orderService.js';
import { buildOrdersCsv } from '../services/csvExportService.js';

const orders = new Hono();
orders.use('*', requireAuth);

orders.get('/export.csv', async (c) => {
  const list = await orderService.listOrders(c.env, c.executionCtx, c.get('tenantId'), { limit: 5000, offset: 0 });
  const csv = buildOrdersCsv(list);
  await orderService.markOrdersExported(c.env, c.executionCtx, list.map((o) => o.id));

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});

orders.get('/', async (c) => {
  const { status, limit, offset } = c.req.query();
  const list = await orderService.listOrders(c.env, c.executionCtx, c.get('tenantId'), { status, limit, offset });
  return c.json({ orders: list });
});

export default orders;
