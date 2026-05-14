import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '◈', end: true },
  { to: '/assets', label: 'Assets', icon: '◆', end: false },
  { to: '/documents', label: 'Documents', icon: '◉', end: false },
  { to: '/flo', label: 'Flo AI', icon: '◎', end: false },
  { to: '/billing', label: 'Plan', icon: '◇', end: false },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-black/10 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-black/10">
          <div className="text-base font-medium text-ink">LegacyOS</div>
          <div className="text-xs text-muted mt-0.5">Family Wealth OS</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-flo-50 text-flo-700 font-medium'
                    : 'text-muted hover:bg-black/5 hover:text-ink'
                }`
              }
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-black/10">
          <div className="text-xs text-ink font-medium truncate">{user?.full_name}</div>
          <div className="text-xs text-muted truncate">{user?.email}</div>
          <div className="mt-1">
            <span className="inline-block text-xs px-1.5 py-0.5 rounded bg-flo-50 text-flo-700 capitalize">
              {user?.plan || 'free'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-muted hover:text-ink transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
