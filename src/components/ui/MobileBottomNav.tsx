import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, PenTool, MessageSquare, Calendar } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  const navItems = [
    { id: 'home', path: '/dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'leads', path: '/leads', label: 'Jamaah', icon: Users },
    { id: 'create', path: '/content', label: 'Buat', icon: PenTool, special: true },
    { id: 'chat', path: '/inbox', label: 'Chat', icon: MessageSquare },
    { id: 'schedule', path: '/schedule', label: 'Jadwal', icon: Calendar },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center px-2 py-2 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      {navItems.map((item) => {
        const active = isActive(item.path);
        const Icon = item.icon;

        if (item.special) {
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center -mt-8 group"
            >
              <div
                className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform group-active:scale-95 ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-gray-200 text-emerald-600'
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <span className={`text-[10px] mt-1 font-medium ${active ? 'text-emerald-600' : 'text-gray-400'}`}>
                {item.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center p-2 rounded-lg transition-colors ${
              active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] mt-1 font-medium">
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
