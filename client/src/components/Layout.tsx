import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth';
import {
  Gem,
  LayoutDashboard,
  Briefcase,
  CreditCard,
  FileText,
  Sparkles,
  BarChart2,
  PieChart,
  User,
  ShieldCheck,
  LogOut,
} from 'lucide-react';

const nav = [
  { to: '/dashboard',   label: 'Dashboard',   Icon: LayoutDashboard },
  { to: '/assets',      label: 'Assets',      Icon: Briefcase       },
  { to: '/portfolio',   label: 'Portfolio',   Icon: PieChart        },
  { to: '/liabilities', label: 'Liabilities', Icon: CreditCard      },
  { to: '/documents',   label: 'Documents',   Icon: FileText        },
  { to: '/flo',         label: 'Flo',         Icon: Sparkles        },
  { to: '/analytics',   label: 'Analytics',   Icon: BarChart2       },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-1">

      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-56 flex-col bg-surface-1 border-r border-gray-100 shadow-sidebar flex-shrink-0">

        {/* Logo */}
        <div className="flex h-16 items-center gap-2.5 px-5 border-b border-gray-100">
          <Gem className="h-5 w-5 text-brand-600 flex-shrink-0" />
          <span className="text-xl font-bold tracking-tight text-gray-900">LegacyOS</span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
          {nav.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="border-t border-gray-100 p-3 space-y-0.5">
          <div className="px-3 py-2 mb-1">
            <p className="truncate text-xs font-medium text-gray-500 mb-1.5">{user?.email}</p>
            <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700 capitalize">
              {user?.plan}
            </span>
          </div>

          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <User className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
                Profile &amp; Goals
              </>
            )}
          </NavLink>

          {user?.isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <ShieldCheck className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
                  Admin Panel
                </>
              )}
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-500 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700"
          >
            <LogOut className="h-4 w-4 flex-shrink-0 text-gray-400" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      {/* On mobile: add bottom padding so content clears the bottom nav */}
      <main className="flex-1 overflow-y-auto bg-surface-1 pb-16 md:pb-0">
        <Outlet />
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-stretch">
        {nav.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                isActive ? 'text-brand-600' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={`h-5 w-5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
                <span className="leading-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}
        {/* Profile link in bottom nav */}
        <NavLink
          to="/profile"
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              isActive ? 'text-brand-600' : 'text-gray-400'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <User className={`h-5 w-5 ${isActive ? 'text-brand-600' : 'text-gray-400'}`} />
              <span className="leading-tight">Profile</span>
            </>
          )}
        </NavLink>
      </nav>
    </div>
  );
}
