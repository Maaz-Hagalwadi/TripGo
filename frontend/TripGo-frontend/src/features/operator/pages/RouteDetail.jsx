import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import {
  addFare, addPoint, addSegment, completeTrip, copyPointsToSchedule, createSchedule, deleteFare, deletePoint,
  deleteSchedule, deleteSegment, getFares, getPoints, getRouteSchedules, getRouteSegments, getRoutes, markDelay,
  recomputeDistance, setScheduleActive, startTrip, updateFare, updatePoint, updateRoute, updateSchedule, updateSegment,
} from '../../../api/routeService';
import { assignDriverToSchedule, getDrivers } from '../../../api/operatorDriverService';
import { getBuses } from '../../../api/busService';
import { apiPost } from '../../../api/apiClient';
import { ROUTES } from '../../../shared/constants/routes';
import {
  ActionButton, ConfirmDialog, EmptyState, FilterTabs, SkeletonRows, StatusPill,
} from '../../../shared/components/console/ConsoleUI';
import { headerButton, headerPrimaryButton } from '../../../shared/components/console/consoleStyles';
import DepartureFields from '../components/DepartureFields';
import PassengerManifest from '../components/PassengerManifest';
import PointsEditor from '../components/PointsEditor';
import {
  FREQUENCY_LABEL, fareSeatTypesFor, istDate, istDateTime, istTime, isoToIst, minutesLabel, prettyType, rupees,
  SEAT_TYPE_LABEL, START_WINDOW_MS, todayIst, TRIP_STATUS,
} from '../utils/operatorFormat';
import {
  departureError, departureFromSchedule, departurePayload, emptyDeparture, INPUT, LABEL, pointPayload, toList,
} from '../utils/routeForms';

const isOpen = (s) => !['COMPLETED', 'CANCELLED'].includes(String(s.tripStatus || '').toUpperCase());
const hasPoints = (pts) => Array.isArray(pts) && pts.some((p) => p.type === 'BOARDING') && pts.some((p) => p.type === 'DROPPING');
const licenceExpired = (d) => Boolean(d?.licenseExpiry && d.licenseExpiry < todayIst());

const Modal = ({ title, children, onClose, footer, wide }) => (
  <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={title}
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div className={`w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h2 className="text-lg font-black text-slate-900">{title}</h2>
        <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">close</span></button>
      </div>
      <div className="px-6 py-5">{children}</div>
      {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
    </div>
  </div>
);

const RouteDetail = () => {
  const { routeId } = useParams();
  const navigate = useNavigate();

  const [route, setRoute] = useState(null);
  const [segments, setSegments] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [fares, setFares] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [points, setPoints] = useState({}); // scheduleId -> points[]
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState('departures');
  const [showPast, setShowPast] = useState(false);
  const [busy, setBusy] = useState(false);

  const [depDialog, setDepDialog] = useState(null); // { id?, value, error }
  const [driverDialog, setDriverDialog] = useState(null); // { schedule, driverId }
  const [delayDialog, setDelayDialog] = useState(null); // { schedule, minutes, reason }
  const [confirm, setConfirm] = useState(null); // { title, message, label, tone, run }
  const [pointsFor, setPointsFor] = useState('');
  const [fareDraft, setFareDraft] = useState({}); // `${segmentId}:${type}` -> string
  const [gst, setGst] = useState('');
  const [manifestFor, setManifestFor] = useState(null);
  const [stopDialog, setStopDialog] = useState(null); // { kind: 'rename'|'leg'|'extend', ... }

  const load = useCallback(async () => {
    const [r, sg, sc, f, d, b] = await Promise.allSettled([getRoutes(), getRouteSegments(routeId), getRouteSchedules(routeId), getFares(routeId), getDrivers(), getBuses()]);
    const found = r.status === 'fulfilled' ? toList(r.value).find((x) => String(x.id) === String(routeId)) : null;
    if (!found) { setNotFound(true); setLoading(false); return; }
    const scheds = sc.status === 'fulfilled' ? toList(sc.value) : [];
    setRoute(found);
    setSegments(sg.status === 'fulfilled' ? [...toList(sg.value)].sort((a, c) => a.seq - c.seq) : []);
    setSchedules(scheds);
    setFares(f.status === 'fulfilled' ? toList(f.value) : []);
    setDrivers(d.status === 'fulfilled' ? toList(d.value) : []);
    setBuses(b.status === 'fulfilled' ? toList(b.value).filter((x) => x.active) : []);
    const open = scheds.filter(isOpen);
    const pts = await Promise.allSettled(open.map((s) => getPoints(s.id)));
    setPoints(Object.fromEntries(open.map((s, i) => [s.id, pts[i].status === 'fulfilled' ? toList(pts[i].value) : []])));
    setLoading(false);
  }, [routeId]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn, success) => {
    setBusy(true);
    try {
      await fn();
      if (success) toast.success(success);
      return true;
    } catch (e) {
      toast.error(e.message || 'Something went wrong');
      return false;
    } finally {
      setBusy(false);
    }
  };

  /* ─── derived ─── */
  const now = new Date();
  const tripMinutes = segments.reduce((n, s) => n + (Number(s.durationMinutes) || 0), 0);
  const stops = segments.length ? [segments[0].fromStop, ...segments.map((s) => s.toStop)] : [route?.origin, route?.destination].filter(Boolean);
  const upcoming = useMemo(() => schedules.filter(isOpen).sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime)), [schedules]);
  const past = useMemo(() => schedules.filter((s) => !isOpen(s)).sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime)), [schedules]);
  const routeBusTypes = [...new Set((upcoming.length ? upcoming.map((s) => s.bus?.busType) : buses.map((b) => b.busType)).filter(Boolean))];
  const neededTypes = [...new Set((routeBusTypes.length ? routeBusTypes : ['SEATER']).flatMap(fareSeatTypesFor))];
  const routeFares = fares.filter((f) => !f.busId);
  const fareOf = (segmentId, type) => routeFares.find((f) => String(f.segmentId) === String(segmentId) && f.seatType === type);
  const legacyTypes = [...new Set(routeFares.map((f) => f.seatType))].filter((t) => !neededTypes.includes(t));
  const missingFares = segments.flatMap((s) => neededTypes.filter((t) => !fareOf(s.id, t)).map((t) => `${s.fromStop} → ${s.toStop} (${SEAT_TYPE_LABEL[t] || t})`));
  const withoutPoints = upcoming.filter((s) => !hasPoints(points[s.id]));
  const withoutDriver = upcoming.filter((s) => !s.driverId);
  const live = segments.length > 0 && routeFares.length > 0 && upcoming.some((s) => s.active !== false && hasPoints(points[s.id]));
  const selectedForPoints = upcoming.find((s) => String(s.id) === String(pointsFor)) || withoutPoints[0] || upcoming[0];
  const lastWithPoints = upcoming.find((s) => hasPoints(points[s.id]));

  /* ─── departures ─── */
  const openAdd = () => {
    const base = emptyDeparture(upcoming[0]?.bus?.id ? String(upcoming[0].bus.id) : (buses.length === 1 ? String(buses[0].id) : ''));
    if (upcoming[0]) { const t = departureFromSchedule(upcoming[0]); Object.assign(base, { depTime: t.depTime, frequency: t.frequency, arrivalEdited: false }); }
    setDepDialog({ value: base, error: '' });
  };
  const saveDeparture = async () => {
    const { id, value } = depDialog;
    const err = departureError(value, { requireFuture: !id });
    if (err) { setDepDialog({ ...depDialog, error: err }); return; }
    const ok = await run(async () => {
      if (id) {
        await updateSchedule(id, departurePayload(value));
      } else {
        const created = await createSchedule(routeId, departurePayload(value));
        // A new departure starts with the route's usual boarding & dropping points
        if (lastWithPoints && created?.id) {
          await copyPointsToSchedule(lastWithPoints.id, created.id);
          toast.message('Boarding & dropping points copied from your other departure — check the times.');
        }
      }
      await load();
    }, id ? 'Departure updated' : 'Departure added');
    if (ok) setDepDialog(null);
  };
  const toggleSale = (s) => run(async () => {
    await setScheduleActive(s.id, s.active === false);
    setSchedules((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: s.active === false } : x)));
  }, s.active === false ? 'Back on sale' : 'Taken off sale — existing tickets stay valid');

  const startState = (s) => {
    const status = String(s.tripStatus || 'SCHEDULED').toUpperCase();
    if (!['SCHEDULED', 'DELAYED'].includes(status)) return { show: false };
    const opensAt = new Date(new Date(s.departureTime).getTime() - START_WINDOW_MS);
    if (!s.driverId) return { show: true, disabled: true, hint: 'Assign a driver to start' };
    if (now < opensAt) return { show: true, disabled: true, hint: `Can start from ${istDateTime(opensAt)}` };
    if (now > new Date(s.arrivalTime)) return { show: true, disabled: true, hint: 'Arrival time has passed' };
    return { show: true, disabled: false };
  };
  const askStart = (s) => setConfirm({
    title: 'Start this trip?', label: 'Start trip', tone: 'primary',
    message: `Do this when ${s.bus?.name || 'the bus'} actually leaves. It closes booking for the ${istDate(s.departureTime)} departure and lets travellers track it. Later dates stay on sale.`,
    run: () => run(async () => { await startTrip(s.id); await load(); }, 'Trip started — have a safe journey'),
  });
  const askComplete = (s) => setConfirm({
    title: 'Complete this trip?', label: 'Complete trip', tone: 'approve',
    message: `Travellers are asked to rate the trip.${s.frequency && s.frequency !== 'ONCE' ? ' The next departure is created automatically with the same points and policies.' : ''}`,
    run: () => run(async () => { await completeTrip(s.id); await load(); }, 'Trip completed'),
  });
  const askDelete = (s) => setConfirm({
    title: 'Delete this departure?', label: 'Delete', tone: 'danger',
    message: 'If travellers have booked it, it can’t be deleted — take it off sale instead.',
    run: () => run(async () => { await deleteSchedule(s.id); setSchedules((prev) => prev.filter((x) => x.id !== s.id)); }, 'Departure deleted'),
  });
  const saveDriver = async () => {
    const { schedule, driverId } = driverDialog;
    if (!driverId) return;
    const ok = await run(async () => { await assignDriverToSchedule(schedule.id, driverId); await load(); }, 'Driver assigned');
    if (ok) setDriverDialog(null);
  };
  const saveDelay = async () => {
    const mins = Number(delayDialog.minutes);
    if (!Number.isInteger(mins) || mins < 0 || mins > 1440) { toast.error('Enter the delay in minutes (0 clears it)'); return; }
    const ok = await run(async () => { await markDelay(delayDialog.schedule.id, mins, delayDialog.reason || ''); await load(); }, mins ? 'Delay shared with travellers' : 'Delay cleared');
    if (ok) setDelayDialog(null);
  };
  const shareLocation = (s) => {
    if (!navigator.geolocation) { toast.error('This browser can’t share location'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => run(() => apiPost(`/tracking/${s.id}`, {
        latitude: pos.coords.latitude, longitude: pos.coords.longitude,
        speedKmph: pos.coords.speed != null ? pos.coords.speed * 3.6 : 0, heading: pos.coords.heading ?? 0,
      }), 'Location shared with travellers'),
      () => toast.error('Allow location access in your browser to share the bus location'),
    );
  };

  /* ─── points ─── */
  const sid = selectedForPoints?.id;
  const setSchedPoints = (fn) => setPoints((prev) => ({ ...prev, [sid]: fn(prev[sid] || []) }));
  const onAddPoint = async (p) => { const created = await addPoint(sid, pointPayload(p)); setSchedPoints((l) => [...l, created]); toast.success('Point added'); };
  const onSavePoint = async (orig, p) => { const updated = await updatePoint(sid, orig.id, pointPayload(p)); setSchedPoints((l) => l.map((x) => (x.id === orig.id ? { ...x, ...updated } : x))); toast.success('Point saved'); };
  const onDeletePoint = (p) => run(async () => { await deletePoint(sid, p.id); setSchedPoints((l) => l.filter((x) => x.id !== p.id)); }, 'Point removed');
  const askCopyPoints = () => {
    const targets = upcoming.filter((s) => s.id !== sid);
    setConfirm({
      title: `Use these points on ${targets.length} other departure${targets.length !== 1 ? 's' : ''}?`, label: 'Copy points', tone: 'primary',
      message: 'Their current boarding and dropping points are replaced with this list.',
      run: () => run(async () => { for (const t of targets) await copyPointsToSchedule(sid, t.id); await load(); }, 'Points copied'),
    });
  };

  /* ─── fares ─── */
  const defaultGst = String(routeFares[0]?.gstPercent ?? 5);
  const fareKey = (segId, t) => `${segId}:${t}`;
  const fareValue = (segId, t) => fareDraft[fareKey(segId, t)] ?? (fareOf(segId, t) ? String(Number(fareOf(segId, t).baseFare)) : '');
  const dirtyFares = Object.entries(fareDraft).filter(([k, v]) => {
    const [segId, t] = k.split(':');
    const f = fareOf(segId, t);
    return String(v).trim() !== '' && (!f || Number(v) !== Number(f.baseFare));
  });
  const gstValue = gst === '' ? defaultGst : gst;
  const saveFares = () => {
    if (dirtyFares.some(([, v]) => !(Number(v) > 0))) { toast.error('Fares must be more than ₹0'); return; }
    if (!(Number(gstValue) >= 0 && Number(gstValue) <= 28)) { toast.error('GST must be between 0% and 28%'); return; }
    run(async () => {
      for (const [k, v] of dirtyFares) {
        const [segId, t] = k.split(':');
        const f = fareOf(segId, t);
        const body = { segmentId: segId, seatType: t, baseFare: Number(v), gstPercent: Number(gstValue), busId: null };
        if (f) await updateFare(routeId, f.id, body); else await addFare(routeId, body);
      }
      setFares(toList(await getFares(routeId)));
      setFareDraft({});
    }, `${dirtyFares.length} fare${dirtyFares.length !== 1 ? 's' : ''} saved`);
  };
  const askRemoveFareType = (t) => setConfirm({
    title: `Remove “${prettyType(t)}” fares?`, label: 'Remove', tone: 'danger',
    message: `Your buses’ seats are ${neededTypes.map((x) => SEAT_TYPE_LABEL[x].toLowerCase()).join(' and ')}s, so these older fares aren’t matched to a seat type any more.`,
    run: () => run(async () => {
      for (const f of routeFares.filter((x) => x.seatType === t)) await deleteFare(routeId, f.id);
      setFares((prev) => prev.filter((x) => x.busId || x.seatType !== t));
    }, 'Old fares removed'),
  });

  /* ─── stops ─── */
  const refreshStops = async () => {
    setSegments([...toList(await getRouteSegments(routeId))].sort((a, b) => a.seq - b.seq));
    recomputeDistance(routeId).then((r) => setRoute((x) => ({ ...x, totalDistanceKm: r?.totalDistanceKm ?? x.totalDistanceKm }))).catch(() => {});
  };
  const segBody = (s, patch) => ({ fromStop: s.fromStop, toStop: s.toStop, distanceKm: Number(s.distanceKm) || 0, durationMinutes: Number(s.durationMinutes) || 0, ...patch });
  const saveStopDialog = async () => {
    const d = stopDialog;
    const ok = await run(async () => {
      if (d.kind === 'leg') {
        if (!(Number(d.km) > 0) || !(Number(d.mins) > 0)) throw new Error('Distance and time must be more than 0');
        await updateSegment(routeId, d.seg.id, segBody(d.seg, { distanceKm: Number(d.km), durationMinutes: Number(d.mins) }));
      } else if (d.kind === 'rename') {
        const name = d.name.trim();
        if (!name) throw new Error('Add the stop name');
        if (stops.some((x, i) => i !== d.index && x.toLowerCase() === name.toLowerCase())) throw new Error('This route already has a stop with that name');
        const before = segments[d.index - 1];
        const after = segments[d.index];
        if (before) await updateSegment(routeId, before.id, segBody(before, { toStop: name }));
        if (after) await updateSegment(routeId, after.id, segBody(after, { fromStop: name }));
        if (d.index === 0 || d.index === stops.length - 1) {
          const patch = d.index === 0 ? { origin: name } : { destination: name };
          await updateRoute(routeId, { name: route.name, origin: route.origin, destination: route.destination, ...patch });
          setRoute((r) => ({ ...r, ...patch }));
        }
      } else if (d.kind === 'extend') {
        const name = d.name.trim();
        if (!name || !(Number(d.km) > 0) || !(Number(d.mins) > 0)) throw new Error('Add the stop name, distance and time');
        if (stops.some((x) => x.toLowerCase() === name.toLowerCase())) throw new Error('This route already has a stop with that name');
        await addSegment(routeId, { fromStop: stops[stops.length - 1], toStop: name, distanceKm: Number(d.km), durationMinutes: Number(d.mins) });
        await updateRoute(routeId, { name: route.name, origin: route.origin, destination: name });
        setRoute((r) => ({ ...r, destination: name }));
      }
      await refreshStops();
    }, 'Stops updated');
    if (ok) setStopDialog(null);
  };
  const askRemoveLast = () => {
    const last = segments[segments.length - 1];
    setConfirm({
      title: `Remove ${last.toStop}?`, label: 'Remove stop', tone: 'danger',
      message: `The route will end at ${last.fromStop}, and fares to ${last.toStop} are deleted. Not possible once travellers have booked this route.`,
      run: () => run(async () => {
        await deleteSegment(routeId, last.id);
        await updateRoute(routeId, { name: route.name, origin: route.origin, destination: last.fromStop });
        setRoute((r) => ({ ...r, destination: last.fromStop }));
        setFares((prev) => prev.filter((f) => String(f.segmentId) !== String(last.id)));
        await refreshStops();
      }, 'Stop removed'),
    });
  };

  if (loading || notFound) {
    return (
      <OperatorLayout activeItem="schedules" title="Route">
        {notFound ? (
          <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState icon="route" title="Route not found" subtitle="It may have been deleted." action={<Link to={ROUTES.OPERATOR_SCHEDULES} className="font-bold text-primary">Back to routes</Link>} /></div>
        ) : <div className="rounded-2xl border border-slate-200 bg-white"><SkeletonRows rows={5} /></div>}
      </OperatorLayout>
    );
  }

  const tabs = [
    { value: 'departures', label: 'Departures', count: upcoming.length },
    { value: 'points', label: 'Boarding & dropping', count: withoutPoints.length ? `${withoutPoints.length} ⚠` : undefined },
    { value: 'fares', label: 'Fares', count: missingFares.length ? `${missingFares.length} ⚠` : undefined },
    { value: 'stops', label: 'Stops', count: stops.length },
  ];

  const issues = [
    segments.length === 0 && { text: 'Add the route’s stops', tab: 'stops' },
    missingFares.length > 0 && { text: `${missingFares.length} fare${missingFares.length !== 1 ? 's' : ''} missing — those seats can’t be priced`, tab: 'fares' },
    upcoming.length === 0 && { text: 'No upcoming departures', action: openAdd },
    withoutPoints.length > 0 && { text: `${withoutPoints.length} departure${withoutPoints.length !== 1 ? 's have' : ' has'} no boarding or dropping points — hidden from search`, tab: 'points' },
  ].filter(Boolean);

  return (
    <OperatorLayout activeItem="schedules" title={route.name}>
      <div className="space-y-5">
        {/* Header */}
        <section className="relative rounded-2xl bg-primary px-5 sm:px-6 py-6 text-white shadow-sm">
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden="true"><div className="absolute -top-24 -right-10 w-72 h-72 rounded-full bg-[#FF8A65]/15 blur-3xl" /></div>
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <button onClick={() => navigate(ROUTES.OPERATOR_SCHEDULES)} aria-label="Back to routes" className="mt-1 w-9 h-9 flex-shrink-0 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"><span className="material-symbols-outlined text-[20px]">arrow_back</span></button>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#FDBA74]">{route.name}</p>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">{route.origin} <span className="text-white/50">→</span> {route.destination}</h1>
                <p className="mt-1 text-sm text-white/70">{stops.length} stops · {Number(route.totalDistanceKm || segments.reduce((n, s) => n + Number(s.distanceKm || 0), 0))} km · {minutesLabel(tripMinutes)}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={ROUTES.OPERATOR_POLICIES} className={headerButton}><span className="material-symbols-outlined text-[18px]">policy</span>Trip policies</Link>
              <button onClick={openAdd} disabled={segments.length === 0} className={headerPrimaryButton}><span className="material-symbols-outlined text-[18px]">add</span>Add departure</button>
            </div>
          </div>
        </section>

        {/* Readiness */}
        {issues.length ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="flex items-center gap-2 font-black text-amber-900"><span className="material-symbols-outlined text-[20px]">visibility_off</span>{live ? 'Partly on sale' : 'Travellers can’t book this route yet'}</p>
            <ul className="mt-2 space-y-1.5">
              {issues.map((i) => (
                <li key={i.text} className="flex items-start gap-2 text-sm text-amber-900">
                  <span className="mt-2 w-1.5 h-1.5 flex-shrink-0 rounded-full bg-amber-500" />
                  <span>{i.text} <button onClick={() => (i.action ? i.action() : setTab(i.tab))} className="ml-1 font-bold underline">Fix</button></span>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <section className="flex flex-wrap items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm text-green-900">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            <span className="font-black">Live</span> — travellers can find and book this route.
            {withoutDriver.length > 0 && <span className="text-amber-800">· {withoutDriver.length} departure{withoutDriver.length !== 1 ? 's' : ''} still need a driver before starting.</span>}
          </section>
        )}

        <FilterTabs options={tabs} value={tab} onChange={setTab} label="Route sections" />

        {/* ── Departures ── */}
        {tab === 'departures' && (
          <div className="space-y-3">
            {upcoming.length === 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white">
                <EmptyState icon="event_upcoming" title="No upcoming departures" subtitle="Add one to put this route on sale." action={segments.length > 0 && <button onClick={openAdd} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">Add departure</button>} />
              </div>
            )}
            {upcoming.map((s) => {
              const status = String(s.tripStatus || 'SCHEDULED').toUpperCase();
              const meta = TRIP_STATUS[status] || TRIP_STATUS.SCHEDULED;
              const pts = points[s.id] || [];
              const ready = hasPoints(pts);
              const start = startState(s);
              const recurring = s.frequency && s.frequency !== 'ONCE';
              return (
                <article key={s.id} className={`rounded-2xl border bg-white ${s.active === false ? 'border-slate-200 opacity-80' : ready ? 'border-slate-200' : 'border-red-200'}`}>
                  <div className="flex flex-wrap items-start gap-4 px-5 py-4">
                    <div className="min-w-[170px]">
                      <p className="text-xs font-bold text-slate-500">{recurring ? `${FREQUENCY_LABEL[s.frequency] || s.frequency} · next run` : 'One trip'}</p>
                      <p className="text-lg font-black text-slate-900">{istTime(s.departureTime)} <span className="text-slate-300">→</span> {istTime(s.arrivalTime)}</p>
                      <p className="text-sm text-slate-600">{new Date(s.departureTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}{istDate(s.arrivalTime) !== istDate(s.departureTime) && ` → ${new Date(s.arrivalTime).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })}`}</p>
                    </div>
                    <div className="order-3 basis-full sm:order-2 sm:basis-0 min-w-0 flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusPill tone={meta.tone}>{meta.label}{s.delayMinutes ? ` · ${s.delayMinutes} min late` : ''}</StatusPill>
                        {s.active === false && <StatusPill tone="slate">Off sale</StatusPill>}
                        {!ready && <StatusPill tone="red">Hidden — needs points</StatusPill>}
                      </div>
                      <p className="text-sm text-slate-700"><span className="material-symbols-outlined align-[-4px] text-[18px] text-slate-400">directions_bus</span> {s.bus?.name || 'No bus'} <span className="text-slate-400">· {s.bus?.vehicleNumber || s.bus?.busCode} · {prettyType(s.bus?.busType)}</span></p>
                      <p className="text-sm text-slate-700">
                        <span className="material-symbols-outlined align-[-4px] text-[18px] text-slate-400">badge</span>{' '}
                        {s.driverId && s.driverName ? s.driverName.trim() : <span className="font-semibold text-amber-700">No driver yet</span>}
                        <button onClick={() => setDriverDialog({ schedule: s, driverId: s.driverId ? String(s.driverId) : '' })} className="ml-2 text-xs font-bold text-primary hover:underline">{s.driverId ? 'Change' : 'Assign'}</button>
                      </p>
                      <p className="text-sm text-slate-700">
                        <span className="material-symbols-outlined align-[-4px] text-[18px] text-slate-400">pin_drop</span>{' '}
                        {ready ? `${pts.filter((p) => p.type === 'BOARDING').length} boarding · ${pts.filter((p) => p.type === 'DROPPING').length} dropping` : <span className="font-semibold text-red-700">No {pts.some((p) => p.type === 'BOARDING') ? 'dropping' : 'boarding'} points</span>}
                        <button onClick={() => { setPointsFor(String(s.id)); setTab('points'); }} className="ml-2 text-xs font-bold text-primary hover:underline">{ready ? 'Edit' : 'Add points'}</button>
                      </p>
                    </div>
                    <label className="order-2 sm:order-3 ml-auto flex items-center gap-2 text-xs font-bold text-slate-600">
                      <span>On sale</span>
                      <button role="switch" aria-checked={s.active !== false} disabled={busy || status === 'STARTED'} onClick={() => toggleSale(s)}
                        className={`relative h-6 w-11 rounded-full transition-colors disabled:opacity-40 ${s.active !== false ? 'bg-green-500' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${s.active !== false ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </label>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-3">
                    <ActionButton icon="group" onClick={() => setManifestFor(s)}>Passengers</ActionButton>
                    {start.show && (
                      <span className="inline-flex items-center gap-2">
                        <button onClick={() => askStart(s)} disabled={busy || start.disabled} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"><span className="material-symbols-outlined text-[16px]">play_arrow</span>Start trip</button>
                        {start.hint && <span className="text-xs text-slate-500">{start.hint}</span>}
                      </span>
                    )}
                    {status === 'STARTED' && <ActionButton icon="task_alt" tone="approve" disabled={busy} onClick={() => askComplete(s)}>Complete trip</ActionButton>}
                    {status === 'STARTED' && <ActionButton icon="my_location" onClick={() => shareLocation(s)}>Share location</ActionButton>}
                    <ActionButton icon="schedule" tone="warn" onClick={() => setDelayDialog({ schedule: s, minutes: s.delayMinutes ? String(s.delayMinutes) : '', reason: s.delayReason || '' })}>{s.delayMinutes ? 'Update delay' : 'Report delay'}</ActionButton>
                    <span className="ml-auto flex gap-2">
                      {status !== 'STARTED' && <ActionButton icon="edit" onClick={() => setDepDialog({ id: s.id, value: departureFromSchedule(s), error: '' })}>Edit</ActionButton>}
                      {status !== 'STARTED' && <ActionButton icon="delete" tone="danger" onClick={() => askDelete(s)}>Delete</ActionButton>}
                    </span>
                  </div>
                </article>
              );
            })}

            {past.length > 0 && (
              <div className="rounded-2xl border border-slate-200 bg-white">
                <button onClick={() => setShowPast((v) => !v)} className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-bold text-slate-600">
                  Completed trips ({past.length})<span className="material-symbols-outlined">{showPast ? 'expand_less' : 'expand_more'}</span>
                </button>
                {showPast && (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {past.slice(0, 30).map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                        <span className="font-bold text-slate-800">{istDateTime(s.departureTime)}</span>
                        <span className="text-slate-500">{s.bus?.name}</span>
                        <span className="text-slate-500">{s.driverName}</span>
                        <span className="ml-auto"><StatusPill tone={(TRIP_STATUS[String(s.tripStatus).toUpperCase()] || TRIP_STATUS.COMPLETED).tone}>{(TRIP_STATUS[String(s.tripStatus).toUpperCase()] || TRIP_STATUS.COMPLETED).label}</StatusPill></span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Boarding & dropping ── */}
        {tab === 'points' && (
          upcoming.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white"><EmptyState icon="pin_drop" title="Add a departure first" subtitle="Boarding and dropping points belong to each departure." /></div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4">
                <div className="min-w-[240px] flex-1">
                  <label className={LABEL} htmlFor="pts-dep">Departure</label>
                  <select id="pts-dep" value={sid || ''} onChange={(e) => setPointsFor(e.target.value)} className={INPUT}>
                    {upcoming.map((s) => <option key={s.id} value={s.id}>{hasPoints(points[s.id]) ? '' : '⚠ '}{istDateTime(s.departureTime)} · {s.bus?.name}{s.frequency && s.frequency !== 'ONCE' ? ` · ${FREQUENCY_LABEL[s.frequency]}` : ''}</option>)}
                  </select>
                </div>
                {upcoming.length > 1 && hasPoints(points[sid]) && <ActionButton icon="content_copy" onClick={askCopyPoints}>Use on all departures</ActionButton>}
              </div>
              <p className="text-sm text-slate-600">Travellers pick one boarding and one dropping point when booking. Times are when the bus reaches each point (IST). Daily departures carry these points forward automatically.</p>
              <PointsEditor
                key={sid}
                points={points[sid] || []}
                departureTime={isoToIst(selectedForPoints?.departureTime).time}
                busy={busy}
                onAdd={onAddPoint}
                onSave={onSavePoint}
                onDelete={onDeletePoint}
                suggestions={{
                  BOARDING: { name: stops[0] || '', arrivalTime: isoToIst(selectedForPoints?.departureTime).time },
                  DROPPING: { name: stops[stops.length - 1] || '', arrivalTime: isoToIst(selectedForPoints?.arrivalTime).time },
                }}
              />
            </div>
          )
        )}

        {/* ── Fares ── */}
        {tab === 'fares' && (
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <p className="text-sm text-slate-600 max-w-xl">Base fare for each stretch. A ticket adds up the stretches it covers, plus GST. Seat types follow your buses: {neededTypes.map((t) => SEAT_TYPE_LABEL[t].toLowerCase()).join(', ')}.</p>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">GST
                <input type="number" min="0" max="28" value={gstValue} onChange={(e) => setGst(e.target.value)} aria-label="GST percent" className={`${INPUT.replace('w-full', '')} w-20 py-1.5`} />%
              </label>
            </div>
            {segments.length === 0 ? <EmptyState icon="payments" title="Add stops first" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-500">
                      <th className="px-5 py-3">Stretch</th>
                      {neededTypes.map((t) => <th key={t} className="px-3 py-3 w-36">{SEAT_TYPE_LABEL[t]}</th>)}
                      {legacyTypes.map((t) => (
                        <th key={t} className="px-3 py-3 w-36 text-slate-400">
                          {prettyType(t)} <span className="font-semibold">(old)</span>
                          {missingFares.length === 0 && <button onClick={() => askRemoveFareType(t)} className="ml-1 text-red-600 hover:underline">Remove</button>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {segments.map((s) => (
                      <tr key={s.id}>
                        <td className="px-5 py-3"><span className="font-bold text-slate-800">{s.fromStop} → {s.toStop}</span><span className="block text-xs text-slate-400">{Number(s.distanceKm)} km · {minutesLabel(s.durationMinutes)}</span></td>
                        {neededTypes.map((t) => {
                          const missing = !fareOf(s.id, t) && !fareDraft[fareKey(s.id, t)];
                          return (
                            <td key={t} className="px-3 py-3">
                              <div className="relative">
                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                                <input type="number" min="1" inputMode="numeric" value={fareValue(s.id, t)} onChange={(e) => setFareDraft((d) => ({ ...d, [fareKey(s.id, t)]: e.target.value }))}
                                  aria-label={`${SEAT_TYPE_LABEL[t]} fare ${s.fromStop} to ${s.toStop}`} placeholder="Missing" className={`${INPUT} pl-7 ${missing ? 'border-red-300 bg-red-50/50 placeholder:text-red-400' : ''}`} />
                              </div>
                            </td>
                          );
                        })}
                        {legacyTypes.map((t) => { const f = fareOf(s.id, t); return <td key={t} className="px-3 py-3 text-slate-500">{f ? rupees(f.baseFare) : '—'}</td>; })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-black text-slate-900">
                      <td className="px-5 py-3">Full trip</td>
                      {neededTypes.map((t) => {
                        const total = segments.reduce((n, s) => n + (Number(fareValue(s.id, t)) || 0), 0);
                        return <td key={t} className="px-3 py-3">{rupees(total)}<span className="block text-xs font-semibold text-slate-500">{rupees(total * (1 + (Number(gstValue) || 0) / 100))} with GST</span></td>;
                      })}
                      {legacyTypes.map((t) => <td key={t} />)}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            {fares.some((f) => f.busId) && (
              <div className="border-t border-slate-100 px-5 py-4">
                <p className="text-xs font-black text-slate-700">Bus-specific prices (override the table for one bus)</p>
                <ul className="mt-2 space-y-1.5">
                  {fares.filter((f) => f.busId).map((f) => {
                    const seg = segments.find((s) => String(s.id) === String(f.segmentId));
                    const b = buses.find((x) => String(x.id) === String(f.busId)) || upcoming.find((x) => String(x.bus?.id) === String(f.busId))?.bus;
                    return (
                      <li key={f.id} className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                        {b?.name || 'Bus'} · {seg ? `${seg.fromStop} → ${seg.toStop}` : 'Stretch'} · {SEAT_TYPE_LABEL[f.seatType] || prettyType(f.seatType)} · <span className="font-bold">{rupees(f.baseFare)}</span>
                        <button onClick={() => run(async () => { await deleteFare(routeId, f.id); setFares((p) => p.filter((x) => x.id !== f.id)); }, 'Price removed')} className="text-xs font-bold text-red-600 hover:underline">Remove</button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {(dirtyFares.length > 0 || gst !== '') && (
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
                <button onClick={() => { setFareDraft({}); setGst(''); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Discard</button>
                <button onClick={saveFares} disabled={busy || (dirtyFares.length === 0)} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save {dirtyFares.length || ''} fare{dirtyFares.length !== 1 ? 's' : ''}</button>
              </div>
            )}
          </section>
        )}

        {/* ── Stops ── */}
        {tab === 'stops' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <ol>
              {stops.map((name, i) => {
                const seg = segments[i];
                const first = i === 0;
                const last = i === stops.length - 1;
                return (
                  <li key={`${name}-${i}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center ${first ? 'bg-primary text-white' : last ? 'bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] text-primary' : 'border-2 border-primary bg-white text-primary'}`}>
                        <span className="material-symbols-outlined text-[16px]">{first ? 'trip_origin' : last ? 'location_on' : 'radio_button_unchecked'}</span>
                      </span>
                      <span className="font-black text-slate-900">{name}</span>
                      {first && <span className="text-xs text-slate-400">Start</span>}
                      {last && <span className="text-xs text-slate-400">End</span>}
                      <button onClick={() => setStopDialog({ kind: 'rename', index: i, name })} aria-label={`Rename ${name}`} className="w-7 h-7 rounded-lg text-slate-400 hover:bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">edit</span></button>
                      {last && segments.length > 1 && <button onClick={askRemoveLast} aria-label={`Remove ${name}`} className="w-7 h-7 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">delete</span></button>}
                    </div>
                    {seg && (
                      <div className="ml-3.5 flex items-center gap-3 border-l-2 border-dashed border-slate-200 py-3 pl-6 text-sm text-slate-500">
                        {Number(seg.distanceKm)} km · {minutesLabel(seg.durationMinutes)}
                        <button onClick={() => setStopDialog({ kind: 'leg', seg, km: String(Number(seg.distanceKm) || ''), mins: String(seg.durationMinutes || '') })} className="text-xs font-bold text-primary hover:underline">Edit</button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
            <button onClick={() => setStopDialog({ kind: 'extend', name: '', km: '', mins: '' })} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-primary hover:text-primary">
              <span className="material-symbols-outlined text-[18px]">add_location_alt</span>Extend the route past {stops[stops.length - 1]}
            </button>
            <p className="mt-3 text-xs text-slate-500">Stop names are what travellers search for. Once a route has bookings, stops can’t be renamed or removed — create a new route instead.</p>
          </section>
        )}
      </div>

      {/* Dialogs */}
      {depDialog && (
        <Modal wide title={depDialog.id ? 'Edit departure' : 'Add departure'} onClose={() => setDepDialog(null)}
          footer={<>
            <button onClick={() => setDepDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={saveDeparture} disabled={busy} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : depDialog.id ? 'Save' : 'Add departure'}</button>
          </>}>
          <DepartureFields value={depDialog.value} onChange={(value) => setDepDialog((d) => ({ ...d, value, error: '' }))} buses={buses} tripMinutes={tripMinutes} />
          {!depDialog.id && <p className="mt-4 text-xs text-slate-500">{lastWithPoints ? 'Boarding and dropping points are copied from your other departure.' : 'Next, add boarding and dropping points — the bus isn’t shown to travellers until it has them.'}</p>}
          {depDialog.error && <p role="alert" className="mt-3 text-sm font-semibold text-red-600">{depDialog.error}</p>}
        </Modal>
      )}

      {driverDialog && (
        <Modal title="Assign driver" onClose={() => setDriverDialog(null)}
          footer={<>
            <button onClick={() => setDriverDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={saveDriver} disabled={busy || !driverDialog.driverId} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Assign</button>
          </>}>
          <p className="mb-3 text-sm text-slate-600">The driver is assigned to <span className="font-bold">{driverDialog.schedule.bus?.name}</span>, so it applies to all of this bus’s departures.</p>
          {drivers.length === 0 ? (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">No drivers yet. <Link to={ROUTES.OPERATOR_DRIVERS} className="font-bold underline">Add a driver</Link>.</p>
          ) : (
            <div className="space-y-2" role="radiogroup" aria-label="Driver">
              {drivers.map((d) => {
                const expired = licenceExpired(d);
                const on = String(driverDialog.driverId) === String(d.id);
                return (
                  <button key={d.id} type="button" role="radio" aria-checked={on} disabled={expired} onClick={() => setDriverDialog((x) => ({ ...x, driverId: String(d.id) }))}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${on ? 'border-primary ring-2 ring-primary/15' : 'border-slate-200 hover:border-slate-300'}`}>
                    <span className={`w-4 h-4 rounded-full border-2 ${on ? 'border-primary bg-primary' : 'border-slate-300'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900">{d.firstName} {d.lastName}</span>
                      <span className="block text-xs text-slate-500">{d.phone}{d.assignedBusName ? ` · now on ${d.assignedBusName}` : ''}</span>
                    </span>
                    {expired && <StatusPill tone="red">Licence expired</StatusPill>}
                  </button>
                );
              })}
            </div>
          )}
        </Modal>
      )}

      {delayDialog && (
        <Modal title="Report a delay" onClose={() => setDelayDialog(null)}
          footer={<>
            <button onClick={() => setDelayDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={saveDelay} disabled={busy} className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save</button>
          </>}>
          <p className="mb-3 text-sm text-slate-600">Travellers on the {istDateTime(delayDialog.schedule.departureTime)} departure see the delay on their ticket and tracking page.</p>
          <p className={LABEL}>How late?</p>
          <div className="flex flex-wrap gap-2">
            {[15, 30, 45, 60, 90, 120].map((m) => (
              <button key={m} type="button" onClick={() => setDelayDialog((d) => ({ ...d, minutes: String(m) }))} className={`rounded-full border px-3 py-1.5 text-sm font-bold ${delayDialog.minutes === String(m) ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-200 text-slate-600'}`}>{minutesLabel(m)}</button>
            ))}
            <input type="number" min="0" max="1440" value={delayDialog.minutes} onChange={(e) => setDelayDialog((d) => ({ ...d, minutes: e.target.value }))} aria-label="Delay in minutes" placeholder="min" className={`${INPUT.replace('w-full', '')} w-24 py-1.5`} />
          </div>
          <label className={`${LABEL} mt-4`} htmlFor="delay-reason">Reason</label>
          <div className="mb-2 flex flex-wrap gap-2">
            {['Traffic', 'Weather', 'Breakdown', 'Late boarding'].map((r) => (
              <button key={r} type="button" onClick={() => setDelayDialog((d) => ({ ...d, reason: r }))} className={`rounded-full border px-3 py-1 text-xs font-bold ${delayDialog.reason === r ? 'border-primary bg-primary text-white' : 'border-slate-200 text-slate-600'}`}>{r}</button>
            ))}
          </div>
          <input id="delay-reason" value={delayDialog.reason} onChange={(e) => setDelayDialog((d) => ({ ...d, reason: e.target.value }))} placeholder="Or type a reason" className={INPUT} />
          {delayDialog.schedule.delayMinutes > 0 && <p className="mt-3 text-xs text-slate-500">Set 0 to clear the delay.</p>}
        </Modal>
      )}

      {stopDialog && (
        <Modal title={stopDialog.kind === 'leg' ? `${stopDialog.seg.fromStop} → ${stopDialog.seg.toStop}` : stopDialog.kind === 'rename' ? 'Rename stop' : 'Extend the route'} onClose={() => setStopDialog(null)}
          footer={<>
            <button onClick={() => setStopDialog(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600">Cancel</button>
            <button onClick={saveStopDialog} disabled={busy} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">Save</button>
          </>}>
          {stopDialog.kind !== 'leg' && (
            <>
              <label className={LABEL} htmlFor="stop-name">{stopDialog.kind === 'extend' ? `Next stop after ${stops[stops.length - 1]}` : 'Stop name'}</label>
              <input id="stop-name" autoFocus value={stopDialog.name} onChange={(e) => setStopDialog((d) => ({ ...d, name: e.target.value }))} className={INPUT} />
            </>
          )}
          {stopDialog.kind !== 'rename' && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div><label className={LABEL} htmlFor="stop-km">Distance (km)</label><input id="stop-km" type="number" min="1" value={stopDialog.km} onChange={(e) => setStopDialog((d) => ({ ...d, km: e.target.value }))} className={INPUT} /></div>
              <div><label className={LABEL} htmlFor="stop-min">Travel time (min)</label><input id="stop-min" type="number" min="1" value={stopDialog.mins} onChange={(e) => setStopDialog((d) => ({ ...d, mins: e.target.value }))} className={INPUT} /></div>
            </div>
          )}
          {stopDialog.kind === 'extend' && <p className="mt-3 text-xs text-slate-500">Then add fares for the new stretch in the Fares tab.</p>}
        </Modal>
      )}

      {manifestFor && <PassengerManifest schedule={manifestFor} route={route} onClose={() => setManifestFor(null)} />}

      {confirm && (
        <ConfirmDialog title={confirm.title} message={confirm.message} confirmLabel={confirm.label} tone={confirm.tone} busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => { const ok = await confirm.run(); if (ok !== false) setConfirm(null); }} />
      )}
    </OperatorLayout>
  );
};

export default RouteDetail;
