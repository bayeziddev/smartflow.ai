import React, { useEffect, useState, useCallback } from 'react';
import { MessageCircle, Send, Users, Mail, Loader2, ShieldCheck, Eye, EyeOff, Pencil } from 'lucide-react';
import { fetchChannels, toggleChannel, saveChannelCredentials } from '../../services/api';

const CHANNEL_META = {
  whatsapp: {
    label: 'WhatsApp',
    Icon: MessageCircle,
    blurb: 'Official Meta Cloud API — free to reply to customers, no ban risk.',
    official: true,
    identifierLabel: 'Phone Number ID',
    identifierField: 'phoneNumberId',
  },
  telegram: { label: 'Telegram', Icon: Send, blurb: 'Webhook-based — replies go out the moment a message comes in.' },
  messenger: {
    label: 'Messenger',
    Icon: Users,
    blurb: 'Official Meta Messenger Platform — free, no per-message cost.',
    official: true,
    identifierLabel: 'Page ID',
    identifierField: 'pageId',
  },
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
  const [editingChannel, setEditingChannel] = useState(null);
  const [showToken, setShowToken] = useState(false);
  const [draft, setDraft] = useState({ accessToken: '', identifier: '', webhookVerifyToken: '' });
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const data = await fetchChannels();
    setChannels(data.channels);
    setLoading(false);
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
      setError(err.response?.data?.error?.message || 'Could not save these credentials — check them and try again.');
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
                      <p className={`text-xs ${STATUS_STYLE[state.status] || 'text-ink-faint'}`}>
                        {state.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

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
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-void transition-transform ${
                          state.isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
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
