import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  PenTool,
  Settings,
  User,
  LogOut,
  Calendar,
  Briefcase,
  Search,
  Video,
  Award,
  Megaphone,
  Menu,
  X,
  Library,
  FolderHeart
} from 'lucide-react';
import { useRole, UserRole } from '../../context/RoleContext';
import { useAuth } from '../../context/AuthContext';
import { MobileBottomNav } from './MobileBottomNav';
import { NotificationDropdown } from './NotificationDropdown';

export const Layout: React.FC = () => {
  const { role, setRole } = useRole();
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  type ThemeColor = 'emerald' | 'blue' | 'purple' | 'orange' | 'gray';

  const NavItem = ({ to, icon: Icon, label, theme = 'emerald' }: { to: string, icon: any, label: string, theme?: ThemeColor }) => {
    const activeStyles: Record<ThemeColor, string> = {
      emerald: 'bg-emerald-50 text-emerald-600 border-r-4 border-emerald-600',
      blue: 'bg-blue-50 text-blue-600 border-r-4 border-blue-600',
      purple: 'bg-purple-50 text-purple-600 border-r-4 border-purple-600',
      orange: 'bg-orange-50 text-orange-600 border-r-4 border-orange-600',
      gray: 'bg-gray-100 text-gray-800 border-r-4 border-gray-600'
    };

    const hoverStyles: Record<ThemeColor, string> = {
      emerald: 'hover:bg-emerald-50',
      blue: 'hover:bg-blue-50',
      purple: 'hover:bg-purple-50',
      orange: 'hover:bg-orange-50',
      gray: 'hover:bg-gray-100'
    };

    const iconActiveStyles: Record<ThemeColor, string> = {
      emerald: 'text-emerald-600',
      blue: 'text-blue-600',
      purple: 'text-purple-600',
      orange: 'text-orange-600',
      gray: 'text-gray-600'
    };

    return (
      <Link
        to={to}
        onClick={() => setIsMobileMenuOpen(false)}
        className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
          isActive(to)
            ? activeStyles[theme]
            : `text-gray-600 hover:text-gray-900 ${hoverStyles[theme]}`
        }`}
      >
        <Icon className={`w-5 h-5 mr-3 ${isActive(to) ? iconActiveStyles[theme] : 'text-gray-400'}`} />
        {label}
      </Link>
    );
  };

  const NavGroupHeader = ({ title, theme = 'gray' }: { title: string, theme?: ThemeColor }) => {
    const textStyles: Record<ThemeColor, string> = {
      emerald: 'text-emerald-500',
      blue: 'text-blue-500',
      purple: 'text-purple-500',
      orange: 'text-orange-500',
      gray: 'text-gray-400'
    };

    return (
      <div className="px-6 py-2 mt-4 mb-1">
        <h3 className={`text-xs font-bold uppercase tracking-wider ${textStyles[theme]}`}>
          {title}
        </h3>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 transform ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-200 ease-in-out flex flex-col w-64 bg-white border-r border-gray-200 z-50`}
      >
        <div className="p-6 flex items-center justify-between space-x-2 border-b border-gray-100">
          <div className="flex items-center space-x-2">
            <img
              src="https://firebasestorage.googleapis.com/v0/b/umrah-app-f044e.firebasestorage.app/o/media%2Flogos%2F1779085845396_Logo%20Retali.png?alt=media&token=cc8558b7-4060-40b4-b85f-b6a615b9f641"
              alt="Mitra Retali"
              className="w-8 h-8 object-contain"
            />
            <h1 className="text-xl font-bold text-gray-800">Mitra Retali</h1>
          </div>
          <button
            className="md:hidden p-1 text-gray-500 hover:bg-gray-100 rounded-md"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-4 pb-4 space-y-0.5 flex-1 overflow-y-auto">
          {/* Overview Group */}
          <NavGroupHeader title="Overview" theme="emerald" />
          <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" theme="emerald" />

          {/* Sales & Partners Group */}
          <div className="mt-4 border-t border-gray-100 pt-2">
            <NavGroupHeader title="Sales & Partners" theme="blue" />
            <NavItem to="/leads" icon={Users} label="Leads CRM" theme="blue" />
            <NavItem to="/jamaah-aktif" icon={Award} label="Jamaah Aktif" theme="blue" />
            {(role === 'PUSAT' || role === 'CABANG') && (
              <NavItem to="/mitra" icon={Briefcase} label="Data Mitra" theme="blue" />
            )}
          </div>

          {/* Marketing & Content Group */}
          <div className="mt-4 border-t border-gray-100 pt-2">
            <NavGroupHeader title="Marketing & Content" theme="purple" />
            <NavItem to="/content" icon={PenTool} label="Content AI" theme="purple" />
            <NavItem to="/campaigns" icon={Megaphone} label="Campaign Planner" theme="purple" />
            <NavItem to="/campaign-library" icon={FolderHeart} label="Campaign Library" theme="purple" />
            <NavItem to="/schedule" icon={Calendar} label="Jadwal Posting" theme="purple" />
            {role === 'PUSAT' && (
              <NavItem to="/media" icon={Library} label="Media Library" theme="purple" />
            )}
            <NavItem to="/virtuallive" icon={Video} label="Virtual Live" theme="purple" />
          </div>

          {/* Communication & Research Group */}
          <div className="mt-4 border-t border-gray-100 pt-2">
            <NavGroupHeader title="Comm & Research" theme="orange" />
            <NavItem to="/inbox" icon={MessageSquare} label="Unified Inbox" theme="orange" />
            <NavItem to="/insights" icon={Search} label="Market Insights" theme="orange" />
          </div>

          {/* Settings Group */}
          <div className="mt-4 border-t border-gray-100 pt-2">
            <NavGroupHeader title="System" theme="gray" />
            <NavItem to="/settings" icon={Settings} label="Settings" theme="gray" />
          </div>
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
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30">
          <div className="flex items-center">
            {/* Mobile Hamburger Menu */}
            <button
              className="md:hidden mr-3 p-1 text-gray-600 hover:bg-gray-100 rounded-md"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-semibold text-gray-800 line-clamp-1">
              {location.pathname === '/dashboard' && 'Dashboard Overview'}
              {location.pathname === '/leads' && 'Leads Management'}
              {location.pathname === '/jamaah-aktif' && 'Jamaah Aktif'}
              {location.pathname === '/inbox' && 'Pesan Masuk'}
              {location.pathname === '/content' && 'Content Generator'}
              {location.pathname === '/campaigns' && 'Campaign Planner'}
              {location.pathname === '/campaign-library' && 'Campaign Library'}
              {location.pathname === '/schedule' && 'Jadwal Posting'}
              {location.pathname === '/virtuallive' && 'Virtual Live Studio'}
              {location.pathname === '/settings' && 'Settings & Integrations'}
              {location.pathname === '/mitra' && 'Data Mitra'}
              {location.pathname === '/insights' && 'Market Insights'}
              {location.pathname === '/media' && 'Media Library'}
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
