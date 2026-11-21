import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getBuses } from '../../../api/busService';
import { addFare, addPoint, addSegment, createRoute, createSchedule, getCities, recomputeDistance } from '../../../api/routeService';
import { assignDriverToSchedule, getDrivers } from '../../../api/operatorDriverService';
import { ROUTES } from '../../../shared/constants/routes';
import BusWizardHeader from '../components/BusWizardHeader';
import DepartureFields from '../components/DepartureFields';
import PointsEditor from '../components/PointsEditor';
import {
  fareSeatTypesFor, istToIso, minutesLabel, prettyType, rupees, SEAT_TYPE_LABEL, todayIst,
} from '../utils/operatorFormat';
import {
  departureError, departurePayload, emptyDeparture, FREQUENCIES, INPUT, LABEL, pointError, pointPayload, toList,
} from '../utils/routeForms';

const STEPS = ['Route & bus', 'Stops', 'Fares', 'Departure', 'Pickup & drop'];
const norm = (v) => String(v || '').trim().toLowerCase();
const leg = (to = '') => ({ to, km: '', mins: '' });

const CreateRoute = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [buses, setBuses] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [cities, setCities] = useState([]);

  const [route, setRoute] = useState({ name: '', origin: '', destination: '' });
  const [busId, setBusId] = useState('');
  const [legs, setLegs] = useState([leg()]); // last leg always ends at the destination
  const [fares, setFares] = useState({}); // { [legIndex]: { [seatType]: '450' } }
  const [gst, setGst] = useState('5');
  const [departure, setDeparture] = useState(emptyDeparture());
  const [driverId, setDriverId] = useState('');
  const [points, setPoints] = useState([]);

  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState('');
  // What has already been saved, so "Try again" after a failure resumes instead of duplicating
  const saved = useRef({ routeId: null, segmentIds: [], fares: {}, scheduleId: null, points: 0, driver: false });
  const [routeSaved, setRouteSaved] = useState(false);

  useEffect(() => {
    getBuses().then((d) => setBuses(toList(d).filter((b) => b.active))).catch(() => setBuses([]));
    getDrivers().then((d) => setDrivers(toList(d))).catch(() => {});
    getCities().then((c) => setCities(Array.isArray(c) ? c : [])).catch(() => {});
  }, []);

  const bus = buses?.find((b) => String(b.id) === String(busId));
  const seatTypes = fareSeatTypesFor(bus?.busType);
  const stopNames = [route.origin, ...legs.map((l, i) => (i === legs.length - 1 ? route.destination : l.to))];
  const totalKm = legs.reduce((n, l) => n + (Number(l.km) || 0), 0);
  const totalMins = legs.reduce((n, l) => n + (Number(l.mins) || 0), 0);
  const fullFare = (type) => legs.reduce((n, _, i) => n + (Number(fares[i]?.[type]) || 0), 0);
  const busDriver = drivers.find((d) => String(d.assignedBusId) === String(busId));

  const stepError = (s) => {
    if (s === 0) {
      if (String(route.name).trim().length < 3) return 'Give the route a name (at least 3 letters)';
      if (!route.origin.trim() || !route.destination.trim()) return 'Add where the route starts and ends';
      if (norm(route.origin) === norm(route.destination)) return 'Start and end can’t be the same place';
      if (!busId) return 'Choose the bus that runs this route';
    }
    if (s === 1) {
      for (let i = 0; i < legs.length; i++) {
        const name = stopNames[i + 1];
        if (!String(name).trim()) return `Name stop ${i + 1}`;
        if (!(Number(legs[i].km) > 0)) return `Add the distance from ${stopNames[i]} to ${name}`;
        if (!(Number(legs[i].mins) > 0)) return `Add the travel time from ${stopNames[i]} to ${name}`;
      }
      if (new Set(stopNames.map(norm)).size !== stopNames.length) return 'Each stop can appear only once';
    }
    if (s === 2) {
      for (let i = 0; i < legs.length; i++) {
        for (const t of seatTypes) {
          if (!(Number(fares[i]?.[t]) > 0)) return `Add the ${SEAT_TYPE_LABEL[t].toLowerCase()} fare for ${stopNames[i]} → ${stopNames[i + 1]}`;
        }
      }
      if (!(Number(gst) >= 0 && Number(gst) <= 28)) return 'GST must be between 0% and 28%';
    }
    if (s === 3) return departureError(departure);
    if (s === 4) {
      if (!points.some((p) => p.type === 'BOARDING')) return 'Add at least one boarding point';
      if (!points.some((p) => p.type === 'DROPPING')) return 'Add at least one dropping point';
      const bad = points.find((p) => pointError(p));
      if (bad) return `${bad.name || 'A point'}: ${pointError(bad)}`;
    }
    return '';
  };

  const next = () => {
    const e = stepError(step);
    if (e) { setError(e); return; }
    setError('');
    if (step === 0) setDeparture((d) => ({ ...d, busId }));
    if (step === 3 && points.length === 0) {
      // Start with the obvious two: board at the origin when the bus leaves, get off at the destination
      setPoints([
        { type: 'BOARDING', name: route.origin.trim(), arrivalTime: departure.depTime, landmark: '', address: '' },
        { type: 'DROPPING', name: route.destination.trim(), arrivalTime: departure.arrTime, landmark: '', address: '' },
      ]);
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const back = () => { setError(''); if (step === 0) navigate(ROUTES.OPERATOR_SCHEDULES); else setStep((s) => s - 1); };

  const setLeg = (i, patch) => setLegs((prev) => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const insertStop = () => { setLegs((prev) => [...prev.slice(0, -1), leg(), prev[prev.length - 1]]); setFares({}); };
  const removeLeg = (i) => {
    setLegs((prev) => prev.filter((_, j) => j !== i));
    setFares({}); // stretches changed — fares are per stretch
  };
  const setFare = (i, type, v) => setFares((prev) => ({ ...prev, [i]: { ...(prev[i] || {}), [type]: v } }));

  const publish = async () => {
    for (let s = 0; s < STEPS.length; s++) {
      const e = stepError(s);
      if (e) { setStep(s); setError(e); return; }
    }
    setError('');
    const st = saved.current;
    try {
      if (!st.routeId) {
        setPublishing('Saving the route…');
        const r = await createRoute({ name: route.name.trim(), origin: route.origin.trim(), destination: route.destination.trim() });
        st.routeId = r.id;
        setRouteSaved(true);
      }
      for (let i = st.segmentIds.length; i < legs.length; i++) {
        setPublishing(`Saving stops (${i + 1} of ${legs.length})…`);
        const seg = await addSegment(st.routeId, { fromStop: stopNames[i].trim(), toStop: stopNames[i + 1].trim(), distanceKm: Number(legs[i].km), durationMinutes: Number(legs[i].mins) });
        st.segmentIds.push(seg.id);
        if (st.segmentIds.length === legs.length) recomputeDistance(st.routeId).catch(() => {});
      }
      setPublishing('Saving fares…');
      for (let i = 0; i < legs.length; i++) {
        for (const t of seatTypes) {
          const key = `${i}:${t}`;
          const amount = Number(fares[i][t]);
          if (st.fares[key] === `${amount}@${gst}`) continue;
          await addFare(st.routeId, { segmentId: st.segmentIds[i], seatType: t, baseFare: amount, gstPercent: Number(gst), busId: null });
          st.fares[key] = `${amount}@${gst}`;
        }
      }
      if (!st.scheduleId) {
        setPublishing('Creating the departure…');
        const sch = await createSchedule(st.routeId, departurePayload(departure));
        st.scheduleId = sch.id;
      }
      for (let i = st.points; i < points.length; i++) {
        setPublishing(`Adding boarding & dropping points (${i + 1} of ${points.length})…`);
        await addPoint(st.scheduleId, pointPayload(points[i]));
        st.points = i + 1;
      }
      if (driverId && !st.driver) {
        setPublishing('Assigning the driver…');
        await assignDriverToSchedule(st.scheduleId, driverId);
        st.driver = true;
      }
      toast.success('Route published — travellers can now find and book it');
      navigate(ROUTES.OPERATOR_ROUTE_DETAIL.replace(':routeId', st.routeId));
    } catch (e) {
      setError(`${e.message || 'Something went wrong'}. Everything before this step is saved — fix it and press “Publish route” again.`);
    } finally {
      setPublishing('');
    }
  };

  const stepTitle = ['Name the route and pick its bus', 'Every stop, in order', 'What each stretch costs', 'When the bus leaves', 'Where travellers get on and off'][step];

  return (
    <OperatorLayout activeItem="schedules" title="Create route">
      <div className="mx-auto max-w-3xl space-y-5 pb-24">
        <BusWizardHeader step={step} steps={STEPS} label="Create route steps" title="Create a route" subtitle={stepTitle} onBack={back} />

        {routeSaved && step <= 1 && (
          <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-800">The route and its stops are already saved. To change them, finish publishing and edit them on the route page.</p>
        )}

        {/* Step 1 — route & bus */}
        {step === 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <datalist id="tg-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="r-origin">Starts at</label>
                <input id="r-origin" list="tg-cities" disabled={routeSaved} value={route.origin} onChange={(e) => setRoute((r) => ({ ...r, origin: e.target.value }))} placeholder="e.g. Bangalore" className={INPUT} />
              </div>
              <div>
                <label className={LABEL} htmlFor="r-dest">Ends at</label>
                <input id="r-dest" list="tg-cities" disabled={routeSaved} value={route.destination} onChange={(e) => setRoute((r) => ({ ...r, destination: e.target.value }))} placeholder="e.g. Honnavar" className={INPUT} />
              </div>
            </div>
            <p className="-mt-1 text-xs text-slate-500">Travellers search by these names, so use the common spelling (e.g. “Bangalore”, not “Blr”).</p>
            <div>
              <label className={LABEL} htmlFor="r-name">Route name</label>
              <input id="r-name" disabled={routeSaved} value={route.name} onChange={(e) => setRoute((r) => ({ ...r, name: e.target.value }))}
                onFocus={() => { if (!route.name && route.origin && route.destination) setRoute((r) => ({ ...r, name: `${r.origin.trim()} – ${r.destination.trim()}` })); }}
                placeholder="e.g. Bangalore – Honnavar Express" className={INPUT} />
              <p className="mt-1 text-xs text-slate-500">Only you see this name.</p>
            </div>
            <div>
              <p className={LABEL}>Bus</p>
              {buses === null ? <div className="h-16 rounded-xl bg-slate-100 animate-pulse" /> : buses.length === 0 ? (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">You need an approved bus first. <Link to={ROUTES.OPERATOR_ADD_BUS} className="font-bold underline">Add a bus</Link> — an admin reviews it, then come back here.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Bus">
                  {buses.map((b) => {
                    const on = String(b.id) === String(busId);
                    return (
                      <button key={b.id} type="button" role="radio" aria-checked={on} disabled={routeSaved && !on} onClick={() => { setBusId(String(b.id)); setFares({}); }}
                        className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-40 ${on ? 'border-primary ring-2 ring-primary/15 bg-primary/[0.03]' : 'border-slate-200 hover:border-slate-300'}`}>
                        <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${on ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}><span className="material-symbols-outlined text-[20px]">directions_bus</span></span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-slate-900 truncate">{b.name}</span>
                          <span className="block text-xs text-slate-500 truncate">{b.vehicleNumber || b.busCode} · {prettyType(b.busType)} · {b.totalSeats} seats</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 2 — stops */}
        {step === 1 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <p className="mb-4 text-sm text-slate-600">Add every town where travellers can get on or off. Travellers can book any stretch, e.g. {route.origin || 'A'} → {stopNames[1] || 'B'}.</p>
            <ol className="relative">
              <li className="flex items-center gap-3 pb-2">
                <span className="w-7 h-7 flex-shrink-0 rounded-full bg-primary text-white flex items-center justify-center"><span className="material-symbols-outlined text-[16px]">trip_origin</span></span>
                <span className="font-black text-slate-900">{route.origin}</span>
                <span className="text-xs text-slate-400">Start</span>
              </li>
              {legs.map((l, i) => {
                const last = i === legs.length - 1;
                return (
                  <li key={i} className="relative pl-3.5">
                    <div className="ml-0 border-l-2 border-dashed border-slate-200 pl-6 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <input type="number" min="1" inputMode="numeric" value={l.km} disabled={routeSaved} onChange={(e) => setLeg(i, { km: e.target.value })} aria-label={`Distance to stop ${i + 1}`} className={`${INPUT.replace('w-full', '')} w-24 py-1.5`} placeholder="0" />km
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                          <input type="number" min="1" inputMode="numeric" value={l.mins} disabled={routeSaved} onChange={(e) => setLeg(i, { mins: e.target.value })} aria-label={`Minutes to stop ${i + 1}`} className={`${INPUT.replace('w-full', '')} w-24 py-1.5`} placeholder="0" />min
                        </label>
                        {Number(l.mins) > 0 && <span className="text-xs text-slate-400">{minutesLabel(l.mins)}</span>}
                      </div>
                    </div>
                    <div className="-ml-3.5 flex items-center gap-3 py-1">
                      <span className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center ${last ? 'bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] text-primary' : 'bg-white border-2 border-primary text-primary'}`}>
                        <span className="material-symbols-outlined text-[16px]">{last ? 'location_on' : 'radio_button_unchecked'}</span>
                      </span>
                      {last ? (
                        <><span className="font-black text-slate-900">{route.destination}</span><span className="text-xs text-slate-400">End</span></>
                      ) : (
                        <>
                          <input list="tg-cities" value={l.to} disabled={routeSaved} onChange={(e) => setLeg(i, { to: e.target.value })} placeholder={`Stop ${i + 1}, e.g. Shivamogga`} aria-label={`Stop ${i + 1}`} className={`${INPUT} max-w-xs py-2`} />
                          {!routeSaved && <button type="button" onClick={() => removeLeg(i)} aria-label={`Remove stop ${i + 1}`} className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center"><span className="material-symbols-outlined text-[18px]">close</span></button>}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <datalist id="tg-cities">{cities.map((c) => <option key={c} value={c} />)}</datalist>
            {!routeSaved && (
              <button type="button" onClick={insertStop} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-600 hover:border-primary hover:text-primary">
                <span className="material-symbols-outlined text-[18px]">add_location_alt</span>Add a stop before {route.destination}
              </button>
            )}
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <span className="font-black">{legs.length + 1} stops</span> · {totalKm} km · {minutesLabel(totalMins)} driving
            </p>
          </section>
        )}

        {/* Step 3 — fares */}
        {step === 2 && (
          <section className="rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <p className="text-sm text-slate-600">Base fare per {seatTypes.length > 1 ? 'berth' : 'seat'} for each stretch. A ticket costs the stretches it covers, plus GST.</p>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-600">GST
                <input type="number" min="0" max="28" value={gst} onChange={(e) => setGst(e.target.value)} className={`${INPUT.replace('w-full', '')} w-20 py-1.5`} aria-label="GST percent" />%
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold text-slate-500">
                    <th className="px-5 py-3">Stretch</th>
                    {seatTypes.map((t) => <th key={t} className="px-3 py-3 w-36">{SEAT_TYPE_LABEL[t]}</th>)}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {legs.map((l, i) => (
                    <tr key={i}>
                      <td className="px-5 py-3">
                        <span className="font-bold text-slate-800">{stopNames[i]} → {stopNames[i + 1]}</span>
                        <span className="block text-xs text-slate-400">{l.km} km · {minutesLabel(l.mins)}</span>
                      </td>
                      {seatTypes.map((t) => (
                        <td key={t} className="px-3 py-3">
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">₹</span>
                            <input type="number" min="1" inputMode="numeric" value={fares[i]?.[t] || ''} onChange={(e) => setFare(i, t, e.target.value)} aria-label={`${SEAT_TYPE_LABEL[t]} fare ${stopNames[i]} to ${stopNames[i + 1]}`} className={`${INPUT} pl-7`} placeholder="0" />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 font-black text-slate-900">
                    <td className="px-5 py-3">Full trip {route.origin} → {route.destination}</td>
                    {seatTypes.map((t) => <td key={t} className="px-3 py-3">{rupees(fullFare(t))}<span className="block text-xs font-semibold text-slate-500">{rupees(fullFare(t) * (1 + (Number(gst) || 0) / 100))} with GST</span></td>)}
                  </tr>
                </tfoot>
              </table>
            </div>
            {seatTypes.length > 1 && legs.some((_, i) => fares[i]?.LOWER && !fares[i]?.UPPER) && (
              <div className="border-t border-slate-100 px-5 py-3">
                <button type="button" onClick={() => setFares((prev) => Object.fromEntries(legs.map((_, i) => [i, { ...prev[i], UPPER: prev[i]?.UPPER || prev[i]?.LOWER || '' }])))} className="text-sm font-bold text-primary hover:underline">
                  Use the lower-berth fares for upper berths too
                </button>
              </div>
            )}
          </section>
        )}

        {/* Step 4 — departure */}
        {step === 3 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
            <DepartureFields value={departure} onChange={setDeparture} buses={buses || []} tripMinutes={totalMins} lockBus />
            <div className="border-t border-slate-100 pt-4">
              <label className={LABEL} htmlFor="r-driver">Driver <span className="font-semibold text-slate-400">(can be added later)</span></label>
              {busDriver ? (
                <p className="text-sm text-slate-700"><span className="font-bold">{busDriver.firstName} {busDriver.lastName}</span> already drives {bus?.name}.</p>
              ) : (
                <select id="r-driver" value={driverId} onChange={(e) => setDriverId(e.target.value)} className={INPUT}>
                  <option value="">Assign later</option>
                  {drivers.filter((d) => !d.licenseExpiry || d.licenseExpiry >= todayIst()).map((d) => (
                    <option key={d.id} value={d.id}>{d.firstName} {d.lastName} · {d.phone}{d.assignedBusName ? ` (now on ${d.assignedBusName})` : ''}</option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs text-slate-500">A driver must be assigned before you can start the trip. Travellers get the driver’s details with their ticket.</p>
            </div>
          </section>
        )}

        {/* Step 5 — boarding & dropping */}
        {step === 4 && (
          <section className="space-y-4">
            <p className="rounded-xl bg-white border border-slate-200 px-4 py-3 text-sm text-slate-600">
              Travellers must pick one boarding and one dropping point to book, so both lists need at least one point. Times are when the bus reaches each point (IST).
            </p>
            <PointsEditor
              points={points}
              departureTime={departure.depTime}
              onAdd={(p) => setPoints((prev) => [...prev, p])}
              onSave={(orig, p) => setPoints((prev) => prev.map((x) => (x === orig ? p : x)))}
              onDelete={(p) => setPoints((prev) => prev.filter((x) => x !== p))}
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-black text-slate-900">Ready to publish</p>
              <ul className="mt-2 grid gap-1.5 text-sm text-slate-600 sm:grid-cols-2">
                <li>{route.origin} → {route.destination} · {legs.length + 1} stops</li>
                <li>{bus?.name} · {prettyType(bus?.busType)}</li>
                <li>Full trip from {rupees(Math.min(...seatTypes.map(fullFare)))} + GST</li>
                <li>First departure {departure.depDate && departure.depTime ? new Date(istToIso(departure.depDate, departure.depTime)).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : ''} · {(FREQUENCIES.find(([k]) => k === departure.frequency)?.[1] || '').toLowerCase()}</li>
              </ul>
            </div>
          </section>
        )}

        {error && (
          <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <span className="material-symbols-outlined text-[18px]">error</span>{error}
          </p>
        )}
      </div>

      {/* Sticky actions */}
      <div className="fixed inset-x-0 bottom-[calc(65px+env(safe-area-inset-bottom))] md:bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:pl-64">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={back} disabled={Boolean(publishing)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <span className="hidden sm:block text-xs font-bold text-slate-400">Step {step + 1} of {STEPS.length}</span>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C]">
              Next: {STEPS[step + 1]}<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          ) : (
            <button type="button" onClick={publish} disabled={Boolean(publishing)} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] px-5 py-2.5 text-sm font-black text-primary hover:brightness-105 disabled:opacity-60">
              <span className="material-symbols-outlined text-[18px]">{publishing ? 'progress_activity' : 'rocket_launch'}</span>
              {publishing || 'Publish route'}
            </button>
          )}
        </div>
      </div>
    </OperatorLayout>
  );
};

export default CreateRoute;
