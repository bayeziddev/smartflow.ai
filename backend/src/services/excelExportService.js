const ExcelJS = require('exceljs');

/**
 * Builds an .xlsx workbook from a list of orders (as returned by
 * orderService.listOrders) and writes it directly to the given
 * writable stream — no temp file on disk.
 */
async function streamOrdersWorkbook(orders, writableStream) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Fanchatbot Platform';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Orders');

  sheet.columns = [
    { header: 'Order ID', key: 'id', width: 10 },
    { header: 'Date', key: 'created_at', width: 20 },
    { header: 'Channel', key: 'channel', width: 12 },
    { header: 'Customer', key: 'customer_name', width: 20 },
    { header: 'Contact', key: 'customer_identifier', width: 22 },
    { header: 'Items', key: 'items_summary', width: 40 },
    { header: 'Total', key: 'total_amount', width: 12 },
    { header: 'Currency', key: 'currency', width: 10 },
    { header: 'Status', key: 'status', width: 12 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1B4B' } };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  for (const order of orders) {
    const itemsSummary = Array.isArray(order.items)
      ? order.items.map((item) => `${item.quantity || 1}x ${item.name}`).join(', ')
      : '';
    sheet.addRow({
      id: order.id,
      created_at: order.created_at,
      channel: order.channel,
      customer_name: order.customer_name || '—',
      customer_identifier: order.customer_identifier,
      items_summary: itemsSummary,
      total_amount: order.total_amount,
      currency: order.currency,
      status: order.status,
    });
  }

  await workbook.xlsx.write(writableStream);
}

module.exports = { streamOrdersWorkbook };
