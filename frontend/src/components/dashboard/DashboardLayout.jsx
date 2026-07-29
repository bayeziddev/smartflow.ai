import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, KeyRound, Radio, Receipt, LogOut, MessagesSquare, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from '../shared/Logo.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/dashboard/conversations', label: 'Conversations', Icon: MessagesSquare },
  { to: '/dashboard/secrets', label: 'API Keys', Icon: KeyRound },
  { to: '/dashboard/channels', label: 'Channels', Icon: Radio },
  { to: '/dashboard/orders', label: 'Orders', Icon: Receipt },
];

export default function DashboardLayout() {
  const { logout, isPlatformAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-void-border bg-void-surface/50 sm:flex">
        <div className="flex h-16 items-center gap-2 border-b border-void-border px-6">
          <Logo size={26} wordmarkClassName="text-sm" />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  isActive ? 'bg-void-elevated text-signal' : 'text-ink-muted hover:bg-void-elevated/60 hover:text-ink'
                }`
              }
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {label}
            </NavLink>
          ))}

          {isPlatformAdmin && (
            <>
              <div className="my-2 border-t border-void-border" />
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">Owner only</p>
              <NavLink
                to="/dashboard/admin/clients"
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive ? 'bg-void-elevated text-intel' : 'text-ink-muted hover:bg-void-elevated/60 hover:text-ink'
                  }`
                }
              >
                <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
                Clients
              </NavLink>
            </>
          )}
        </nav>

        <div className="border-t border-void-border p-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-void-elevated/60 hover:text-rose"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 bg-void">
        <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
