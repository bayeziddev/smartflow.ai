import React, { useEffect, useState } from 'react';
import { ShieldCheck, Download, Loader2 } from 'lucide-react';
import { fetchAllClients, exportClientsUrl } from '../../services/api';

export default function AdminClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAllClients()
      .then((data) => {
        setClients(data.clients);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.status === 403 ? 'This page is for the platform owner only.' : 'Could not load clients.');
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-intel" strokeWidth={1.75} />
          <h1 className="font-display text-2xl font-semibold text-ink">Clients</h1>
        </div>
        {!error && (
          <a href={exportClientsUrl()} className="btn-ghost !py-2 !px-4 text-sm">
            <Download className="h-4 w-4" />
            Export to Excel
          </a>
        )}
      </div>
      <p className="mb-8 text-sm text-ink-muted">Every business that's signed up for SmartGen — visible to you only.</p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading clients…
        </div>
      ) : error ? (
        <div className="panel p-8 text-center text-sm text-rose">{error}</div>
      ) : (
        <div className="panel overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-void-border bg-void-elevated/50 text-xs uppercase tracking-wide text-ink-faint">
              <tr>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Company</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Signed up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-void-border">
              {clients.map((client) => (
                <tr key={client.id} className="transition-colors hover:bg-void-elevated/30">
                  <td className="px-5 py-3 text-ink">{client.full_name || '—'}</td>
                  <td className="px-5 py-3 font-mono text-xs text-ink-muted">{client.email}</td>
                  <td className="px-5 py-3 text-ink-muted">{client.company_name || '—'}</td>
                  <td className="px-5 py-3">
                    <span className="rounded-full bg-void-elevated px-2.5 py-1 text-xs capitalize text-ink-muted">{client.plan}</span>
                  </td>
                  <td className="px-5 py-3 text-ink-faint">{new Date(client.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
