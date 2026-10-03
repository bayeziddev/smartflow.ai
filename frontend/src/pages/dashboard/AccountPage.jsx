import React, { useState } from 'react';
import { UserCircle, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { changePassword, errorMessage } from '../../services/api';

export default function AccountPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNotice('');
    if (form.newPassword !== form.confirm) {
      setError('The two new passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      await changePassword(form.currentPassword, form.newPassword);
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      setNotice('Password changed.');
    } catch (err) {
      setError(errorMessage(err, 'Could not change your password.'));
    } finally {
      setSaving(false);
    }
  }

  const rows = user
    ? [
        ['Name', user.fullName],
        ['Email', user.email],
        ['Company', user.companyName || '—'],
        ['Plan', user.plan || 'free'],
        ['Member since', user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'],
      ]
    : [];

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <UserCircle className="h-5 w-5 text-signal" strokeWidth={1.75} />
        <h1 className="font-display text-2xl font-semibold text-ink">Account</h1>
      </div>
      <p className="mb-8 text-sm text-ink-muted">Your sign-in details.</p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="panel p-6">
          <h2 className="mb-4 font-display text-base font-semibold text-ink">Profile</h2>
          {user ? (
            <dl className="space-y-3 text-sm" data-testid="account-profile">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="truncate text-right text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="flex items-center gap-2 text-sm text-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="panel space-y-3.5 p-6">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-ink">
            <KeyRound className="h-4 w-4 text-signal" /> Change password
          </h2>
          <input type="text" name="username" autoComplete="username" value={user?.email || ''} readOnly hidden />
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">Current password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              className="field-input"
              value={form.currentPassword}
              onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">New password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field-input"
              value={form.newPassword}
              onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
              placeholder="At least 8 characters"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-muted">Repeat new password</span>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="field-input"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </label>
          {error && <p className="text-sm text-rose">{error}</p>}
          {notice && <p className="text-sm text-wire-on">{notice}</p>}
          <button type="submit" disabled={saving} className="btn-primary w-full !py-2 text-sm disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
