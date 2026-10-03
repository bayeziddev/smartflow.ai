import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, checking } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 bg-void text-sm text-ink-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Checking your session…
      </div>
    );
  }
  return children;
}
