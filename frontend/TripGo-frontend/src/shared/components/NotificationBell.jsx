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
  const visibleNotifications = notifications.filter((n) => !n.isRead);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Lock body scroll when mobile sheet is open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!user) return null;

  const handleClick = (notification) => {
    if (!notification.isRead) markRead(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const Header = (
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">Notifications</span>
        {unreadCount > 0 && (
          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {unreadCount > 5 ? '5+' : unreadCount}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-primary hover:underline">
            Mark all read
          </button>
        )}
        {/* Close button — visible on mobile */}
        <button
          onClick={() => setOpen(false)}
          className="flex items-center justify-center rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 sm:hidden"
        >
          <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 18 }}>close</span>
        </button>
      </div>
    </div>
  );

  const List = (
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 52px)' }}>
      {visibleNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3">notifications_off</span>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">You're all caught up!</p>
          <p className="text-xs text-slate-400 mt-1">No new notifications</p>
        </div>
      ) : (
        visibleNotifications.slice(0, 20).map((notification) => (
          <div
            key={notification.id}
            onClick={() => handleClick(notification)}
            className="flex cursor-pointer gap-3 border-b border-slate-50 bg-blue-50/50 px-4 py-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-800 dark:bg-blue-900/10 dark:hover:bg-slate-800"
          >
            <span className="mt-0.5 text-xl flex-shrink-0">{TYPE_ICON[notification.type] || '🔔'}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                {notification.title}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {notification.message}
              </p>
              <p className="mt-1.5 text-[10px] text-slate-400">
                {new Date(notification.createdAt).toLocaleString()}
              </p>
            </div>
            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-full p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 5 ? '5+' : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop dropdown */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 hidden w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900 sm:block">
          {Header}
          <div className="max-h-96 overflow-y-auto">{List}</div>
        </div>
      )}

      {/* Mobile full-screen bottom sheet */}
      {open && (
        <div className="fixed inset-0 z-[9998] sm:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Sheet */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col rounded-t-2xl bg-white dark:bg-slate-900 shadow-2xl"
            style={{ maxHeight: '85vh' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            {Header}
            {List}
          </div>
        </div>
      )}
    </div>
  );
}
