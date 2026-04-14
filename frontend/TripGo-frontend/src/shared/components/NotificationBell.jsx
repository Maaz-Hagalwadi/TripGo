import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';

const TYPE_ICON = {
  BOOKING_CONFIRMED: '🎉',
  BOOKING_CANCELLED: '❌',
  PAYMENT_FAILED: '⚠️',
  NEW_BOOKING: '📋',
  REVIEW_RECEIVED: '⭐',
  REVIEW_SUBMITTED: '✅',
  TRIP_COMPLETED: '🏁',
  BUS_APPROVED: '✅',
  BUS_REJECTED: '❌',
  OPERATOR_PENDING: '📄',
  BUS_PENDING: '🚌',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const visibleNotifications = notifications.filter((notification) => !notification.isRead);

  useEffect(() => {
    const handler = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const handleClick = (notification) => {
    if (!notification.isRead) markRead(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 5 ? '5+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-bold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {visibleNotifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">No new notifications</div>
            ) : (
              visibleNotifications.slice(0, 20).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleClick(notification)}
                  className="flex cursor-pointer gap-3 border-b border-slate-50 bg-blue-50/50 px-4 py-3 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-blue-900/10 dark:hover:bg-slate-800"
                >
                  <span className="mt-0.5 text-xl">{TYPE_ICON[notification.type] || '🔔'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {notification.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{notification.message}</p>
                    <p className="mt-1 text-[10px] text-slate-400">
                      {new Date(notification.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
