import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Map, Settings, Tags, Ticket, Users } from 'lucide-react';
import { logout, currentUser } from '@/lib/pocketbase';

const nav = [
  { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
  { label: 'Tours', to: '/admin/tours', icon: Map },
  { label: 'Categories', to: '/admin/categories', icon: Tags },
  { label: 'Bookings', to: '/admin/bookings', icon: Ticket },
  { label: 'Users', to: '/admin/users', icon: Users },
  { label: 'Settings', to: '/admin/settings', icon: Settings },
];

export function AdminLayout() {
  const navigate = useNavigate();
  const user = currentUser();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="relative w-64 border-r border-gray-200 bg-white">
        <div className="flex h-16 items-center border-b border-gray-200 px-6">
          <span className="text-lg font-semibold text-gray-900">Travel Admin</span>
        </div>
        <nav className="space-y-1 p-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-gray-200 p-4">
          <div className="mb-3 px-3">
            <p className="truncate text-xs font-medium text-gray-900">{user?.email || 'Admin'}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-500">{user?.role || 'admin'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
