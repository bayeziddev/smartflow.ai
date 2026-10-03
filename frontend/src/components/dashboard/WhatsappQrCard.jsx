import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QrCode, Loader2, Smartphone, LogOut, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { connectWhatsappQr, fetchWhatsappQrStatus, logoutWhatsappQr, errorMessage } from '../../services/api';

const STATUS_TEXT = {
  qr: 'Waiting for you to scan the QR code',
  connecting: 'Connecting…',
  connected: 'Connected',
  disconnected: 'Not linked',
  logged_out: 'Unlinked from the phone',
};
const STATUS_STYLE = {
  qr: 'text-amber',
  connecting: 'text-amber',
  connected: 'text-wire-on',
  disconnected: 'text-ink-faint',
  logged_out: 'text-rose',
};
const POLL_MS = 3000;

function formatPhone(phone) {
  return phone ? `+${String(phone).replace(/[^0-9]/g, '')}` : '';
}

/**
 * Links an ordinary WhatsApp (or WhatsApp Business app) number by scanning a
 * QR code, the same way WhatsApp Web works. The QR comes from the always-on
 * whatsapp-gateway service through the backend.
 */
export default function WhatsappQrCard({ gatewayConfigured, initial, onChange }) {
  const [state, setState] = useState(() => ({
    status: initial?.status === 'connected' ? 'connected' : 'disconnected',
    phone: initial?.externalIdentifier || null,
    qr: null,
    lastError: null,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef(null);
  const wasConnected = useRef(state.status === 'connected');

  const apply = useCallback(
    (next) => {
      setState(next);
      const connected = next.status === 'connected';
      if (connected !== wasConnected.current) {
        wasConnected.current = connected;
        onChange?.();
      }
    },
    [onChange]
  );

  const refresh = useCallback(async () => {
    try {
      apply(await fetchWhatsappQrStatus());
      setError('');
    } catch (err) {
      setError(errorMessage(err, 'Could not check the WhatsApp link.'));
    }
  }, [apply]);

  // Ask the gateway for the real state once on load (the saved status can be stale).
  useEffect(() => {
    if (gatewayConfigured) refresh();
  }, [gatewayConfigured, refresh]);

  // While a QR is showing or the link is being set up, poll so the card
  // flips to "Connected" right after the phone scans it.
  useEffect(() => {
    clearTimeout(timer.current);
    if (state.status === 'qr' || state.status === 'connecting') {
      timer.current = setTimeout(refresh, POLL_MS);
    }
    return () => clearTimeout(timer.current);
  }, [state, refresh]);

  async function handleConnect() {
    setBusy(true);
    setError('');
    try {
      apply(await connectWhatsappQr());
    } catch (err) {
      setError(errorMessage(err, 'Could not start WhatsApp linking.'));
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (!window.confirm('Unlink this WhatsApp number? Auto replies on it stop until you scan a new QR code.')) return;
    setBusy(true);
    setError('');
    try {
      apply(await logoutWhatsappQr());
    } catch (err) {
      setError(errorMessage(err, 'Could not unlink WhatsApp.'));
    } finally {
      setBusy(false);
    }
  }

  const { status } = state;
  const linking = status === 'qr' || status === 'connecting';

  return (
    <div className="panel p-5" data-testid="whatsapp-qr-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-void-elevated">
            <QrCode className="h-4 w-4 text-ink-muted" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-display text-sm font-semibold text-ink">WhatsApp (QR scan)</p>
            <p className={`text-xs ${STATUS_STYLE[status] || 'text-ink-faint'}`} data-testid="whatsapp-qr-status">
              {STATUS_TEXT[status] || status}
              {status === 'connected' && state.phone ? ` · ${formatPhone(state.phone)}` : ''}
            </p>
          </div>
        </div>

        {gatewayConfigured && (
          <div className="flex items-center gap-2">
            {status === 'connected' ? (
              <button onClick={handleLogout} disabled={busy} className="btn-ghost !py-1.5 !px-3 text-xs hover:!text-rose disabled:opacity-50">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
                Disconnect
              </button>
            ) : (
              <button onClick={handleConnect} disabled={busy || linking} className="btn-primary !py-1.5 !px-3 text-xs disabled:opacity-50">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Smartphone className="h-3.5 w-3.5" />}
                {status === 'logged_out' || state.lastError ? 'Get a new QR code' : 'Connect with QR'}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        Link your normal WhatsApp or WhatsApp Business app number by scanning a QR code — no Meta developer account needed.
        Customers who message that number get your auto replies.
      </p>

      {!gatewayConfigured && (
        <div className="mt-4 rounded-lg border border-amber/30 bg-amber/5 p-3 text-xs text-ink-muted">
          <p className="font-medium text-amber">Setup needed (one time)</p>
          <p className="mt-1">
            QR linking needs the small always-on <span className="font-mono">whatsapp-gateway</span> service. Deploy it, then set{' '}
            <span className="font-mono">WA_GATEWAY_URL</span> and <span className="font-mono">WA_GATEWAY_SECRET</span> on the backend. See{' '}
            <span className="font-mono">whatsapp-gateway/README.md</span>.
          </p>
        </div>
      )}

      {status === 'qr' && state.qr && (
        <div className="mt-4 flex flex-col items-center gap-4 border-t border-void-border pt-4 sm:flex-row sm:items-start">
          <img
            src={state.qr}
            alt="WhatsApp QR code — scan it from WhatsApp → Linked devices"
            className="h-56 w-56 rounded-lg bg-white p-2"
            data-testid="whatsapp-qr-image"
          />
          <ol className="list-decimal space-y-1.5 pl-4 text-sm text-ink-muted">
            <li>Open WhatsApp on the phone with your business number.</li>
            <li>
              Tap <span className="text-ink">⋮ Menu</span> (Android) or <span className="text-ink">Settings</span> (iPhone).
            </li>
            <li>
              Tap <span className="text-ink">Linked devices → Link a device</span>.
            </li>
            <li>Point the phone at this QR code.</li>
            <li className="list-none pt-1 text-xs text-ink-faint">The code refreshes by itself every ~20 seconds. Keep this page open.</li>
          </ol>
        </div>
      )}

      {status === 'connecting' && (
        <p className="mt-4 flex items-center gap-2 border-t border-void-border pt-4 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Talking to WhatsApp…
        </p>
      )}

      {status === 'connected' && (
        <p className="mt-4 flex items-center gap-2 border-t border-void-border pt-4 text-sm text-wire-on">
          <CheckCircle2 className="h-4 w-4" /> Linked. New customer messages to {formatPhone(state.phone) || 'this number'} are answered automatically.
        </p>
      )}

      {state.lastError && !linking && status !== 'connected' && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-amber">
          <RefreshCw className="h-3.5 w-3.5" /> {state.lastError}
        </p>
      )}
      {error && <p className="mt-3 text-xs text-rose">{error}</p>}

      <p className="mt-4 flex items-start gap-1.5 text-[11px] leading-relaxed text-ink-faint">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
        QR linking is unofficial (WhatsApp Web protocol). WhatsApp can restrict numbers that send spam or bulk messages, so only
        reply to people who message you first — or use the official WhatsApp Cloud API above for zero ban risk.
      </p>
    </div>
  );
}
