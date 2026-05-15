import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getBuses } from '../../../api/busService';
import { getOperatorDashboard } from '../../../api/routeService';
import { getOperatorBookings } from '../../../api/operatorBookingService';
import { ROUTES } from '../../../shared/constants/routes';

const fmt = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const normalizeList = (resp) => {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.content)) return resp.content;
  if (Array.isArray(resp?.data)) return resp.data;
  return [];
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

const toDisplayBookingId = (booking) => {
  const raw = String(booking?.publicBookingId || booking?.bookingCode || booking?.bookingId || booking?.id || '').trim();
  if (!raw) return '--';
  if (raw.startsWith('TG-')) return raw;
  const compact = raw.replace(/-/g, '').slice(0, 8).toUpperCase();
  return compact ? `TG-${compact}` : raw;
};

const getBookingStatus = (booking) => {
  const s = String(booking?.status || '').toUpperCase();
  if (s === 'CONFIRMED') return { label: 'Confirmed', cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
  if (s === 'CANCELLED') return { label: 'Cancelled', cls: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' };
  return { label: s || 'Pending', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-400' };
};

const QUICK_ACTIONS = [
  { label: 'Add Bus',       icon: 'directions_bus', route: ROUTES.OPERATOR_ADD_BUS,    color: 'bg-[#002046]/[0.07] text-[#002046]' },
  { label: 'Create Route',  icon: 'add_road',       route: ROUTES.OPERATOR_CREATE_ROUTE, color: 'bg-emerald-50 text-emerald-700' },
  { label: 'Schedules',     icon: 'calendar_month', route: ROUTES.OPERATOR_SCHEDULES,  color: 'bg-sky-50 text-sky-700' },
  { label: 'Bookings',      icon: 'confirmation_number', route: ROUTES.OPERATOR_BOOKINGS, color: 'bg-violet-50 text-violet-700' },
  { label: 'Drivers',       icon: 'badge',          route: ROUTES.OPERATOR_DRIVERS,    color: 'bg-amber-50 text-amber-700' },
  { label: 'Earnings',      icon: 'payments',       route: ROUTES.OPERATOR_EARNINGS,   color: 'bg-rose-50 text-rose-600' },
];

/* ── Suspended screen ── */
const SuspendedScreen = () => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
    <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-10 max-w-md w-full text-center shadow-sm">
      <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-orange-500 text-2xl">block</span>
      </div>
      <h2 className="text-lg font-extrabold text-slate-900 mb-2">Account Suspended</h2>
      <p className="text-sm text-slate-500 leading-relaxed">
        Your operator account has been suspended. Contact{' '}
        <a href="mailto:support@tripgo.com" className="text-[#002046] font-semibold hover:underline">support@tripgo.com</a>
      </p>
    </div>
  </div>
);

/* ── Suspended modal (logged-in detection) ── */
const SuspendedModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white ring-1 ring-slate-200 rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
      <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-orange-500 text-xl">block</span>
      </div>
      <h2 className="text-base font-extrabold text-slate-900 mb-2">Account Suspended</h2>
      <p className="text-sm text-slate-500 mb-5">Please contact support@tripgo.com for assistance.</p>
      <button onClick={onClose} className="px-6 py-2.5 bg-[#002046] text-white font-bold rounded-xl hover:bg-[#003a80] transition-colors text-sm">
        Go to Login
      </button>
    </div>
  </div>
);

/* ── Skeleton pulse ── */
const Pulse = ({ w = 'w-16', h = 'h-8' }) => (
  <div className={`${w} ${h} bg-white/20 rounded animate-pulse`} />
);

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, suspendedWhileLoggedIn, setSuspendedWhileLoggedIn } = useAuth();

  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(true);

  const [stats, setStats] = useState({ totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, totalRevenue: 0, totalBuses: 0, totalRoutes: 0 });
  const [loadingStats, setLoadingStats] = useState(true);

  const [recentBookings, setRecentBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || (user.role && user.role !== 'OPERATOR')) navigate(ROUTES.DASHBOARD, { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchBuses();
    fetchStats();
    fetchRecentBookings();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoadingBuses(true);
      setBuses(await getBuses() || []);
    } catch { setBuses([]); }
    finally { setLoadingBuses(false); }
  };

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const [dashboard, allResp, cancelResp] = await Promise.all([
        getOperatorDashboard(),
        getOperatorBookings(),
        getOperatorBookings('CANCELLED'),
      ]);
      const all       = normalizeList(allResp);
      const cancelled = normalizeList(cancelResp);
      const total     = all.length || Number(dashboard?.totalBookings || 0);
      const canc      = cancelled.length || Number(dashboard?.cancelledBookings || 0);
      setStats({
        totalBookings:     total,
        confirmedBookings: Number(dashboard?.confirmedBookings ?? Math.max(total - canc, 0)),
        cancelledBookings: canc,
        totalRevenue:      Number(dashboard?.totalRevenue || 0),
        totalBuses:        Number(dashboard?.totalBuses || 0),
        totalRoutes:       Number(dashboard?.totalRoutes || 0),
      });
    } catch {
      setStats({ totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, totalRevenue: 0, totalBuses: 0, totalRoutes: 0 });
    } finally { setLoadingStats(false); }
  };

  const fetchRecentBookings = async () => {
    try {
      setLoadingBookings(true);
      const data = normalizeList(await getOperatorBookings());
      setRecentBookings(data.slice(0, 8));
    } catch { setRecentBookings([]); }
    finally { setLoadingBookings(false); }
  };

  if (!loading && user?.operatorStatus === 'SUSPENDED') return <SuspendedScreen />;

  const activeBuses  = buses.filter(b => b.active).length;
  const pendingBuses = buses.length - activeBuses;
  const totalBuses   = buses.length > 0 ? buses.length : stats.totalBuses;

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Operator';

  const KPI_CARDS = [
    { label: 'Total Revenue',      value: loadingStats ? null : fmt(stats.totalRevenue),       sub: 'all time',              icon: 'payments',             grad: 'from-[#002046] via-[#003a80] to-[#001224]', light: false },
    { label: 'Confirmed Bookings', value: loadingStats ? null : stats.confirmedBookings,        sub: `${stats.cancelledBookings} cancelled`, icon: 'confirmation_number', iconColor: 'text-emerald-600', iconBg: 'bg-emerald-50', light: true },
    { label: 'Total Buses',        value: loadingBuses ? null : totalBuses,                     sub: `${activeBuses} active · ${pendingBuses} pending`, icon: 'directions_bus', grad: 'from-[#1e1b4b] via-[#3730a3] to-[#0f0c29]', light: false },
    { label: 'Routes',             value: loadingStats ? null : stats.totalRoutes,              sub: 'configured routes',     icon: 'route',                iconColor: 'text-[#002046]', iconBg: 'bg-[#002046]/[0.07]', light: true },
  ];

  return (
    <OperatorLayout activeItem="overview" title="Overview">
      {suspendedWhileLoggedIn && (
        <SuspendedModal onClose={() => { setSuspendedWhileLoggedIn(false); navigate(ROUTES.LOGIN); }} />
      )}

      <div className="space-y-5">

        {/* Header */}
        <div>
          <p className="text-sm text-slate-400 font-medium">{getGreeting()},</p>
          <h1 className="text-2xl font-black text-slate-900">{firstName}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {KPI_CARDS.map((card) => (
            card.light ? (
              <div key={card.label} className="rounded-2xl bg-white ring-1 ring-slate-200 p-3 sm:p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 sm:mb-2">{card.label}</p>
                    {card.value === null ? (
                      <div className="w-16 h-8 bg-slate-100 rounded animate-pulse" />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-black text-slate-900">{card.value}</p>
                    )}
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-1.5 truncate">{card.sub}</p>
                  </div>
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl ${card.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`material-symbols-outlined text-sm sm:text-base ${card.iconColor}`}>{card.icon}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div key={card.label} className={`rounded-2xl bg-gradient-to-br ${card.grad} p-3 sm:p-5 text-white shadow-sm relative overflow-hidden`}>
                <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">{card.label}</p>
                    {card.value === null ? (
                      <Pulse />
                    ) : (
                      <p className="text-2xl sm:text-3xl font-black">{card.value}</p>
                    )}
                    <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5 truncate">{card.sub}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-white text-sm sm:text-base">{card.icon}</span>
                  </div>
                </div>
              </div>
            )
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Recent bookings — 2/3 width */}
          <div className="xl:col-span-2 rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <p className="text-sm font-black text-slate-900">Recent Bookings</p>
              <button
                onClick={() => navigate(ROUTES.OPERATOR_BOOKINGS)}
                className="text-xs font-semibold text-[#002046] hover:underline flex items-center gap-1"
              >
                View all
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>

            {loadingBookings ? (
              <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-400">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
                Loading bookings...
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-200">confirmation_number</span>
                <p className="mt-3 text-sm font-semibold text-slate-500">No bookings yet</p>
                <p className="mt-1 text-xs text-slate-400">Bookings will appear here once passengers book your buses.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Booking ID</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Passenger</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Route</th>
                      <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentBookings.map((booking, i) => {
                      const id = toDisplayBookingId(booking);
                      const { label, cls, dot } = getBookingStatus(booking);
                      const passengers = Array.isArray(booking?.passengers) ? booking.passengers : Array.isArray(booking?.bookingSeats) ? booking.bookingSeats.map(s => s?.passenger) : [];
                      const pax = passengers[0];
                      const passengerName = pax ? `${pax.firstName || ''} ${pax.lastName || ''}`.trim() : (booking?.passengerName || booking?.customerName || 'Passenger');
                      const route = booking?.routeName || [booking?.from || booking?.source, booking?.to || booking?.destination].filter(Boolean).join(' → ') || '—';
                      const amount = booking?.payableAmount ?? booking?.amount ?? booking?.fare ?? null;

                      return (
                        <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-3.5">
                            <span className="text-xs font-mono text-slate-600">{id}</span>
                          </td>
                          <td className="px-5 py-3.5 hidden sm:table-cell">
                            <span className="text-sm font-medium text-slate-800 truncate max-w-[120px] block">{passengerName}</span>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <span className="text-sm text-slate-500 truncate max-w-[160px] block">{route}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
                              {label}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                            {amount != null ? (
                              <span className="text-sm font-bold text-[#002046]">₹{Number(amount).toLocaleString()}</span>
                            ) : <span className="text-xs text-slate-400">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-5">

            {/* Quick actions */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-black text-slate-900">Quick Actions</p>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.route)}
                    className="flex flex-col items-center gap-1.5 rounded-xl p-3 hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color} group-hover:scale-105 transition-transform`}>
                      <span className="material-symbols-outlined text-lg">{action.icon}</span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 text-center leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fleet status */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <p className="text-sm font-black text-slate-900">Fleet Status</p>
                <button onClick={() => navigate(ROUTES.OPERATOR_MY_BUSES)} className="text-xs font-semibold text-[#002046] hover:underline flex items-center gap-1">
                  View all
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                {loadingBuses ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-3 bg-slate-200 rounded w-full" />
                    <div className="h-3 bg-slate-200 rounded w-3/4" />
                  </div>
                ) : buses.length === 0 ? (
                  <div className="text-center py-4">
                    <span className="material-symbols-outlined text-3xl text-slate-200">directions_bus</span>
                    <p className="text-xs text-slate-400 mt-2">No buses registered yet</p>
                    <button
                      onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)}
                      className="mt-3 text-xs font-semibold text-[#002046] hover:underline"
                    >
                      Add your first bus →
                    </button>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                        <span className="font-bold text-slate-900">{activeBuses} / {buses.length}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: buses.length ? `${(activeBuses / buses.length) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          Pending Approval
                        </span>
                        <span className="font-bold text-slate-900">{pendingBuses}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-amber-400 transition-all"
                          style={{ width: buses.length ? `${(pendingBuses / buses.length) * 100}%` : '0%' }}
                        />
                      </div>
                    </div>

                    <div className="pt-1 border-t border-slate-100 grid grid-cols-2 gap-3">
                      {buses.slice(0, 4).map((bus) => (
                        <div key={bus.id} className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${bus.active ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                          <span className="text-xs text-slate-600 truncate">{bus.name || bus.busName}</span>
                        </div>
                      ))}
                      {buses.length > 4 && (
                        <span className="text-xs text-slate-400 col-span-2">+{buses.length - 4} more</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </OperatorLayout>
  );
};

export default OperatorDashboard;
