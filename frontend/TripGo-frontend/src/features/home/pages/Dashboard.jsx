import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import UserLayout from '../../../shared/components/UserLayout';
import SearchBar from '../../../shared/components/ui/SearchBar';
import { getMyBookings } from '../../../api/bookingService';
import { getSearchRoutes } from '../../../api/routeService';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.bookings)) return data.bookings;
  return [];
};

const getRawStatus = (b) => String(b?.status || b?.bookingStatus || '').toUpperCase();

const isConfirmedStatus = (s) =>
  s === 'CONFIRMED' || s === 'PAYMENT_SUCCESSFUL' || s === 'PAYMENT_RECEIVED';

const isDepartureInPast = (b) => {
  const dep = b.departureTime || b.travelDate;
  if (!dep) return false;
  return new Date(dep) < new Date();
};

const getBadgeForBooking = (b) => {
  const status = getRawStatus(b);
  if (isConfirmedStatus(status) && isDepartureInPast(b))
    return { label: 'Completed', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-500' };
  if (isConfirmedStatus(status))
    return { label: 'Confirmed', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
  if (status === 'CANCELLED')
    return { label: 'Cancelled', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
  if (status === 'PENDING')
    return { label: 'Pending', bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
  return { label: status || 'Unknown', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' };
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const QUICK_ACTIONS = [
  { icon: 'confirmation_number', label: 'My Bookings', desc: 'View & manage trips',   route: ROUTES.USER_BOOKINGS,   iconBg: 'bg-blue-50',   iconColor: 'text-blue-600',   hoverBg: 'group-hover:bg-blue-600' },
  { icon: 'search',              label: 'Find Journey',  desc: 'Explore new routes',   route: ROUTES.SEARCH_RESULTS,  iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', hoverBg: 'group-hover:bg-indigo-600' },
  { icon: 'star',                label: 'My Ratings',    desc: 'Rate completed trips',  route: ROUTES.USER_PROFILE,    iconBg: 'bg-amber-50',  iconColor: 'text-amber-600',  hoverBg: 'group-hover:bg-amber-600' },
  { icon: 'support_agent',       label: 'Support',       desc: 'Get help anytime',      route: ROUTES.USER_SUPPORT,    iconBg: 'bg-purple-50', iconColor: 'text-purple-600', hoverBg: 'group-hover:bg-purple-600' },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [routes, setRoutes] = useState([]);
  const [routesLoading, setRoutesLoading] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(ROUTES.HOME); return; }
    if (user.role === 'OPERATOR') { navigate(ROUTES.OPERATOR_DASHBOARD); return; }
    if (user.role === 'ADMIN') { navigate(ROUTES.ADMIN_DASHBOARD); return; }
    if (user.role && user.role !== 'USER') { navigate(ROUTES.HOME); }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'USER') return;
    getMyBookings()
      .then(data => setBookings(normalizeList(data)))
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
    getSearchRoutes()
      .then(data => setRoutes(Array.isArray(data) ? data : []))
      .catch(() => setRoutes([]))
      .finally(() => setRoutesLoading(false));
  }, [user]);

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Traveler';

  const confirmedBookings = bookings.filter(b => isConfirmedStatus(getRawStatus(b)));
  const upcomingBookings  = confirmedBookings.filter(b => !isDepartureInPast(b));
  const completedBookings = confirmedBookings.filter(b => isDepartureInPast(b));
  const cancelledCount    = bookings.filter(b => getRawStatus(b) === 'CANCELLED').length;
  const pendingCount      = bookings.filter(b => getRawStatus(b) === 'PENDING').length;

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.bookedAt || b.createdAt || 0) - new Date(a.bookedAt || a.createdAt || 0))
    .slice(0, 5);

  const stats = bookingsLoading ? null : [
    {
      icon: 'layers',        label: 'Total',
      value: bookings.length,
      sub: `${bookings.length} booking${bookings.length !== 1 ? 's' : ''} made`,
      iconBg: 'bg-blue-50',   iconColor: 'text-blue-600',
    },
    {
      icon: 'upcoming',      label: 'Upcoming',
      value: upcomingBookings.length,
      sub: upcomingBookings.length === 1 ? '1 trip coming up' : `${upcomingBookings.length} trips coming up`,
      iconBg: 'bg-green-50',  iconColor: 'text-green-600',
    },
    {
      icon: 'check_circle',  label: 'Completed',
      value: completedBookings.length,
      sub: completedBookings.length === 1 ? '1 past journey' : `${completedBookings.length} past journeys`,
      iconBg: 'bg-slate-100', iconColor: 'text-slate-600',
    },
    {
      icon: 'cancel',        label: 'Cancelled',
      value: cancelledCount,
      sub: pendingCount > 0 ? `${pendingCount} pending payment` : `${cancelledCount} cancelled`,
      iconBg: 'bg-red-50',    iconColor: 'text-red-600',
    },
  ];

  return (
    <UserLayout activeItem="dashboard" showHeaderTitle={false} showHeaderSearch={false}>
      <div className="space-y-6">

        {/* ── Hero / Search ──
            NOTE: no overflow-hidden on the section itself — that would clip
            the SearchBar city-dropdown suggestions. Decoration is clipped
            inside its own inner wrapper instead.                          */}
        <section className="relative rounded-3xl bg-white border border-slate-200 shadow-sm">
          {/* Decorative blur — clipped in its own overflow-hidden wrapper */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 rounded-full blur-3xl bg-blue-50/70" />
          </div>

          <div className="relative z-10 px-6 md:px-8 py-8">
            {/* Greeting row */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
              <div>
                <p className="font-semibold text-blue-600 mb-0.5">{getGreeting()}, {firstName}!</p>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
                  Where are you travelling today?
                </h2>
              </div>
              {!bookingsLoading && upcomingBookings.length > 0 && (
                <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex-shrink-0">
                  <span className="flex items-center text-blue-700 text-sm font-semibold gap-1.5">
                    <span className="material-symbols-outlined text-blue-500 text-base">upcoming</span>
                    {upcomingBookings.length} upcoming trip{upcomingBookings.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Search widget — slightly tinted so fields are visible on white */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 md:p-5">
              <SearchBar showQuickDates variant="light" />
            </div>
          </div>
        </section>

        {/* ── Bento widgets ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Bookings */}
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-2">Total Bookings</p>
            {bookingsLoading ? (
              <div className="animate-pulse space-y-2"><div className="h-9 w-16 bg-white/20 rounded" /><div className="h-3 w-28 bg-white/10 rounded" /></div>
            ) : (
              <>
                <p className="text-3xl font-black">{bookings.length}</p>
                <p className="text-xs opacity-50 mt-1.5">{pendingCount > 0 ? `${pendingCount} pending payment` : 'all time bookings'}</p>
              </>
            )}
          </div>

          {/* Trips Overview */}
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-3">Trips Overview</p>
            {bookingsLoading ? (
              <div className="space-y-3 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="flex justify-between"><div className="h-3 w-20 bg-white/20 rounded"/><div className="h-3 w-6 bg-white/10 rounded"/></div>)}
              </div>
            ) : (
              <div className="space-y-2.5">
                {[
                  { label: 'Upcoming',  count: upcomingBookings.length,  dot: 'bg-emerald-400' },
                  { label: 'Completed', count: completedBookings.length, dot: 'bg-sky-400' },
                  { label: 'Cancelled', count: cancelledCount,           dot: 'bg-rose-400' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.dot}`} />
                      <span className="text-sm opacity-70">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold">{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* TripGo Premium */}
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-2">TripGo Premium</p>
            <h3 className="text-lg font-black leading-snug">Priority seats &amp; zero cancellation fees</h3>
            <p className="text-xs opacity-50 mt-1.5 mb-5">Upgrade for exclusive benefits on every trip</p>
            <button className="rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-bold transition-colors">
              Upgrade now →
            </button>
          </div>
        </div>

        {/* ── Next Trip Highlight ── */}
        {!bookingsLoading && upcomingBookings.length > 0 && (() => {
          const next = [...upcomingBookings].sort((a, b) =>
            new Date(a.departureTime || a.travelDate || 0) - new Date(b.departureTime || b.travelDate || 0)
          )[0];
          const from = next?.from || next?.fromCity || next?.origin || '—';
          const to   = next?.to   || next?.toCity   || next?.destination || '—';
          const dep  = next?.departureTime || next?.travelDate;
          const bus  = next?.busName || next?.bus?.name || 'Bus';
          const amt  = Number(next?.payableAmount ?? next?.totalAmount ?? next?.amount ?? 0);
          return (
            <section className="rounded-2xl bg-gradient-to-r from-[#002046] via-[#003a80] to-[#001a38] text-white p-6 relative overflow-hidden shadow-lg">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
                <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-white/5" />
                <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-white/3" />
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">upcoming</span>
                    Your Next Trip
                  </p>
                  <h3 className="text-2xl font-black">{from} <span className="opacity-50 font-light">→</span> {to}</h3>
                  <p className="text-sm opacity-60 mt-1">{bus}</p>
                </div>
                <div className="flex items-center gap-4 sm:gap-6">
                  {dep && (
                    <div>
                      <p className="text-[10px] opacity-50 uppercase tracking-wider mb-0.5">Departure</p>
                      <p className="font-bold text-sm">{formatDate(dep)}</p>
                    </div>
                  )}
                  {amt > 0 && (
                    <div>
                      <p className="text-[10px] opacity-50 uppercase tracking-wider mb-0.5">Paid</p>
                      <p className="font-bold text-sm">₹{Math.round(amt).toLocaleString('en-IN')}</p>
                    </div>
                  )}
                  <button
                    onClick={() => navigate(ROUTES.USER_BOOKINGS)}
                    className="bg-white text-[#002046] rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-slate-100 transition-colors whitespace-nowrap flex-shrink-0"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </section>
          );
        })()}

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Bookings Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Recent Bookings</h3>
              <button
                onClick={() => navigate(ROUTES.USER_BOOKINGS)}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                View all
              </button>
            </div>

            {bookingsLoading ? (
              <div className="flex items-center justify-center py-16 gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                <span className="text-sm text-slate-400">Loading bookings...</span>
              </div>
            ) : recentBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-slate-300 text-3xl">confirmation_number</span>
                </div>
                <p className="font-semibold text-slate-700">No bookings yet</p>
                <p className="text-sm text-slate-400 mt-1">Search for a bus and book your first trip</p>
                <button
                  onClick={() => navigate(ROUTES.SEARCH_RESULTS)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5"
                >
                  Search Buses
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 md:px-8 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 md:px-8 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentBookings.map((b, i) => {
                      const badge  = getBadgeForBooking(b);
                      const from   = b.from || b.fromCity || b.origin || '—';
                      const to     = b.to   || b.toCity   || b.destination || '—';
                      const busName = b.busName || b.bus?.name || 'Bus';
                      const busType = b.selectedType || b.busType || b.bus?.busType || '';
                      const amount = b.payableAmount || b.totalAmount || b.amount;
                      const date   = formatDate(b.departureTime || b.travelDate || b.bookedAt || b.createdAt);
                      return (
                        <tr
                          key={b.bookingId || b.id || i}
                          className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                          onClick={() => navigate(ROUTES.USER_BOOKINGS)}
                        >
                          <td className="px-6 md:px-8 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors flex-shrink-0">
                                <span className="material-symbols-outlined text-xl">directions_bus</span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{from} → {to}</p>
                                <p className="text-xs text-slate-400">{busName}{busType ? ` · ${busType}` : ''}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">{date}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 md:px-8 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                            {amount > 0 ? `₹${Math.round(amount).toLocaleString('en-IN')}` : '—'}
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
          <div className="space-y-6">

            {/* Quick Actions */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-base font-bold text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-2">
                {QUICK_ACTIONS.map(a => (
                  <button
                    key={a.route}
                    onClick={() => navigate(a.route)}
                    className="w-full flex items-center p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group text-left"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.iconBg} ${a.iconColor} ${a.hoverBg} group-hover:text-white transition-all flex-shrink-0`}>
                      <span className="material-symbols-outlined text-xl">{a.icon}</span>
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                      <p className="text-xs text-slate-500">{a.desc}</p>
                    </div>
                    <span className="material-symbols-outlined text-slate-300 text-lg flex-shrink-0">chevron_right</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Available Routes */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-base font-bold text-slate-900 mb-4">Available Routes</h3>
              {routesLoading ? (
                <div className="flex items-center gap-2 py-4 justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                  <span className="text-xs text-slate-400">Loading routes...</span>
                </div>
              ) : routes.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No routes available yet</p>
              ) : (
                <ul className="space-y-1 max-h-64 overflow-y-auto pr-1">
                  {routes.map(r => (
                    <li
                      key={`${r.from}-${r.to}`}
                      className="flex items-center justify-between group cursor-pointer rounded-xl px-2 py-2 hover:bg-slate-50 transition-colors"
                      onClick={() => navigate(ROUTES.SEARCH_RESULTS, {
                        state: { from: r.from, to: r.to, date: new Date().toISOString().split('T')[0] }
                      })}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors truncate">
                          {r.from} → {r.to}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-slate-300 text-base group-hover:text-blue-400 transition-colors flex-shrink-0">chevron_right</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default Dashboard;
