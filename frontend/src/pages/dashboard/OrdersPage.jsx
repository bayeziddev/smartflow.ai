import React, { useEffect, useState } from 'react';
import { Receipt, Download, Loader2 } from 'lucide-react';
import { fetchOrders, exportOrdersUrl } from '../../services/api';

const CHANNEL_LABEL = { whatsapp: 'WhatsApp', telegram: 'Telegram', messenger: 'Messenger', email: 'Email' };

function formatItems(items) {
  if (!Array.isArray(items)) return '—';
  return items.map((i) => `${i.quantity || 1}× ${i.name}`).join(', ');
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders().then((data) => {
      setOrders(data.orders);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-signal" strokeWidth={1.75} />
          <h1 className="font-display text-2xl font-semibold text-ink">Orders</h1>
        </div>
        <a href={exportOrdersUrl()} className="btn-ghost !py-2 !px-4 text-sm">
          <Download className="h-4 w-4" />
          Export to Excel
        </a>
      </div>
      <p className="mb-8 text-sm text-ink-muted">
        Every order your AI confirms with a customer lands here automatically.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 p-14 text-center">
          <Receipt className="h-6 w-6 text-ink-faint" />
          <p className="text-sm text-ink-muted">No orders yet. Once a channel is connected, confirmed orders will show up here.</p>
        </div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-void-border bg-void-elevated/50 text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Channel</th>
                <th className="px-5 py-3 font-medium">Items</th>
                <th className="px-5 py-3 font-medium">Total</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-void-border">
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-void-elevated/30">
                  <td className="px-5 py-3">
                    <div className="text-ink">{order.customer_name || '—'}</div>
                    <div className="font-mono text-xs text-ink-faint">{order.customer_identifier}</div>
                  </td>
                  <td className="px-5 py-3 text-ink-muted">{CHANNEL_LABEL[order.channel] || order.channel}</td>
                  <td className="px-5 py-3 text-ink-muted">{formatItems(order.items)}</td>
                  <td className="px-5 py-3 text-ink">
                    {order.total_amount ? `${order.total_amount} ${order.currency || ''}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-void-elevated px-2.5 py-1 text-xs capitalize text-ink-muted">
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
