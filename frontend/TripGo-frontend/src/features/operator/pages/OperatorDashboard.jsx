import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getBuses, getPendingBuses } from '../../../api/busService';
import { getAllSchedules, getOperatorDashboard, getRoutes } from '../../../api/routeService';
import { getOperatorBookings } from '../../../api/operatorBookingService';
import { ROUTES } from '../../../shared/constants/routes';
import {
  Card, EmptyState, PageHeader, SkeletonRows, StatCard, StatusPill,
} from '../../../shared/components/console/ConsoleUI';
import { headerButton, headerPrimaryButton } from '../../../shared/components/console/consoleStyles';
import {
  bookingDeparture, bookingTravellers, istDate, istTime, passengerName, rupees, todayIst, TRIP_STATUS,
} from '../utils/operatorFormat';
import { toIstYmd } from '../../../shared/utils/scheduleSearchUtils';

const asList = (r) => (Array.isArray(r) ? r : Array.isArray(r?.content) ? r.content : []);
const getGreeting = () => {
  const h = Number(new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

/** Everything the overview needs, fetched in parallel; failed parts come back empty. */
const fetchDashboard = async () => {
  const [buses, pending, routes, schedules, bookings, stats] = await Promise.allSettled([
    getBuses(), getPendingBuses(), getRoutes(), getAllSchedules(), getOperatorBookings(), getOperatorDashboard(),
  ]);
  const val = (r) => (r.status === 'fulfilled' ? r.value : null);
  return {
    buses: asList(val(buses)), pending: asList(val(pending)), routes: asList(val(routes)),
    schedules: asList(val(schedules)), bookings: asList(val(bookings)), stats: val(stats),
  };
};

const SuspendedScreen = () => (
  <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
    <div className="max-w-md w-full rounded-2xl bg-white border border-slate-200/80 p-10 text-center shadow-sm">
      <span className="mx-auto mb-4 flex w-16 h-16 items-center justify-center rounded-2xl bg-red-50">
        <span className="material-symbols-outlined text-3xl text-red-600">block</span>
      </span>
      <h1 className="text-xl font-black text-slate-900">Your operator account is suspended</h1>
      <p className="mt-2 text-sm text-slate-600">You can’t manage buses, schedules or bookings right now. Contact <a href="mailto:support@tripgo.com" className="font-bold text-primary hover:text-[#FF8A65]">support@tripgo.com</a> to resolve this.</p>
    </div>
  </div>
);

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, suspendedWhileLoggedIn, setSuspendedWhileLoggedIn } = useAuth();
  const [data, setData] = useState({ buses: [], pending: [], routes: [], schedules: [], bookings: [], stats: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchDashboard().then((d) => { if (alive) { setData(d); setLoading(false); } });
    return () => { alive = false; };
  }, []);

  const today = todayIst();
  const todaysTrips = useMemo(() => data.schedules
    .filter((s) => s.active !== false && toIstYmd(s.departureTime) === today)
    .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime)), [data.schedules, today]);
  const upcomingSchedules = data.schedules.filter((s) => s.active !== false && new Date(s.arrivalTime) > new Date());
  const recentBookings = useMemo(() => [...data.bookings]
    .sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt)).slice(0, 6), [data.bookings]);
  const todaysPassengers = data.bookings.filter((b) => String(b.status).toUpperCase() === 'CONFIRMED' && toIstYmd(bookingDeparture(b)) === today)
    .reduce((n, b) => n + (bookingTravellers(b).length || 1), 0);

  if (!authLoading && user?.operatorStatus === 'SUSPENDED') return <SuspendedScreen />;

  const steps = [
    { label: 'Add a bus', sub: 'Name, type and seat layout', done: data.buses.length + data.pending.length > 0, route: ROUTES.OPERATOR_ADD_BUS },
    { label: 'Get it approved', sub: 'TripGo reviews new buses', done: data.buses.length > 0, route: ROUTES.OPERATOR_MY_BUSES },
    { label: 'Create a route', sub: 'Stops and fares', done: data.routes.length > 0, route: ROUTES.OPERATOR_CREATE_ROUTE },
    { label: 'Add a schedule', sub: 'Departure times, then you’re live', done: upcomingSchedules.length > 0, route: ROUTES.OPERATOR_SCHEDULES },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const stats = data.stats || {};

  return (
    <OperatorLayout activeItem="overview" title="Overview">
      {suspendedWhileLoggedIn && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            <span className="mx-auto mb-3 flex w-12 h-12 items-center justify-center rounded-2xl bg-red-50"><span className="material-symbols-outlined text-red-600">block</span></span>
            <h2 className="text-lg font-black text-slate-900">Your account was suspended</h2>
            <p className="mt-1 text-sm text-slate-600">Contact support@tripgo.com for help.</p>
            <button onClick={() => { setSuspendedWhileLoggedIn(false); navigate(ROUTES.LOGIN); }} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">Go to sign in</button>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <PageHeader
          eyebrow={`${getGreeting()}${user?.firstName ? `, ${user.firstName}` : ''}`}
          title="Your business today"
          subtitle={loading ? '…' : `${todaysTrips.length} departure${todaysTrips.length !== 1 ? 's' : ''} and ${todaysPassengers} passenger${todaysPassengers !== 1 ? 's' : ''} today`}
          actions={(
            <>
              <button onClick={() => navigate(ROUTES.OPERATOR_CREATE_ROUTE)} className={headerButton}><span className="material-symbols-outlined text-[18px]">add_road</span>New route</button>
              <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className={headerPrimaryButton}><span className="material-symbols-outlined text-[18px]">add</span>Add bus</button>
            </>
          )}
        />

        {!loading && doneCount < steps.length && (
          <Card title={`Get ready to take bookings · ${doneCount} of ${steps.length} done`} icon="rocket_launch">
            <ol className="grid sm:grid-cols-2 xl:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.label}>
                  <button onClick={() => navigate(s.route)} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                    <span className={`mt-0.5 w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-black ${s.done ? 'bg-green-600 text-white' : 'bg-[#FDBA74]/25 text-orange-700'}`}>
                      {s.done ? <span className="material-symbols-outlined text-[16px]">check</span> : i + 1}
                    </span>
                    <span>
                      <span className={`block text-sm font-bold ${s.done ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{s.label}</span>
                      <span className="block text-xs text-slate-500">{s.sub}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="payments" tone="green" label="Revenue (all time)" value={rupees(stats.totalRevenue)} sub="From confirmed bookings" loading={loading} onClick={() => navigate(ROUTES.OPERATOR_EARNINGS)} />
          <StatCard icon="confirmation_number" tone="blue" label="Confirmed bookings" value={Number(stats.confirmedBookings || 0).toLocaleString('en-IN')} sub={`${Number(stats.cancelledBookings || 0)} cancelled`} loading={loading} onClick={() => navigate(ROUTES.OPERATOR_BOOKINGS)} />
          <StatCard icon="departure_board" tone="peach" label="Departures today" value={todaysTrips.length} sub={`${upcomingSchedules.length} upcoming in total`} loading={loading} onClick={() => navigate(ROUTES.OPERATOR_SCHEDULES)} />
          <StatCard icon="directions_bus" tone="navy" label="Buses" value={data.buses.length} sub={data.pending.length ? `${data.pending.length} awaiting approval` : 'All approved'} loading={loading} onClick={() => navigate(ROUTES.OPERATOR_MY_BUSES)} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] xl:items-start">
          <div className="space-y-5 min-w-0">
            <Card title="Today’s departures" icon="departure_board" action={(
              <button onClick={() => navigate(ROUTES.OPERATOR_SCHEDULES)} className="text-xs font-bold text-primary hover:text-[#FF8A65]">All schedules</button>
            )}>
              {loading ? <SkeletonRows rows={3} /> : todaysTrips.length === 0 ? (
                <EmptyState icon="event_available" title="No departures today" subtitle={upcomingSchedules.length ? 'Your next trips are on the Routes & schedules page.' : 'Add a schedule to start taking bookings.'} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {todaysTrips.map((s) => {
                    const status = TRIP_STATUS[String(s.tripStatus || 'SCHEDULED').toUpperCase()] || TRIP_STATUS.SCHEDULED;
                    return (
                      <li key={s.id}>
                        <button onClick={() => s.route?.id && navigate(`/operator/routes/${s.route.id}`)} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/60">
                          <span className="w-16 flex-shrink-0">
                            <span className="block text-lg font-black text-slate-900 leading-tight">{istTime(s.departureTime).replace(/ (AM|PM)/, '')}</span>
                            <span className="text-[11px] font-bold text-slate-400">{istTime(s.departureTime).slice(-2)}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-bold text-slate-900 truncate">{s.route?.origin} <span className="text-[#FF8A65]">→</span> {s.route?.destination}</span>
                            <span className="block text-xs text-slate-500 truncate">{[s.bus?.name, s.driverName && `Driver: ${s.driverName}`].filter(Boolean).join(' · ') || 'No bus assigned'}</span>
                          </span>
                          <StatusPill tone={status.tone}>{status.label}{s.delayMinutes ? ` · ${s.delayMinutes} min` : ''}</StatusPill>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Latest bookings" icon="confirmation_number" action={(
              <button onClick={() => navigate(ROUTES.OPERATOR_BOOKINGS)} className="text-xs font-bold text-primary hover:text-[#FF8A65]">All bookings</button>
            )}>
              {loading ? <SkeletonRows rows={4} /> : recentBookings.length === 0 ? (
                <EmptyState icon="confirmation_number" title="No bookings yet" subtitle="Bookings appear here as soon as travellers book your buses." />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentBookings.map((b) => {
                    const people = bookingTravellers(b);
                    const cancelled = String(b.status).toUpperCase() === 'CANCELLED';
                    return (
                      <li key={b.bookingId} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 truncate">
                            {passengerName(people[0]) || 'Traveller'}
                            {people.length > 1 && <span className="font-normal text-slate-400"> +{people.length - 1}</span>}
                          </p>
                          <p className="text-xs text-slate-500 truncate">{b.from} → {b.to} · {istDate(bookingDeparture(b), { year: undefined, weekday: 'short' })} · Seats {(b.seatNumbers || []).join(', ')}</p>
                        </div>
                        <span className={`text-sm font-black tabular-nums ${cancelled ? 'text-slate-400 line-through' : 'text-slate-900'}`}>{rupees(b.payableAmount)}</span>
                        {cancelled ? <StatusPill tone="red">Cancelled</StatusPill> : <StatusPill tone="green">Confirmed</StatusPill>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card title="Fleet" icon="directions_bus" action={(
              <button onClick={() => navigate(ROUTES.OPERATOR_MY_BUSES)} className="text-xs font-bold text-primary hover:text-[#FF8A65]">Manage</button>
            )}>
              {loading ? <SkeletonRows rows={3} /> : data.buses.length + data.pending.length === 0 ? (
                <EmptyState icon="directions_bus" title="No buses yet" action={<button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">Add your first bus</button>} />
              ) : (
                <ul className="divide-y divide-slate-100">
                  {[...data.pending.map((b) => ({ ...b, pending: true })), ...data.buses].slice(0, 6).map((b) => (
                    <li key={b.id} className="flex items-center gap-3 px-5 py-3">
                      <span className="material-symbols-outlined text-[20px] text-slate-400">directions_bus</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-slate-900 truncate">{b.name}</span>
                        <span className="block text-xs text-slate-500 font-mono">{b.vehicleNumber}</span>
                      </span>
                      {b.pending ? <StatusPill tone="amber">Awaiting approval</StatusPill> : <StatusPill tone="green">Active</StatusPill>}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Shortcuts" icon="bolt">
              <div className="grid grid-cols-3 gap-2 p-4">
                {[['badge', 'Drivers', ROUTES.OPERATOR_DRIVERS], ['gavel', 'Policies', ROUTES.OPERATOR_POLICIES], ['reviews', 'Reviews', ROUTES.OPERATOR_REVIEWS]].map(([icon, label, route]) => (
                  <button key={label} onClick={() => navigate(route)} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 px-2 py-3 text-xs font-bold text-slate-600 hover:border-[#FF8A65] hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[22px] text-orange-600">{icon}</span>{label}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default OperatorDashboard;
