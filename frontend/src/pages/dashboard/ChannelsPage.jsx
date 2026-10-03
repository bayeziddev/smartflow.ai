import React, { useEffect, useState, useCallback } from 'react';
import { MessageCircle, Send, Users, Mail, Loader2, ShieldCheck, Eye, EyeOff, Pencil, Copy, Check } from 'lucide-react';
import { fetchChannels, toggleChannel, saveChannelCredentials, errorMessage } from '../../services/api';
import WhatsappQrCard from '../../components/dashboard/WhatsappQrCard.jsx';

const CHANNEL_META = {
  whatsapp: {
    label: 'WhatsApp',
    Icon: MessageCircle,
    blurb: 'Official Meta Cloud API — free to reply to customers, no ban risk.',
    official: true,
    identifierLabel: 'Phone Number ID',
    identifierField: 'phoneNumberId',
  },
  telegram: { label: 'Telegram', Icon: Send, blurb: 'Webhook-based — replies go out the moment a message comes in.', comingSoon: true },
  messenger: {
    label: 'Messenger',
    Icon: Users,
    blurb: 'Official Meta Messenger Platform — free, no per-message cost.',
    official: true,
    identifierLabel: 'Page ID',
    identifierField: 'pageId',
  },
  email: { label: 'Email', Icon: Mail, blurb: 'SMTP replies to inbound messages from your support address.', comingSoon: true },
};
// whatsapp_qr is rendered by its own card, right after the official WhatsApp one.
const CHANNEL_ORDER = ['whatsapp', 'whatsapp_qr', 'messenger', 'telegram', 'email'];

// The URL to paste into Meta's webhook settings for this channel.
function webhookUrl(channel) {
  const base = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`;
  return `${base.replace(/\/+$/, '')}/webhooks/${channel}`;
}

function CopyField({ value }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="flex-1 truncate rounded-md bg-void-elevated px-2.5 py-1.5 text-[11px] text-ink-muted">{value}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="btn-ghost !py-1.5 !px-2.5 text-xs"
        aria-label="Copy webhook URL"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-wire-on" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

const STATUS_STYLE = {
  connected: 'text-wire-on',
  pending_qr: 'text-amber',
  reconnecting: 'text-amber',
  error: 'text-rose',
  disconnected: 'text-ink-faint',
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [gatewayConfigured, setGatewayConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(null);
  const [editingChannel, setEditingChannel] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [draft, setDraft] = useState({ accessToken: '', identifier: '', webhookVerifyToken: '' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await fetchChannels();
      setChannels(data.channels);
      setGatewayConfigured(!!data.whatsappQrGatewayConfigured);
      setLoadError('');
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load your channels.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleToggle(channel, next) {
    setBusy(channel);
    try {
      await toggleChannel(channel, next);
      await load();
    } finally {
      setBusy(null);
    }
  }

  function openEditor(channel) {
    setEditingChannel(channel);
    setDraft({ accessToken: '', identifier: '', webhookVerifyToken: '' });
    setShowToken(false);
    setError('');
  }

  function closeEditor() {
    setEditingChannel(null);
    setDraft({ accessToken: '', identifier: '', webhookVerifyToken: '' }); // never linger in memory
  }

  async function handleSaveCredentials(channel) {
    setError('');
    setBusy(channel);
    try {
      const meta = CHANNEL_META[channel];
      await saveChannelCredentials(channel, {
        accessToken: draft.accessToken,
        webhookVerifyToken: draft.webhookVerifyToken,
        [meta.identifierField]: draft.identifier,
      });
      closeEditor();
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not save these credentials — check them and try again.'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Channels</h1>
      <p className="mb-8 text-sm text-ink-muted">
        Connect where your customers message you. Every connected channel gets the same auto replies you set up in Automation.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading channel status…
        </div>
      ) : loadError ? (
        <div className="panel p-8 text-center text-sm text-rose">{loadError}</div>
      ) : (
        <div className="space-y-3">
          {CHANNEL_ORDER.map((channel) => {
            if (channel === 'whatsapp_qr') {
              return (
                <WhatsappQrCard
                  key={channel}
                  gatewayConfigured={gatewayConfigured}
                  initial={channels.find((c) => c.channel === 'whatsapp_qr')}
                  onChange={load}
                />
              );
            }
            const meta = CHANNEL_META[channel];
            const state = channels.find((c) => c.channel === channel) || { isEnabled: false, status: 'disconnected' };
            const isBusy = busy === channel;
            const isEditing = editingChannel === channel;

            return (
              <div key={channel} className="panel p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-void-elevated">
                      <meta.Icon className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
                    </span>
                    <div>
                      <p className="flex items-center gap-1.5 font-display text-sm font-semibold text-ink">
                        {meta.label}
                        {meta.official && <ShieldCheck className="h-3.5 w-3.5 text-wire-on" />}
                      </p>
                      <p className={`text-xs ${meta.comingSoon ? 'text-ink-faint' : STATUS_STYLE[state.status] || 'text-ink-faint'}`}>
                        {meta.comingSoon ? 'coming soon' : state.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </div>

                  {!meta.comingSoon && (
                  <div className="flex items-center gap-2">
                    {meta.official && (
                      <button onClick={() => openEditor(channel)} className="btn-ghost !py-1.5 !px-3 text-xs">
                        <Pencil className="h-3.5 w-3.5" />
                        {state.status === 'connected' ? 'Update' : 'Connect'}
                      </button>
                    )}
                    <button
                      onClick={() => handleToggle(channel, !state.isEnabled)}
                      disabled={isBusy}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        state.isEnabled ? 'bg-signal/80' : 'bg-void-elevated'
                      }`}
                      aria-label={state.isEnabled ? `Disconnect ${meta.label}` : `Connect ${meta.label}`}
                    >
                      <span
                        className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-void transition-transform ${
                          state.isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  )}
                </div>

                <p className="mt-3 text-xs text-ink-faint">{meta.blurb}</p>

                {isEditing && (
                  <div className="mt-4 space-y-3 border-t border-void-border pt-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">{meta.identifierLabel}</label>
                      <input
                        className="field-input font-mono text-sm"
                        value={draft.identifier}
                        onChange={(e) => setDraft({ ...draft, identifier: e.target.value })}
                        placeholder={channel === 'whatsapp' ? 'e.g. 109876543210' : 'e.g. 61550012345'}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">Access token</label>
                      <div className="relative">
                        <input
                          type={showToken ? 'text' : 'password'}
                          className="field-input pr-10 font-mono text-sm"
                          value={draft.accessToken}
                          onChange={(e) => setDraft({ ...draft, accessToken: e.target.value })}
                          placeholder="From Meta App Dashboard → API Setup"
                        />
                        <button
                          type="button"
                          onClick={() => setShowToken((s) => !s)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                        >
                          {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">Webhook verify token</label>
                      <input
                        className="field-input font-mono text-sm"
                        value={draft.webhookVerifyToken}
                        onChange={(e) => setDraft({ ...draft, webhookVerifyToken: e.target.value })}
                        placeholder="Make one up — enter the same string in Meta's webhook settings"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-ink-muted">Webhook callback URL (paste into Meta)</label>
                      <CopyField value={webhookUrl(channel)} />
                    </div>
                    {error && <p className="text-xs text-rose">{error}</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveCredentials(channel)}
                        disabled={isBusy || !draft.accessToken || !draft.identifier}
                        className="btn-primary !py-1.5 !px-4 text-xs disabled:opacity-50"
                      >
                        {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save & connect'}
                      </button>
                      <button onClick={closeEditor} className="btn-ghost !py-1.5 !px-4 text-xs">
                        Cancel
                      </button>
                    </div>
                    <p className="text-[11px] text-ink-faint">
                      See docs/CHANNELS.md for the full free Meta setup walkthrough.
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
