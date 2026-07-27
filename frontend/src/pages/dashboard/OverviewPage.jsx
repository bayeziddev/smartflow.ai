import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Radio, Receipt, ArrowRight } from 'lucide-react';
import { fetchKeys, fetchChannels, fetchOrders } from '../../services/api';

export default function OverviewPage() {
  const [stats, setStats] = useState({ keysConfigured: 0, channelsConnected: 0, ordersCount: 0 });

  useEffect(() => {
    Promise.all([fetchKeys(), fetchChannels(), fetchOrders({ limit: 1 })]).then(([keysData, channelsData, ordersData]) => {
      setStats({
        keysConfigured: keysData.keys.filter((k) => k.isActive && k.isValid).length,
        channelsConnected: channelsData.channels.filter((c) => c.status === 'connected').length,
        ordersCount: ordersData.orders.length,
      });
    });
  }, []);

  const cards = [
    {
      to: '/dashboard/secrets',
      Icon: KeyRound,
      label: 'AI providers ready',
      value: `${stats.keysConfigured} / 4`,
      cta: 'Manage API keys',
    },
    {
      to: '/dashboard/channels',
      Icon: Radio,
      label: 'Channels connected',
      value: `${stats.channelsConnected} / 4`,
      cta: 'Manage channels',
    },
    {
      to: '/dashboard/orders',
      Icon: Receipt,
      label: 'Orders captured',
      value: stats.ordersCount,
      cta: 'View orders',
    },
  ];

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Overview</h1>
      <p className="mb-8 text-sm text-ink-muted">Your router, at a glance.</p>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ to, Icon, label, value, cta }) => (
          <Link key={to} to={to} className="panel group p-6 transition-colors hover:border-signal/40">
            <Icon className="h-5 w-5 text-signal" strokeWidth={1.75} />
            <p className="mt-4 font-display text-3xl font-semibold text-ink">{value}</p>
            <p className="mt-1 text-sm text-ink-muted">{label}</p>
            <p className="mt-4 flex items-center gap-1 text-xs text-ink-faint transition-colors group-hover:text-signal">
              {cta} <ArrowRight className="h-3 w-3" />
            </p>
          </Link>
        ))}
      </div>

      {stats.keysConfigured === 0 && (
        <div className="panel mt-4 flex items-center justify-between gap-4 p-6">
          <div>
            <p className="font-display text-sm font-semibold text-ink">Add your first AI key to go live</p>
            <p className="mt-1 text-sm text-ink-muted">Nothing responds to customers until at least one provider is configured.</p>
          </div>
          <Link to="/dashboard/secrets" className="btn-primary shrink-0 !py-2 !px-4 text-sm">
            Add a key
          </Link>
        </div>
      )}
    </div>
  );
}
