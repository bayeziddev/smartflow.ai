import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Radio, Receipt, ArrowRight, Bot } from 'lucide-react';
import { fetchKeys, fetchChannels, fetchOrders, fetchRules, fetchBotSettings } from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';

// Channels that actually answer customers today.
const LIVE_CHANNELS = ['whatsapp', 'whatsapp_qr', 'messenger'];

export default function OverviewPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ keysConfigured: 0, channelsConnected: 0, ordersCount: 0, rulesCount: 0, paused: false });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Each card fails on its own: one slow or broken endpoint shouldn't blank the page.
    const safe = (p, fallback) => p.catch(() => fallback);
    Promise.all([
      safe(fetchKeys(), { keys: [] }),
      safe(fetchChannels(), { channels: [] }),
      safe(fetchOrders({ limit: 200 }), { orders: [] }),
      safe(fetchRules(), { rules: [] }),
      safe(fetchBotSettings(), { settings: {} }),
    ]).then(([keysData, channelsData, ordersData, rulesData, settingsData]) => {
      setStats({
        keysConfigured: keysData.keys.filter((k) => k.isActive && k.isValid).length,
        channelsConnected: channelsData.channels.filter((c) => LIVE_CHANNELS.includes(c.channel) && c.status === 'connected').length,
        ordersCount: ordersData.orders.length,
        rulesCount: rulesData.rules.filter((r) => r.isActive).length,
        paused: !!settingsData.settings?.isPaused,
      });
      setLoaded(true);
    });
  }, []);

  const cards = [
    {
      to: '/dashboard/automation',
      Icon: Bot,
      label: stats.paused ? 'Auto replies paused' : 'Keyword auto replies',
      value: stats.paused ? 'Paused' : stats.rulesCount,
      cta: 'Set up automation',
    },
    {
      to: '/dashboard/channels',
      Icon: Radio,
      label: 'Channels connected',
      value: `${stats.channelsConnected} / ${LIVE_CHANNELS.length}`,
      cta: 'Manage channels',
    },
    {
      to: '/dashboard/secrets',
      Icon: KeyRound,
      label: 'AI providers ready',
      value: stats.keysConfigured,
      cta: 'Manage API keys',
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
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">
        {user?.fullName ? `Hi, ${user.fullName.split(' ')[0]}` : 'Overview'}
      </h1>
      <p className="mb-8 text-sm text-ink-muted">Your chatbot, at a glance.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      {loaded && stats.channelsConnected === 0 && (
        <div className="panel mt-4 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-sm font-semibold text-ink">Connect a channel to go live</p>
            <p className="mt-1 text-sm text-ink-muted">Scan a QR code to link your WhatsApp number, or connect the official WhatsApp / Messenger API.</p>
          </div>
          <Link to="/dashboard/channels" className="btn-primary shrink-0 !py-2 !px-4 text-sm">
            Connect
          </Link>
        </div>
      )}
      {loaded && stats.keysConfigured === 0 && (
        <div className="panel mt-4 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-sm font-semibold text-ink">Add an AI key for smart answers</p>
            <p className="mt-1 text-sm text-ink-muted">
              Customers already get your keyword replies and fallback message. Add an OpenAI, Gemini or Groq key so the bot can answer anything.
            </p>
          </div>
          <Link to="/dashboard/secrets" className="btn-ghost shrink-0 !py-2 !px-4 text-sm">
            Add a key
          </Link>
        </div>
      )}
    </div>
  );
}
