import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useClickOutside from '../../hooks/useClickOutside';

const NOTIFICATIONS = [
  { id: 1, message: 'New booking received for Route TRP-102', time: '10 min ago', unread: true },
  { id: 2, message: 'Bus TRP-088 maintenance scheduled', time: '1 hour ago', unread: true },
  { id: 3, message: 'Monthly revenue report available', time: '2 hours ago', unread: false },
];

const OperatorHeader = ({ title, searchPlaceholder = 'Search buses, routes, or bookings...', children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  useClickOutside(notificationRef, () => setShowNotifications(false));
  useClickOutside(profileRef, () => setShowProfileDropdown(false));

  const unreadCount = NOTIFICATIONS.filter(n => n.unread).length;

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-op-bg flex items-center justify-between px-4 lg:px-8 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        <h2 className="text-lg font-semibold capitalize">{title}</h2>
        <div className="operator-search relative max-w-md w-full ml-4">
          <span className="material-symbols-outlined absolute left-3 top-[11px] text-slate-400 text-[18px]">search</span>
          <input
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
            placeholder={searchPlaceholder}
            type="text"
          />
        </div>
        {children}
      </div>

      <div className="flex items-center gap-6">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(p => !p)}
            className="relative text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-sm">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id} className={`p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${n.unread ? 'bg-primary/5' : ''}`}>
                    <p className="text-sm mb-1">{n.message}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{n.time}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-800 relative" ref={profileRef}>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-500">Fleet Manager</p>
          </div>
          <button
            onClick={() => setShowProfileDropdown(p => !p)}
            className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">person</span>
          </button>
          {showProfileDropdown && (
            <div className="absolute right-0 top-12 w-64 bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 text-xl">person</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="py-2">
                <button className="w-full px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">person</span>
                  My Profile
                </button>
                <button className="w-full px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3">
                  <span className="material-symbols-outlined text-lg">settings</span>
                  Settings
                </button>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 p-2">
                <button
                  onClick={async () => { await logout(); navigate('/'); }}
                  className="w-full px-4 py-3 text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-3 rounded-lg"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default OperatorHeader;
