import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { KeyRound, Eye, EyeOff, Trash2, Loader2, ShieldCheck, AlertTriangle, Pencil } from 'lucide-react';
import { fetchKeys, saveKey, toggleKey, deleteKey } from '../../services/api';

const PROVIDER_META = {
  openai: { label: 'OpenAI', placeholder: 'sk-proj-...' },
  gemini: { label: 'Gemini', placeholder: 'AIza...' },
  groq: { label: 'Groq · LLaMA 3.1', placeholder: 'gsk_...' },
  manus: { label: 'Manus', placeholder: 'manus_...' },
  xai: { label: 'xAI · Grok', placeholder: 'xai-...' },
};
const PROVIDER_ORDER = ['openai', 'gemini', 'groq', 'xai', 'manus'];

export default function SecretsPage() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState(null);
  const [draftKey, setDraftKey] = useState('');
  const [showDraft, setShowDraft] = useState(false);
  const [busyProvider, setBusyProvider] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    const data = await fetchKeys();
    setKeys(data.keys);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function configFor(provider) {
    return keys.find((k) => k.provider === provider);
  }

  function openEditor(provider) {
    setEditingProvider(provider);
    setDraftKey('');
    setShowDraft(false);
    setError('');
  }

  function closeEditor() {
    setEditingProvider(null);
    setDraftKey(''); // never let a typed key linger in memory once the panel is closed
    setShowDraft(false);
  }

  async function handleSave(provider) {
    setError('');
    setBusyProvider(provider);
    try {
      await saveKey(provider, draftKey);
      closeEditor();
      await load();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not save this key — check it and try again.');
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleToggle(provider, next) {
    setBusyProvider(provider);
    try {
      await toggleKey(provider, next);
      await load();
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleDelete(provider) {
    if (!window.confirm(`Remove your ${PROVIDER_META[provider].label} key? Automation on this provider will stop until you add a new one.`)) {
      return;
    }
    setBusyProvider(provider);
    try {
      await deleteKey(provider);
      await load();
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-signal" strokeWidth={1.75} />
        <h1 className="font-display text-2xl font-semibold text-ink">API Keys</h1>
      </div>
      <p className="mb-8 text-sm text-ink-muted">
        Your keys are encrypted the moment you save them. From here on, only a masked preview is ever shown —
        not to you, not in any log.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading your configuration…
        </div>
      ) : (
        <div className="space-y-3">
          {PROVIDER_ORDER.map((provider) => {
            const config = configFor(provider);
            const meta = PROVIDER_META[provider];
            const isEditing = editingProvider === provider;
            const isBusy = busyProvider === provider;

            return (
              <div key={provider} className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-display text-sm font-semibold text-ink">{meta.label}</p>
                      {config ? (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="rounded bg-void px-2 py-0.5 font-mono text-xs text-ink-muted">
                            {config.keyPreview}
                          </span>
                          {config.isValid ? (
                            <span className="flex items-center gap-1 text-xs text-wire-on">
                              <ShieldCheck className="h-3 w-3" /> Verified
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-rose">
                              <AlertTriangle className="h-3 w-3" /> Rejected — needs a new key
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="mt-1 text-xs text-ink-faint">Not configured</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {config && (
                      <>
                        <button
                          onClick={() => handleToggle(provider, !config.isActive)}
                          disabled={isBusy}
                          className={`relative h-6 w-11 rounded-full transition-colors ${
                            config.isActive ? 'bg-signal/80' : 'bg-void-elevated'
                          }`}
                          aria-label={config.isActive ? 'Disable this provider' : 'Enable this provider'}
                        >
                          <span
                            className={`absolute top-0.5 h-5 w-5 rounded-full bg-void transition-transform ${
                              config.isActive ? 'translate-x-5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleDelete(provider)}
                          disabled={isBusy}
                          className="rounded-lg p-2 text-ink-faint transition-colors hover:bg-void-elevated hover:text-rose"
                          aria-label="Remove key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => openEditor(provider)}
                      className="btn-ghost !py-1.5 !px-3 text-xs"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {config ? 'Replace' : 'Add key'}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 border-t border-void-border pt-4">
                        <div className="relative">
                          <input
                            type={showDraft ? 'text' : 'password'}
                            autoFocus
                            value={draftKey}
                            onChange={(e) => setDraftKey(e.target.value)}
                            placeholder={meta.placeholder}
                            className="field-input pr-10 font-mono text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => setShowDraft((s) => !s)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
                          >
                            {showDraft ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {error && <p className="mt-2 text-xs text-rose">{error}</p>}
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleSave(provider)}
                            disabled={busyProvider === provider || draftKey.length < 8}
                            className="btn-primary !py-1.5 !px-4 text-xs disabled:opacity-50"
                          >
                            {busyProvider === provider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save key'}
                          </button>
                          <button onClick={closeEditor} className="btn-ghost !py-1.5 !px-4 text-xs">
                            Cancel
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
