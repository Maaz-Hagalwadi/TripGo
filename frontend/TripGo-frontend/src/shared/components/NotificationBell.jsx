import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../hooks/useNotifications';
import { useAuth } from '../contexts/AuthContext';

const TYPE_ICON = {
  BOOKING_CONFIRMED:  { icon: 'confirmation_number', color: 'text-emerald-600 bg-emerald-50' },
  BOOKING_CANCELLED:  { icon: 'cancel',              color: 'text-rose-600 bg-rose-50' },
  PAYMENT_FAILED:     { icon: 'error',               color: 'text-amber-600 bg-amber-50' },
  NEW_BOOKING:        { icon: 'confirmation_number', color: 'text-sky-600 bg-sky-50' },
  REVIEW_RECEIVED:    { icon: 'star',                color: 'text-amber-500 bg-amber-50' },
  REVIEW_SUBMITTED:   { icon: 'task_alt',            color: 'text-emerald-600 bg-emerald-50' },
  TRIP_COMPLETED:     { icon: 'check_circle',        color: 'text-sky-600 bg-sky-50' },
  BUS_APPROVED:       { icon: 'verified',            color: 'text-emerald-600 bg-emerald-50' },
  BUS_REJECTED:       { icon: 'cancel',              color: 'text-rose-600 bg-rose-50' },
  OPERATOR_PENDING:   { icon: 'pending',             color: 'text-amber-600 bg-amber-50' },
  BUS_PENDING:        { icon: 'directions_bus',      color: 'text-slate-600 bg-slate-100' },
  REFUND_INITIATED:   { icon: 'currency_rupee',      color: 'text-amber-600 bg-amber-50' },
  REFUND_PROCESSED:   { icon: 'payments',            color: 'text-emerald-600 bg-emerald-50' },
};

const timeAgo = (value) => {
  const ms = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(ms)) return '';
  const mins = Math.round(ms / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export default function NotificationBell() {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(user);
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const visibleNotifications = showAll ? notifications : notifications.filter((n) => !n.isRead);

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
    <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-900 dark:text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[#FF8A65] px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs font-bold text-primary hover:text-[#FF8A65] transition-colors dark:text-[#FDBA74]">
              Mark all read
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 sm:hidden"
          >
            <span className="material-symbols-outlined text-slate-500" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>
      </div>
      {notifications.length > 0 && (
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setShowAll(false)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${!showAll ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            Unread {unreadCount > 0 ? `(${unreadCount})` : ''}
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${showAll ? 'bg-primary text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
          >
            All ({notifications.length})
          </button>
        </div>
      )}
    </div>
  );

  const List = (
    <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 52px)' }}>
      {visibleNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="mb-3 w-14 h-14 rounded-2xl bg-[#FDBA74]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-orange-600">
              {notifications.length > 0 ? 'done_all' : 'notifications'}
            </span>
          </span>
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
            {notifications.length > 0 ? "You're all caught up!" : 'No notifications yet'}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {notifications.length > 0 ? 'Switch to "All" to see past notifications' : "We'll notify you of booking updates here"}
          </p>
        </div>
      ) : (
        visibleNotifications.slice(0, 30).map((notification) => {
          const meta = TYPE_ICON[notification.type] || { icon: 'notifications', color: 'text-slate-600 bg-slate-100' };
          return (
            <div
              key={notification.id}
              onClick={() => handleClick(notification)}
              className={`flex cursor-pointer gap-3 border-b border-slate-50 px-4 py-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 ${notification.isRead ? 'opacity-60' : 'bg-[#FFF7F2] dark:bg-[#FF8A65]/10'}`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.color}`}>
                <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-snug ${notification.isRead ? 'font-medium text-slate-600 dark:text-slate-400' : 'font-semibold text-slate-900 dark:text-white'}`}>
                  {notification.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {notification.message}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-slate-400" title={new Date(notification.createdAt).toLocaleString('en-IN')}>
                  {timeAgo(notification.createdAt)}
                </p>
              </div>
              {!notification.isRead && (
                <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-[#FF8A65]" aria-label="Unread" />
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        aria-expanded={open}
        className={`relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
          open
            ? 'border-primary bg-primary text-white'
            : 'border-slate-200 bg-white text-slate-600 hover:border-[#FF8A65] hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
        }`}
      >
        <span className="material-symbols-outlined text-[22px]" style={unreadCount > 0 || open ? { fontVariationSettings: "'FILL' 1" } : undefined}>
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] px-1 text-[10px] font-black text-primary ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Desktop dropdown */}
      {open && (
        <div className="absolute right-0 z-50 mt-2 hidden w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-900 sm:block">
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
