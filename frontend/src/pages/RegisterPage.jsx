import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, Loader2 } from 'lucide-react';
import AuthLayout from '../components/shared/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', companyName: '', email: '', password: '' });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!agreed) {
      setError('Please agree to the policies below to create an account.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not create your account. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="3-day free trial, no card required — add your own AI key when you're ready."
    >
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Full name</label>
          <input
            required
            className="field-input"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Bayezid Ahmed"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Company (optional)</label>
          <input
            className="field-input"
            value={form.companyName}
            onChange={(e) => setForm({ ...form, companyName: e.target.value })}
            placeholder="Your business name"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Email</label>
          <input
            type="email"
            required
            className="field-input"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-ink-muted">Password</label>
          <input
            type="password"
            required
            minLength={8}
            className="field-input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="At least 8 characters"
          />
        </div>

        <label className="flex items-start gap-2.5 text-xs text-ink-muted">
          <input
            type="checkbox"
            required
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-void-border bg-void text-signal focus:ring-signal/50"
          />
          <span>
            I agree to the{' '}
            <Link to="/terms" target="_blank" className="text-signal hover:underline">
              Terms
            </Link>
            ,{' '}
            <Link to="/privacy" target="_blank" className="text-signal hover:underline">
              Privacy Policy
            </Link>
            ,{' '}
            <Link to="/refund-policy" target="_blank" className="text-signal hover:underline">
              Refund Policy
            </Link>{' '}
            and{' '}
            <Link to="/payment-terms" target="_blank" className="text-signal hover:underline">
              Payment Terms
            </Link>
            .
          </span>
        </label>

        {error && <p className="text-sm text-rose">{error}</p>}

        <button type="submit" disabled={loading || !agreed} className="btn-primary w-full disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
          Create account
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
        <div className="h-px flex-1 bg-void-border" />
        or
        <div className="h-px flex-1 bg-void-border" />
      </div>

      <a href="/api/auth/manus/login" className="btn-ghost w-full !border-void-border text-sm">
        Continue with Manus
      </a>
      <p className="mt-2 text-center text-xs text-ink-faint">Manus is an optional AI account — most people just use email above.</p>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have one?{' '}
        <Link to="/login" className="text-signal hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
