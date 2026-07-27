const orderService = require('../services/orderService');
const { streamOrdersWorkbook } = require('../services/excelExportService');

// GET /api/orders?status=confirmed&limit=50&offset=0
async function listOrders(req, res, next) {
  try {
    const { status, limit, offset } = req.query;
    const orders = await orderService.listOrders(req.tenantId, { status, limit, offset });
    res.json({ orders });
  } catch (err) {
    next(err);
  }
}

// GET /api/orders/export.xlsx
async function exportOrders(req, res, next) {
  try {
    const orders = await orderService.listOrders(req.tenantId, { limit: 5000, offset: 0 });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${new Date().toISOString().slice(0, 10)}.xlsx"`);

    await streamOrdersWorkbook(orders, res);

    await orderService.markOrdersExported(orders.map((o) => o.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { listOrders, exportOrders };
