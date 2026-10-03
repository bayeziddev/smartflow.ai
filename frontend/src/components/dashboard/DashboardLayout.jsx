import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, KeyRound, Radio, Receipt, LogOut, MessagesSquare, ShieldCheck, Bot, UserCircle, Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import Logo from '../shared/Logo.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/dashboard/automation', label: 'Automation', Icon: Bot },
  { to: '/dashboard/channels', label: 'Channels', Icon: Radio },
  { to: '/dashboard/conversations', label: 'Conversations', Icon: MessagesSquare },
  { to: '/dashboard/orders', label: 'Orders', Icon: Receipt },
  { to: '/dashboard/secrets', label: 'API Keys', Icon: KeyRound },
  { to: '/dashboard/account', label: 'Account', Icon: UserCircle },
];

export default function DashboardLayout() {
  const { logout, isPlatformAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the phone menu after navigating.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Phone/tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-void-border bg-void-surface/95 px-4 backdrop-blur md:hidden">
        <Logo size={24} wordmarkClassName="text-sm" />
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded-lg p-2 text-ink-muted hover:bg-void-elevated hover:text-ink"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>
      {menuOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMenuOpen(false)} />}

      <aside
        className={`${
          menuOpen ? 'flex' : 'hidden'
        } fixed inset-y-0 left-0 z-40 w-64 shrink-0 flex-col border-r border-void-border bg-void-surface md:sticky md:top-0 md:flex md:h-screen md:w-60 md:bg-void-surface/50`}
      >
        <div className="flex h-16 items-center gap-2 border-b border-void-border px-6">
          <Logo size={26} wordmarkClassName="text-sm" />
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
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
          {user && (
            <div className="mb-2 px-3" data-testid="signed-in-as">
              <p className="truncate text-sm text-ink">{user.fullName}</p>
              <p className="truncate text-xs text-ink-faint">{user.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-ink-muted transition-colors hover:bg-void-elevated/60 hover:text-rose"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 bg-void">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
