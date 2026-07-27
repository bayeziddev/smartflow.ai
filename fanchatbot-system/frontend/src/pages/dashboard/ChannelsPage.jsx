import React, { useEffect, useState, useCallback } from 'react';
import { MessageCircle, Send, Users, Mail, Loader2, QrCode } from 'lucide-react';
import { fetchChannels, toggleChannel, fetchWhatsappQr } from '../../services/api';

const CHANNEL_META = {
  whatsapp: { label: 'WhatsApp', Icon: MessageCircle, blurb: 'Connect by scanning a QR code, like linking a new device.' },
  telegram: { label: 'Telegram', Icon: Send, blurb: 'Webhook-based — replies go out the moment a message comes in.' },
  messenger: { label: 'Messenger', Icon: Users, blurb: 'Facebook Page inbox, routed through the same AI Router.' },
  email: { label: 'Email', Icon: Mail, blurb: 'SMTP replies to inbound messages from your support address.' },
};
const CHANNEL_ORDER = ['whatsapp', 'telegram', 'messenger', 'email'];

const STATUS_STYLE = {
  connected: 'text-wire-on',
  pending_qr: 'text-amber',
  reconnecting: 'text-amber',
  error: 'text-rose',
  disconnected: 'text-ink-faint',
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [qr, setQr] = useState(null);

  const load = useCallback(async () => {
    const data = await fetchChannels();
    setChannels(data.channels);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Poll for the WhatsApp QR code while a connection is pending.
  useEffect(() => {
    const wa = channels.find((c) => c.channel === 'whatsapp');
    if (wa?.status !== 'pending_qr') {
      setQr(null);
      return;
    }
    const interval = setInterval(async () => {
      const data = await fetchWhatsappQr();
      setQr(data.qr);
    }, 2500);
    return () => clearInterval(interval);
  }, [channels]);

  async function handleToggle(channel, next) {
    setBusy(channel);
    try {
      await toggleChannel(channel, next);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Channels</h1>
      <p className="mb-8 text-sm text-ink-muted">Turn on the channels you want your AI Router listening to.</p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading channel status…
        </div>
      ) : (
        <div className="space-y-3">
          {CHANNEL_ORDER.map((channel) => {
            const meta = CHANNEL_META[channel];
            const state = channels.find((c) => c.channel === channel) || { isEnabled: false, status: 'disconnected' };
            const isBusy = busy === channel;

            return (
              <div key={channel} className="panel p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-void-elevated">
                      <meta.Icon className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="font-display text-sm font-semibold text-ink">{meta.label}</p>
                      <p className={`text-xs ${STATUS_STYLE[state.status] || 'text-ink-faint'}`}>
                        {state.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggle(channel, !state.isEnabled)}
                    disabled={isBusy}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      state.isEnabled ? 'bg-signal/80' : 'bg-void-elevated'
                    }`}
                    aria-label={state.isEnabled ? `Disconnect ${meta.label}` : `Connect ${meta.label}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-void transition-transform ${
                        state.isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <p className="mt-3 text-xs text-ink-faint">{meta.blurb}</p>

                {channel === 'whatsapp' && state.status === 'pending_qr' && (
                  <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-void-border bg-void p-6">
                    <QrCode className="h-5 w-5 text-signal" />
                    {qr ? (
                      <p className="max-w-xs break-all text-center font-mono text-[10px] text-ink-faint">{qr}</p>
                    ) : (
                      <p className="text-xs text-ink-muted">Waiting for a QR code from WhatsApp…</p>
                    )}
                    <p className="text-center text-xs text-ink-muted">
                      Open WhatsApp on your phone → Linked devices → Link a device, then scan.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
