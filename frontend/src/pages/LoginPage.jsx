import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Loader2 } from 'lucide-react';
import AuthLayout from '../components/shared/AuthLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not sign in. Check your details and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Sign in" subtitle="Route your channels through your own AI keys.">
      <form onSubmit={handleSubmit} className="space-y-3.5">
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
            className="field-input"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-rose">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
          Sign in
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-faint">
        <div className="h-px flex-1 bg-void-border" />
        or
        <div className="h-px flex-1 bg-void-border" />
      </div>

      <a href="/api/auth/manus/login" className="btn-ghost w-full !border-void-border text-sm">
        Sign in with Manus
      </a>
      <p className="mt-2 text-center text-xs text-ink-faint">Manus is an optional AI account — most people just use email above.</p>

      <p className="mt-6 text-center text-sm text-ink-muted">
        New here?{' '}
        <Link to="/register" className="text-signal hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
