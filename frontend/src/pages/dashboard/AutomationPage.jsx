import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Loader2, Save, Plus, Trash2, Pencil, Send, Zap, Sparkles, MessageSquareReply, PauseCircle, RotateCcw, X } from 'lucide-react';
import {
  fetchBotSettings,
  saveBotSettings,
  fetchRules,
  createRule,
  updateRule,
  deleteRule,
  testBot,
  errorMessage,
} from '../../services/api';

const PROVIDERS = [
  { id: 'openai', label: 'OpenAI' },
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'groq', label: 'Groq' },
  { id: 'xai', label: 'xAI Grok' },
  { id: 'manus', label: 'Manus' },
];

const SOURCE_LABEL = {
  rule: { text: 'Keyword rule', Icon: Zap, className: 'text-intel' },
  ai: { text: 'AI', Icon: Sparkles, className: 'text-signal' },
  fallback: { text: 'Fallback message', Icon: MessageSquareReply, className: 'text-amber' },
  paused: { text: 'Bot paused — no reply sent', Icon: PauseCircle, className: 'text-ink-faint' },
};

const EMPTY_RULE = { keywords: '', reply: '', matchType: 'contains', isActive: true };

function Toggle({ checked, onChange, label, testId }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      data-testid={testId}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-signal/80' : 'bg-void-elevated'}`}
    >
      <span className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-void transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-ink-faint">{hint}</span>}
    </label>
  );
}

// ---------------------------------------------------------------- settings
function SettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBotSettings()
      .then((d) => setSettings(d.settings))
      .catch((err) => setError(errorMessage(err, 'Could not load your bot settings.')));
  }, []);

  async function save(next = settings) {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const d = await saveBotSettings(next);
      setSettings(d.settings);
      setNotice('Saved');
      setTimeout(() => setNotice(''), 2000);
    } catch (err) {
      setError(errorMessage(err, 'Could not save. Try again.'));
    } finally {
      setSaving(false);
    }
  }

  if (!settings) {
    return (
      <div className="panel p-6 text-sm text-ink-muted">
        {error ? <span className="text-rose">{error}</span> : <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading settings…</span>}
      </div>
    );
  }

  const set = (key) => (e) => setSettings({ ...settings, [key]: e.target.value });

  return (
    <form
      className="panel space-y-4 p-6"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className={`flex items-center justify-between gap-3 rounded-lg border p-3 ${settings.isPaused ? 'border-amber/40 bg-amber/5' : 'border-wire-on/30 bg-wire-on/5'}`}>
        <div>
          <p className={`text-sm font-semibold ${settings.isPaused ? 'text-amber' : 'text-wire-on'}`} data-testid="bot-state">
            {settings.isPaused ? 'Auto replies are paused' : 'Auto replies are ON'}
          </p>
          <p className="text-xs text-ink-muted">
            {settings.isPaused ? 'Messages are still saved, but nobody gets an automatic answer.' : 'Every customer message gets an answer within seconds.'}
          </p>
        </div>
        <Toggle
          checked={!settings.isPaused}
          label="Auto replies on/off"
          testId="toggle-bot"
          onChange={(on) => {
            const next = { ...settings, isPaused: !on };
            setSettings(next);
            save(next);
          }}
        />
      </div>

      <Field label="Business name" hint="The AI introduces itself as your assistant.">
        <input className="field-input" value={settings.businessName} onChange={set('businessName')} maxLength={150} placeholder="e.g. Zamil Shop BD" />
      </Field>

      <Field label="Instructions for the AI" hint="Products, prices, delivery charges, opening hours, tone, language… The more you write, the better the answers.">
        <textarea
          className="field-input min-h-[140px] font-sans text-sm"
          value={settings.aiInstructions}
          onChange={set('aiInstructions')}
          maxLength={4000}
          placeholder={'We sell ladies’ bags. Prices: Tote 1,250 tk, Clutch 850 tk.\nDelivery: Dhaka 60 tk, outside Dhaka 120 tk, 2–3 days. Cash on delivery.\nReply in Bangla if the customer writes in Bangla.'}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Welcome message (optional)" hint="Sent once, before the first answer, to a brand-new customer.">
          <textarea className="field-input min-h-[80px] text-sm" value={settings.welcomeMessage} onChange={set('welcomeMessage')} maxLength={1000} placeholder="Hi! Welcome to our shop 👋" />
        </Field>
        <Field label="Fallback message" hint="Used when no keyword matches and the AI is off or has no working key.">
          <textarea className="field-input min-h-[80px] text-sm" value={settings.fallbackMessage} onChange={set('fallbackMessage')} maxLength={1000} />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <Toggle checked={settings.aiEnabled} label="AI replies" onChange={(v) => setSettings({ ...settings, aiEnabled: v })} />
          <span className="text-sm text-ink-muted">Use AI when no keyword rule matches</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-muted">
          Try first:
          <select
            className="field-input !w-auto !py-1.5 text-sm"
            value={settings.preferredProvider}
            onChange={set('preferredProvider')}
            disabled={!settings.aiEnabled}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {settings.aiEnabled && (
        <p className="text-[11px] text-ink-faint">
          AI uses your own keys from <Link to="/dashboard/secrets" className="text-signal hover:underline">API Keys</Link>. If that provider fails, the
          others you added are tried automatically.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary !py-2 !px-4 text-sm disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </button>
        {notice && <span className="text-sm text-wire-on">{notice}</span>}
        {error && <span className="text-sm text-rose">{error}</span>}
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- keyword rules
function RuleEditor({ initial, onSave, onCancel }) {
  const [rule, setRule] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(rule);
    } catch (err) {
      setError(errorMessage(err, 'Could not save this rule.'));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-void-border bg-void-elevated/40 p-4" data-testid="rule-editor">
      <Field label="When the message has any of these words" hint="Separate with commas. English or Bangla, e.g. price, dam, দাম">
        <input
          className="field-input text-sm"
          value={rule.keywords}
          onChange={(e) => setRule({ ...rule, keywords: e.target.value })}
          placeholder="price, dam, দাম"
          required
          name="keywords"
        />
      </Field>
      <Field label="Reply with">
        <textarea
          className="field-input min-h-[80px] text-sm"
          value={rule.reply}
          onChange={(e) => setRule({ ...rule, reply: e.target.value })}
          placeholder="Our bags start at 850 tk. Which one do you like?"
          required
          maxLength={2000}
          name="reply"
        />
      </Field>
      <div className="flex flex-wrap items-center gap-4 text-sm text-ink-muted">
        <label className="flex items-center gap-2">
          <input type="radio" checked={rule.matchType === 'contains'} onChange={() => setRule({ ...rule, matchType: 'contains' })} />
          Message contains a word
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={rule.matchType === 'exact'} onChange={() => setRule({ ...rule, matchType: 'exact' })} />
          Whole message is exactly the word
        </label>
      </div>
      {error && <p className="text-xs text-rose">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary !py-1.5 !px-4 text-xs disabled:opacity-60">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save rule
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost !py-1.5 !px-4 text-xs">
          Cancel
        </button>
      </div>
    </form>
  );
}

function RulesPanel() {
  const [rules, setRules] = useState(null);
  const [editing, setEditing] = useState(null); // 'new' | rule id
  const [error, setError] = useState('');

  const load = () =>
    fetchRules()
      .then((d) => setRules(d.rules))
      .catch((err) => setError(errorMessage(err, 'Could not load your rules.')));

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(rule) {
    await createRule(rule);
    setEditing(null);
    await load();
  }

  async function handleUpdate(id, rule) {
    await updateRule(id, rule);
    setEditing(null);
    await load();
  }

  async function handleToggle(rule) {
    setRules((rs) => rs.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));
    try {
      await updateRule(rule.id, { ...rule, isActive: !rule.isActive });
    } catch (err) {
      setError(errorMessage(err, 'Could not update the rule.'));
      load();
    }
  }

  async function handleDelete(rule) {
    if (!window.confirm(`Delete the rule for "${rule.keywords}"?`)) return;
    try {
      await deleteRule(rule.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not delete the rule.'));
    }
  }

  return (
    <div className="panel p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <Zap className="h-4 w-4 text-intel" /> Keyword auto replies
        </h2>
        {editing !== 'new' && (
          <button onClick={() => setEditing('new')} className="btn-ghost !py-1.5 !px-3 text-xs">
            <Plus className="h-3.5 w-3.5" /> Add rule
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-ink-muted">Instant, fixed answers for common questions. They work even without any AI key, and are checked before the AI.</p>

      {editing === 'new' && (
        <div className="mb-4">
          <RuleEditor initial={EMPTY_RULE} onSave={handleCreate} onCancel={() => setEditing(null)} />
        </div>
      )}
      {error && <p className="mb-3 text-xs text-rose">{error}</p>}

      {rules === null ? (
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading rules…
        </p>
      ) : rules.length === 0 && editing !== 'new' ? (
        <p className="rounded-lg border border-dashed border-void-border p-6 text-center text-sm text-ink-faint">
          No rules yet. Add one for your most common question — like price or delivery.
        </p>
      ) : (
        <ul className="space-y-2" data-testid="rule-list">
          {rules.map((rule) =>
            editing === rule.id ? (
              <li key={rule.id}>
                <RuleEditor initial={rule} onSave={(r) => handleUpdate(rule.id, r)} onCancel={() => setEditing(null)} />
              </li>
            ) : (
              <li key={rule.id} className={`flex items-start gap-3 rounded-lg border border-void-border p-3 ${rule.isActive ? '' : 'opacity-50'}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-1">
                    {rule.keywords.split(',').map((k) => (
                      <span key={k} className="rounded bg-intel/10 px-1.5 py-0.5 text-[11px] font-medium text-intel">
                        {k.trim()}
                      </span>
                    ))}
                    {rule.matchType === 'exact' && <span className="text-[11px] text-ink-faint">exact</span>}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-ink">{rule.reply}</p>
                  <p className="mt-1 text-[11px] text-ink-faint">Used {rule.hitCount || 0} times</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Toggle checked={rule.isActive} label="Rule on/off" onChange={() => handleToggle(rule)} />
                  <button onClick={() => setEditing(rule.id)} className="rounded p-1.5 text-ink-faint hover:text-ink" aria-label="Edit rule">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(rule)} className="rounded p-1.5 text-ink-faint hover:text-rose" aria-label="Delete rule">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- test chat
function newSessionKey() {
  return `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function TestChat() {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionKey, setSessionKey] = useState(newSessionKey);
  const bottom = useRef(null);

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: 'nearest' });
  }, [messages]);

  async function send(e) {
    e.preventDefault();
    const message = text.trim();
    if (!message || sending) return;
    setText('');
    setMessages((m) => [...m, { from: 'customer', text: message }]);
    setSending(true);
    try {
      const r = await testBot(message, sessionKey);
      setMessages((m) => [...m, { from: 'bot', text: r.reply, source: r.source, provider: r.providerUsed, order: r.orderCaptured }]);
    } catch (err) {
      setMessages((m) => [...m, { from: 'error', text: errorMessage(err, 'The test failed. Try again.') }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="panel flex flex-col p-6">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
          <Bot className="h-4 w-4 text-signal" /> Test your bot
        </h2>
        {messages.length > 0 && (
          <button
            onClick={() => {
              setMessages([]);
              setSessionKey(newSessionKey());
            }}
            className="btn-ghost !py-1.5 !px-3 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" /> New chat
          </button>
        )}
      </div>
      <p className="mb-4 text-xs text-ink-muted">Chat as if you were a customer. You get exactly the reply WhatsApp or Messenger customers would get.</p>

      <div className="mb-3 h-72 space-y-2 overflow-y-auto rounded-lg border border-void-border bg-void p-3" data-testid="test-chat-log">
        {messages.length === 0 && <p className="pt-24 text-center text-xs text-ink-faint">Say “hi” or ask a question your customers ask.</p>}
        {messages.map((m, i) => {
          if (m.from === 'customer') {
            return (
              <div key={i} className="flex justify-end">
                <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-xl rounded-br-sm bg-signal/90 px-3 py-2 text-sm text-white">{m.text}</p>
              </div>
            );
          }
          if (m.from === 'error') {
            return (
              <p key={i} className="flex items-center gap-1.5 text-xs text-rose">
                <X className="h-3.5 w-3.5" /> {m.text}
              </p>
            );
          }
          const src = SOURCE_LABEL[m.source] || SOURCE_LABEL.fallback;
          return (
            <div key={i} className="flex flex-col items-start" data-testid="bot-reply">
              {m.text ? (
                <p className="max-w-[80%] whitespace-pre-wrap break-words rounded-xl rounded-bl-sm bg-void-elevated px-3 py-2 text-sm text-ink">{m.text}</p>
              ) : null}
              <p className={`mt-0.5 flex items-center gap-1 text-[10px] ${src.className}`} data-testid="reply-source">
                <src.Icon className="h-3 w-3" />
                {src.text}
                {m.provider ? ` · ${m.provider}` : ''}
                {m.order ? ' · order saved' : ''}
              </p>
            </div>
          );
        })}
        {sending && (
          <p className="flex items-center gap-1.5 text-xs text-ink-faint">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> typing…
          </p>
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="flex gap-2">
        <input
          className="field-input flex-1 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a customer message…"
          maxLength={2000}
          aria-label="Test message"
        />
        <button type="submit" disabled={sending || !text.trim()} className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50" aria-label="Send test message">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export default function AutomationPage() {
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Bot className="h-5 w-5 text-signal" strokeWidth={1.75} />
        <h1 className="font-display text-2xl font-semibold text-ink">Automation</h1>
      </div>
      <p className="mb-8 text-sm text-ink-muted">
        How your bot answers: keyword rules first, then AI with your instructions, then the fallback message — so every customer always gets a reply.
      </p>

      <div className="space-y-4">
        <SettingsPanel />
        <div className="grid gap-4 lg:grid-cols-2">
          <RulesPanel />
          <TestChat />
        </div>
      </div>
    </div>
  );
}
