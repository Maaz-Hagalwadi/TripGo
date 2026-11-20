import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import UserLayout from '../../../shared/components/UserLayout';
import SearchBar from '../../../shared/components/ui/SearchBar';
import { getMyBookings, downloadTicketFromApi } from '../../../api/bookingService';
import { getPopularRoutes } from '../../../api/routeService';
import { getSavedRoutes, unsaveRoute } from '../../../api/savedRoutesService';
import { localDateString } from '../../../shared/utils/date';
import { formatIstTime, istDayDiff, onTravelDate, TRIP_TIME_ZONE } from '../../../shared/utils/scheduleSearchUtils';
import RecentSearches from '../components/RecentSearches';
import TripDayCard from '../components/TripDayCard';
import RouteAlertModal from '../components/RouteAlertModal';
import { ROUTE_ALERTS_ENABLED } from '../../../shared/constants/features';
import { getRouteAlerts } from '../../../api/travellerFeaturesService';
import { shareTrip } from '../../../shared/utils/shareTrip';

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.bookings)) return data.bookings;
  return [];
};

const getRawStatus = (b) => String(b?.status || b?.bookingStatus || '').toUpperCase();

const isConfirmedStatus = (s) =>
  s === 'CONFIRMED' || s === 'PAYMENT_SUCCESSFUL' || s === 'PAYMENT_RECEIVED';

/**
 * Real start/end of the booked trip. The API's departureTime/arrivalTime belong to the schedule's
 * first run; for recurring buses the trip runs on travelDate at the same UTC time of day
 * (the same rule the search API uses to project schedules onto a date).
 */
const getTripTimes = (b) => {
  const dep = b.departureTime ? new Date(b.departureTime) : null;
  const arr = b.arrivalTime ? new Date(b.arrivalTime) : null;
  const validDep = dep && !Number.isNaN(dep.getTime());
  if (!b.travelDate) return { start: validDep ? dep : null, end: arr };
  if (!validDep) {
    const start = new Date(`${b.travelDate}T00:00:00+05:30`);
    return { start, end: start };
  }
  const start = onTravelDate(b.travelDate, dep) || dep;
  const duration = arr && !Number.isNaN(arr.getTime()) ? Math.max(0, arr - dep) : 0;
  return { start, end: new Date(start.getTime() + duration) };
};

/** 'upcoming' | 'ongoing' | 'completed' for confirmed bookings */
const getTripPhase = (b, now) => {
  const { start, end } = getTripTimes(b);
  if (!start) return 'upcoming';
  if (start > now) return 'upcoming';
  if (end && end > now) return 'ongoing';
  return 'completed';
};

const BADGES = {
  upcoming: { label: 'Confirmed', cls: 'bg-green-50 text-green-700', dot: 'bg-green-500' },
  ongoing: { label: 'On the way', cls: 'bg-[#FDBA74]/20 text-orange-700', dot: 'bg-[#FF8A65]' },
  completed: { label: 'Completed', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  PENDING: { label: 'Payment pending', cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  FAILED: { label: 'Payment not completed', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

const getBadge = (b, now) => {
  const status = getRawStatus(b);
  if (isConfirmedStatus(status)) return BADGES[getTripPhase(b, now)];
  return BADGES[status] || { label: status || 'Unknown', cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' };
};

// Trip times are shown in IST, like search results and My bookings (see scheduleSearchUtils)
const formatDate = (d) =>
  d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: TRIP_TIME_ZONE }) : '—';

const formatTime = (d) => (d && !Number.isNaN(d.getTime()) ? formatIstTime(d) : '');

const formatDuration = (minutes) => {
  if (!minutes) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** "Departs today at 10:30 pm" / "Departs tomorrow at …" / "Departs in 3 days" */
const departsLabel = (start, now) => {
  if (!start) return '';
  const days = istDayDiff(now, start);
  if (days <= 0) return `Departs today at ${formatTime(start)}`;
  if (days === 1) return `Departs tomorrow at ${formatTime(start)}`;
  return `Departs in ${days} days`;
};

const getGreeting = (now) => {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const money = (n) => `₹${Math.round(Number(n)).toLocaleString('en-IN')}`;

const Card = ({ className = '', children }) => (
  <section className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm ${className}`}>{children}</section>
);

const Spinner = ({ label }) => (
  <div className="flex items-center justify-center gap-2 py-8">
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-[#FF8A65]" />
    <span className="text-xs text-slate-400">{label}</span>
  </div>
);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const searchRef = useRef(null);
  const [now] = useState(() => new Date());
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [popular, setPopular] = useState([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [savedLoading, setSavedLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertRoute, setAlertRoute] = useState(null);

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
      .then((data) => setBookings(normalizeList(data)))
      .catch(() => setBookings([]))
      .finally(() => setBookingsLoading(false));
    getPopularRoutes(5)
      .then((data) => setPopular(Array.isArray(data) ? data : []))
      .catch(() => setPopular([]))
      .finally(() => setPopularLoading(false));
    if (ROUTE_ALERTS_ENABLED) {
      getRouteAlerts().then((data) => setAlerts(Array.isArray(data) ? data : [])).catch(() => setAlerts([]));
    }
    getSavedRoutes()
      .then((data) => setSavedRoutes(Array.isArray(data) ? data : []))
      .catch(() => setSavedRoutes([]))
      .finally(() => setSavedLoading(false));
  }, [user]);

  const handleUnsave = async (route) => {
    try {
      await unsaveRoute(route.id);
      setSavedRoutes((prev) => prev.filter((r) => r.id !== route.id));
    } catch {
      toast.error('Couldn’t remove that route. Please try again.');
    }
  };

  const searchRoute = (from, to) =>
    navigate(ROUTES.SEARCH_RESULTS, { state: { from, to, date: localDateString() } });

  const focusSearch = () => {
    searchRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => searchRef.current?.querySelector('input')?.focus(), 400);
  };

  const handleDownload = async (booking) => {
    setDownloading(true);
    const ok = await downloadTicketFromApi(booking.bookingId, `TripGo-${booking.bookingCode || booking.bookingId}.pdf`);
    setDownloading(false);
    if (!ok) toast.error('Your ticket isn’t ready yet. Try again in a moment, or open it from My bookings.');
  };

  const firstName = user?.firstName || user?.name?.split(' ')[0] || 'Traveller';

  const confirmed = bookings.filter((b) => isConfirmedStatus(getRawStatus(b)));
  const upcoming = confirmed.filter((b) => getTripPhase(b, now) !== 'completed');
  const completedCount = confirmed.filter((b) => getTripPhase(b, now) === 'completed').length;
  const cancelledCount = bookings.filter((b) => getRawStatus(b) === 'CANCELLED').length;
  const pendingCount = bookings.filter((b) => getRawStatus(b) === 'PENDING').length;

  const nextTrip = [...upcoming].sort((a, b) => getTripTimes(a).start - getTripTimes(b).start)[0];
  // Unpaid bookings the backend closed (FAILED) are just noise here; My bookings still lists them
  const recentBookings = bookings.filter((b) => getRawStatus(b) !== 'FAILED')
    .sort((a, b) => new Date(b.bookedAt || b.createdAt || 0) - new Date(a.bookedAt || a.createdAt || 0))
    .slice(0, 5);

  const stats = [
    { label: 'Upcoming', value: upcoming.length, icon: 'event_upcoming', tone: 'text-green-600 bg-green-50' },
    { label: 'Completed', value: completedCount, icon: 'check_circle', tone: 'text-slate-600 bg-slate-100' },
    { label: 'Cancelled', value: cancelledCount, icon: 'cancel', tone: 'text-red-500 bg-red-50' },
    { label: 'Total bookings', value: bookings.length, icon: 'confirmation_number', tone: 'text-orange-600 bg-[#FDBA74]/20' },
  ];

  return (
    <UserLayout activeItem="dashboard" showHeaderTitle={false} showHeaderSearch={false}>
      <div className="space-y-6">

        {/* ── Greeting + search ──
            No overflow-hidden on this section: it would clip the city dropdown. */}
        <section ref={searchRef} className="relative rounded-2xl bg-primary shadow-sm scroll-mt-4">
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden="true">
            <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-[#FF8A65]/15 blur-3xl" />
          </div>

          <div className="relative z-10 px-5 md:px-8 pt-7 pb-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-5">
              <div>
                <p className="text-sm font-semibold text-[#FDBA74] mb-1">{getGreeting(now)}, {firstName}</p>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Where to next?</h1>
              </div>
              {!bookingsLoading && upcoming.length > 0 && (
                <span className="self-start md:self-auto inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-xs font-bold text-white">
                  <span className="material-symbols-outlined text-[16px] text-[#FDBA74]">event_upcoming</span>
                  {upcoming.length} upcoming trip{upcoming.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Same search bar as the landing hero, so both pages look and behave alike.
                relative z-20 keeps the city dropdown above the recent-search chips. */}
            <div className="relative z-20 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
              <SearchBar variant="hero" showQuickDates submitLabel="Search Buses" />
            </div>
            <RecentSearches className="mt-4" />
          </div>
        </section>

        {/* ── Next trip ── */}
        {bookingsLoading ? (
          <Card className="p-6"><Spinner label="Loading your trips..." /></Card>
        ) : nextTrip ? (() => {
          const { start, end } = getTripTimes(nextTrip);
          const phase = getTripPhase(nextTrip, now);
          const seats = (nextTrip.passengers || []).map((p) => p.seatNumber).filter(Boolean);
          const boarding = nextTrip.fromStop || nextTrip.from;
          const dropping = nextTrip.toStop || nextTrip.to;

          // Trip-day mode: the trip departs today (or the bus is already on the way)
          if (phase === 'ongoing' || getTripTimes(nextTrip).start?.toISOString().slice(0, 10) === localDateString()) {
            return (
              <TripDayCard
                trip={nextTrip} start={start} end={end} ongoing={phase === 'ongoing'}
                onDownload={() => handleDownload(nextTrip)} downloading={downloading}
              />
            );
          }
          return (
            <Card className="overflow-hidden">
              <div className="flex flex-col lg:flex-row">
                <div className="flex-1 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Your next trip</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${BADGES[phase].cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${BADGES[phase].dot}`} />
                      {phase === 'ongoing' ? 'On the way' : departsLabel(start, now)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="min-w-0">
                      <p className="text-2xl font-black text-slate-900 truncate">{nextTrip.from}</p>
                      <p className="text-sm font-semibold text-slate-500">{formatTime(start)}</p>
                    </div>
                    <div className="flex-1 flex items-center gap-2 min-w-[60px]" aria-hidden="true">
                      <span className="w-2 h-2 rounded-full border-2 border-primary" />
                      <span className="flex-1 border-t-2 border-dashed border-slate-200" />
                      <span className="material-symbols-outlined text-[#FF8A65]">directions_bus</span>
                      <span className="flex-1 border-t-2 border-dashed border-slate-200" />
                      <span className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="min-w-0 text-right">
                      <p className="text-2xl font-black text-slate-900 truncate">{nextTrip.to}</p>
                      <p className="text-sm font-semibold text-slate-500">{end && end > start ? formatTime(end) : ''}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      ['Date', formatDate(start)],
                      ['Bus', nextTrip.busName || '—'],
                      [seats.length > 1 ? 'Seats' : 'Seat', seats.length ? seats.join(', ') : '—'],
                      ['Booking ID', nextTrip.bookingCode || '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{value}</p>
                      </div>
                    ))}
                  </div>

                  {(boarding || dropping) && (
                    <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-500">
                      <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                      Boarding at <span className="font-semibold text-slate-700">{boarding}</span>
                      {dropping && <> · Drop at <span className="font-semibold text-slate-700">{dropping}</span></>}
                    </p>
                  )}
                </div>

                <div className="lg:w-60 flex lg:flex-col justify-center gap-3 p-6 bg-slate-50 border-t lg:border-t-0 lg:border-l border-slate-100">
                  <button
                    onClick={() => handleDownload(nextTrip)}
                    disabled={downloading}
                    className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-white px-4 py-3 text-sm font-bold hover:bg-[#102A4C] disabled:opacity-60 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">download</span>
                    {downloading ? 'Downloading...' : 'Download ticket'}
                  </button>
                  <button
                    onClick={() => shareTrip({
                      bookingId: nextTrip.bookingId, bookingCode: nextTrip.bookingCode, from: nextTrip.from, to: nextTrip.to,
                      dateLabel: formatDate(start), timeLabel: formatTime(start), busName: nextTrip.busName, boarding, seats: seats.join(', '),
                    })}
                    className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-800 px-4 py-3 text-sm font-bold hover:border-[#FF8A65] hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">share</span>
                    Share trip
                  </button>
                  <button
                    onClick={() => navigate(ROUTES.USER_BOOKINGS)}
                    className="flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-slate-800 px-4 py-3 text-sm font-bold hover:border-[#FF8A65] hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">{phase === 'ongoing' ? 'share_location' : 'receipt_long'}</span>
                    {phase === 'ongoing' ? 'Track bus' : 'Manage booking'}
                  </button>
                </div>
              </div>
            </Card>
          );
        })() : (
          <Card className="p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <span className="w-12 h-12 flex-shrink-0 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-orange-600">luggage</span>
            </span>
            <div className="flex-1">
              <p className="font-bold text-slate-900">No upcoming trips</p>
              <p className="text-sm text-slate-500">Plan your next journey — pick a route above or from popular routes below.</p>
            </div>
            <button onClick={focusSearch} className="rounded-xl bg-primary text-white px-5 py-2.5 text-sm font-bold hover:bg-[#102A4C] transition-colors">
              Search buses
            </button>
          </Card>
        )}

        {/* ── Stats ── */}
        <Card className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3 p-5">
              <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${s.tone}`}>
                <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
              </span>
              <div>
                <p className="text-2xl font-black text-slate-900 leading-none">{bookingsLoading ? '–' : s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </Card>
        {!bookingsLoading && pendingCount > 0 && (
          <p className="-mt-3 text-xs text-amber-700">
            {pendingCount} booking{pendingCount !== 1 ? 's are' : ' is'} waiting for payment — finish or cancel {pendingCount !== 1 ? 'them' : 'it'} in My bookings.
          </p>
        )}

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Recent bookings */}
          <Card className="lg:col-span-2 overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Recent bookings</h2>
              <button onClick={() => navigate(ROUTES.USER_BOOKINGS)} className="text-sm font-bold text-primary hover:text-[#FF8A65] transition-colors">
                View all
              </button>
            </div>

            {bookingsLoading ? (
              <Spinner label="Loading bookings..." />
            ) : recentBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <span className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-slate-300 text-3xl">confirmation_number</span>
                </span>
                <p className="font-semibold text-slate-700">No bookings yet</p>
                <p className="text-sm text-slate-400 mt-1">Your trips will appear here once you book.</p>
                <button onClick={focusSearch} className="mt-4 rounded-xl bg-primary text-white px-6 py-2.5 text-sm font-bold hover:bg-[#102A4C] transition-colors">
                  Find a bus
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Travel date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentBookings.map((b, i) => {
                      const badge = getBadge(b, now);
                      const { start } = getTripTimes(b);
                      const amount = b.payableAmount || b.totalAmount || b.amount;
                      return (
                        <tr
                          key={b.bookingId || b.id || i}
                          className="hover:bg-slate-50/60 transition-colors group cursor-pointer"
                          onClick={() => navigate(ROUTES.USER_BOOKINGS)}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-[#FDBA74]/20 group-hover:text-orange-600 transition-colors">
                                <span className="material-symbols-outlined text-xl">directions_bus</span>
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900 truncate">{b.from || '—'} → {b.to || '—'}</p>
                                <p className="text-xs text-slate-400 truncate">{b.busName || 'Bus'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-700 whitespace-nowrap">{formatDate(start)}</td>
                          <td className="px-4 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${badge.cls}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-900 whitespace-nowrap">
                            {amount > 0 ? money(amount) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Right column */}
          <div className="space-y-6">

            {/* Popular routes */}
            <Card className="p-5">
              <h2 className="text-base font-bold text-slate-900 mb-3">Popular routes</h2>
              {popularLoading ? (
                <Spinner label="Loading routes..." />
              ) : popular.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No routes available yet</p>
              ) : (
                <ul className="space-y-1">
                  {popular.map((r) => {
                    const meta = [r.buses ? `${r.buses} bus${r.buses !== 1 ? 'es' : ''}` : null, formatDuration(r.durationMinutes)].filter(Boolean).join(' · ');
                    return (
                      <li key={`${r.from}-${r.to}`}>
                        <button
                          onClick={() => searchRoute(r.from, r.to)}
                          className="w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 group transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 group-hover:text-primary truncate">
                              {r.from} <span className="text-[#FF8A65]">→</span> {r.to}
                            </p>
                            {meta && <p className="text-xs text-slate-400">{meta}</p>}
                          </div>
                          {r.startingFare != null ? (
                            <span className="flex-shrink-0 text-right">
                              <span className="block text-[10px] text-slate-400 leading-none">from</span>
                              <span className="text-sm font-black text-slate-900">{money(r.startingFare)}</span>
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-slate-300 group-hover:text-[#FF8A65]">chevron_right</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            {/* Saved routes */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-slate-900">Saved routes</h2>
                <span className="material-symbols-outlined text-[#FF8A65] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
              </div>
              {savedLoading ? (
                <Spinner label="Loading..." />
              ) : savedRoutes.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-sm text-slate-500">No saved routes yet</p>
                  <p className="text-xs text-slate-400 mt-1">Tap the heart on a search to save a route.</p>
                </div>
              ) : (
                <ul className="space-y-1 max-h-56 overflow-y-auto pr-1">
                  {savedRoutes.map((r) => (
                    <li key={r.id} className="flex items-center justify-between group rounded-xl px-3 py-2 hover:bg-slate-50 transition-colors">
                      <button className="flex-1 min-w-0 text-left" onClick={() => searchRoute(r.fromCity, r.toCity)}>
                        <span className="text-sm font-semibold text-slate-800 group-hover:text-primary truncate block">
                          {r.fromCity} <span className="text-[#FF8A65]">→</span> {r.toCity}
                        </span>
                      </button>
                      {ROUTE_ALERTS_ENABLED && (() => {
                        const routeAlert = alerts.find((x) => x.savedRouteId === r.id);
                        return (
                          <button
                            onClick={() => setAlertRoute(r)}
                            aria-label={routeAlert ? `Edit alert for ${r.fromCity} to ${r.toCity}` : `Create alert for ${r.fromCity} to ${r.toCity}`}
                            title={routeAlert ? 'Alert on' : 'Alert me about seats & fares'}
                            className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg transition-colors ${
                              routeAlert ? 'text-[#FF8A65] bg-[#FDBA74]/20' : 'text-slate-300 hover:text-primary hover:bg-slate-100'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm" style={routeAlert ? { fontVariationSettings: "'FILL' 1" } : undefined}>notifications</span>
                          </button>
                        );
                      })()}
                      <button
                        onClick={() => handleUnsave(r)}
                        aria-label={`Remove ${r.fromCity} to ${r.toCity} from saved routes`}
                        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

          </div>
        </div>
      </div>

      {alertRoute && (
        <RouteAlertModal
          route={alertRoute}
          alert={alerts.find((x) => x.savedRouteId === alertRoute.id)}
          onClose={() => setAlertRoute(null)}
          onSaved={(saved) => { setAlerts((prev) => [...prev.filter((x) => x.id !== saved.id), saved]); setAlertRoute(null); }}
          onDeleted={(id) => { setAlerts((prev) => prev.filter((x) => x.id !== id)); setAlertRoute(null); }}
        />
      )}
    </UserLayout>
  );
};

export default Dashboard;
