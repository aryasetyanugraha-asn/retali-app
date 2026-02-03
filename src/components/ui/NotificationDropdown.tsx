import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle, UserPlus, Calendar, Info } from 'lucide-react';

interface Notification {
  id: number;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  type: 'lead' | 'post' | 'schedule' | 'system';
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    title: 'Lead Baru Masuk',
    desc: 'Seseorang menanyakan paket Ramadhan via WhatsApp.',
    time: '2 menit lalu',
    unread: true,
    type: 'lead'
  },
  {
    id: 2,
    title: 'Jadwal Terposting',
    desc: 'Konten "Tips Umrah" berhasil diposting ke Instagram.',
    time: '1 jam lalu',
    unread: true,
    type: 'post'
  },
  {
    id: 3,
    title: 'Pengingat Manasik',
    desc: 'Manasik akbar akan dilaksanakan besok pagi.',
    time: '3 jam lalu',
    unread: false,
    type: 'schedule'
  },
  {
    id: 4,
    title: 'Update Sistem',
    desc: 'Fitur generator flyer baru kini tersedia!',
    time: 'Kemarin',
    unread: false,
    type: 'system'
  },
];

export const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lead': return <UserPlus className="w-4 h-4 text-blue-600" />;
      case 'post': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'schedule': return <Calendar className="w-4 h-4 text-orange-600" />;
      default: return <Info className="w-4 h-4 text-purple-600" />;
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case 'lead': return 'bg-blue-100';
      case 'post': return 'bg-green-100';
      case 'schedule': return 'bg-orange-100';
      default: return 'bg-purple-100';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-fade-in origin-top-right">
          <div className="p-4 border-b border-gray-50 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-sm text-gray-800">Notifikasi</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-emerald-600 font-medium hover:underline">
                Tandai dibaca
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">Tidak ada notifikasi</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer flex items-start space-x-3 ${n.unread ? 'bg-emerald-50/50' : ''}`}
                >
                  <div className={`p-2 rounded-full shrink-0 ${getBgColor(n.type)}`}>
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-1">{n.title}</h4>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{n.time}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.desc}</p>
                  </div>
                  {n.unread && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0"></div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-2 border-t border-gray-50 text-center">
            <button className="text-xs text-gray-500 hover:text-emerald-600 font-medium w-full py-1">
              Lihat Semua
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
