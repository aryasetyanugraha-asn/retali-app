import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  PenTool,
  Settings,
  User,
  LogOut,
  Calendar
} from 'lucide-react';
import { useRole, UserRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { MobileBottomNav } from './MobileBottomNav';
import { NotificationDropdown } from './NotificationDropdown';

export const Layout: React.FC = () => {
  const { role, setRole } = useRole();
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const NavItem = ({ to, icon: Icon, label }: { to: string, icon: any, label: string }) => (
    <Link
      to={to}
      className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
        isActive(to)
          ? 'bg-emerald-50 text-emerald-600 border-r-4 border-emerald-600'
          : 'text-gray-600 hover:bg-emerald-50 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-5 h-5 mr-3 ${isActive(to) ? 'text-emerald-600' : 'text-gray-400'}`} />
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 flex-shrink-0 fixed h-full z-10">
        <div className="p-6 flex items-center space-x-2 border-b border-gray-100">
          <img
            src="https://retali.id/wp-content/uploads/2024/09/Logo-HO-color-1.png"
            alt="Mitra Retali"
            className="w-8 h-8 object-contain"
          />
          <h1 className="text-xl font-bold text-gray-800">Mitra Retali</h1>
        </div>

        <nav className="mt-6 space-y-1 flex-1 overflow-y-auto">
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem to="/leads" icon={Users} label="Leads CRM" />
          <NavItem to="/inbox" icon={MessageSquare} label="Unified Inbox" />
          <NavItem to="/content" icon={PenTool} label="Content AI" />
          <NavItem to="/schedule" icon={Calendar} label="Jadwal Posting" />
          <NavItem to="/settings" icon={Settings} label="Settings" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center p-2 rounded-lg bg-gray-50 mb-2">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <User className="w-4 h-4 text-gray-500" />
              </div>
            )}
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-medium text-gray-700 truncate">
                {user?.displayName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center w-full px-2 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen pb-20 md:pb-0 transition-all">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-10">
          <div className="flex items-center">
            {/* Mobile Logo */}
            <div className="md:hidden mr-3">
              <img
                src="https://retali.id/wp-content/uploads/2024/09/Logo-HO-color-1.png"
                alt="Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 line-clamp-1">
              {location.pathname === '/dashboard' && 'Dashboard Overview'}
              {location.pathname === '/leads' && 'Leads Management'}
              {location.pathname === '/inbox' && 'Pesan Masuk'}
              {location.pathname === '/content' && 'Content Generator'}
              {location.pathname === '/schedule' && 'Jadwal Posting'}
              {location.pathname === '/settings' && 'Settings & Integrations'}
            </h2>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <div className="hidden md:flex items-center">
              <div className="text-sm text-gray-500 mr-2">View as:</div>
              <div className="flex bg-gray-100 p-1 rounded-lg">
                {(['PUSAT', 'CABANG', 'MITRA'] as UserRole[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                      role === r
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <NotificationDropdown />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </main>

        <MobileBottomNav />
      </div>
    </div>
  );
};
