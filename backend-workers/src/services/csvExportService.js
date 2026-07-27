/**
 * Exports as CSV rather than a true .xlsx binary — exceljs leans on
 * Node-specific Buffer/stream internals that aren't guaranteed to work
 * in the Workers runtime even with nodejs_compat. CSV needs zero
 * dependencies, Excel opens .csv natively on both Windows and Mac, so
 * this covers the "export to Excel" need without that risk. If you
 * later confirm exceljs works fine in your Workers setup, the Node
 * backend's excelExportService.js is the drop-in replacement.
 */
function csvEscape(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function buildOrdersCsv(orders) {
  const header = ['Order ID', 'Date', 'Channel', 'Customer', 'Contact', 'Items', 'Total', 'Currency', 'Status'];
  const lines = [header.join(',')];

  for (const order of orders) {
    const itemsSummary = Array.isArray(order.items) ? order.items.map((i) => `${i.quantity || 1}x ${i.name}`).join('; ') : '';
    lines.push(
      [
        order.id,
        order.created_at,
        order.channel,
        order.customer_name || '',
        order.customer_identifier,
        itemsSummary,
        order.total_amount ?? '',
        order.currency || '',
        order.status,
      ]
        .map(csvEscape)
        .join(',')
    );
  }

  return lines.join('\r\n');
}
