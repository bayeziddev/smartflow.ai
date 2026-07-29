import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const { setTokenDirectly } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setTokenDirectly(token);
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, setTokenDirectly, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-ink-muted">
      <Loader2 className="h-4 w-4 animate-spin" />
      Finishing sign-in…
    </div>
  );
}
