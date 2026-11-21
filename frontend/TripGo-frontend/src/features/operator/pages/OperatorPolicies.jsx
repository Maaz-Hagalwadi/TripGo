import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getAllSchedules, getRoutes } from '../../../api/routeService';
import { getSchedulePolicies, updateSchedulePolicies } from '../../../api/bookingService';
import { Card, EmptyState, PageHeader } from '../../../shared/components/console/ConsoleUI';
import { FREQUENCY_LABEL, istDate, istTime } from '../utils/operatorFormat';

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50 disabled:text-slate-400';
const LABEL = 'mb-1.5 block text-xs font-bold text-slate-600';

// Same defaults as the backend RefundPolicy, used when a schedule has no tiers yet
const DEFAULT_TIERS = [{ hours: 24, percent: 75 }, { hours: 12, percent: 50 }, { hours: 4, percent: 25 }, { hours: 0, percent: 0 }];
const EMPTY = {
  tiers: DEFAULT_TIERS,
  dateChange: { allowed: true, feePercent: 10, minHours: 12 },
  luggage: '', children: '', pickup: '',
  pets: 'Not allowed', liquor: 'Not allowed', smoking: 'Not allowed',
  restStops: [],
};

/** "24+ hrs before departure", "12–24 hrs before", "Less than 4 hrs" — derived, never typed */
const tierLabel = (tiers, i) => {
  const sorted = [...tiers].sort((a, b) => b.hours - a.hours);
  const t = sorted[i];
  const prev = sorted[i - 1];
  if (i === 0) return t.hours > 0 ? `${t.hours}+ hrs before departure` : 'Any time';
  if (Number(t.hours) === 0) return `Less than ${prev.hours} hrs`;
  return `${t.hours}–${prev.hours} hrs before`;
};

const fromApi = (p = {}) => {
  const slabs = Array.isArray(p.cancellation) && p.cancellation.length ? p.cancellation : null;
  return {
    tiers: slabs ? slabs.map((s) => ({ hours: Number(s.hoursBeforeDeparture ?? 0), percent: Number(s.refundPercent ?? 0) })) : DEFAULT_TIERS,
    dateChange: {
      allowed: p.dateChange?.allowed ?? true,
      feePercent: p.dateChange?.feePercent ?? 10,
      minHours: p.dateChange?.minHoursBeforeDeparture ?? 12,
    },
    luggage: p.rules?.luggage || '', children: p.rules?.children || '', pickup: p.rules?.pickup || '',
    pets: p.rules?.pets === 'Allowed' ? 'Allowed' : 'Not allowed',
    liquor: p.rules?.liquor === 'Allowed' ? 'Allowed' : 'Not allowed',
    smoking: p.rules?.smoking === 'Allowed' ? 'Allowed' : 'Not allowed',
    restStops: (p.restStops || []).map((r) => ({ name: r.name || '', location: r.location || '', durationMinutes: r.durationMinutes ?? '' })),
  };
};

const toApi = (f) => {
  const tiers = [...f.tiers].sort((a, b) => b.hours - a.hours);
  return {
    cancellation: tiers.map((t, i) => ({ label: tierLabel(tiers, i), hoursBeforeDeparture: Number(t.hours), refundPercent: Number(t.percent) })),
    dateChange: { allowed: f.dateChange.allowed, feePercent: Number(f.dateChange.feePercent || 0), minHoursBeforeDeparture: Number(f.dateChange.minHours || 0) },
    rules: { luggage: f.luggage.trim(), children: f.children.trim(), pickup: f.pickup.trim(), pets: f.pets, liquor: f.liquor, smoking: f.smoking },
    restStops: f.restStops.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), location: r.location.trim(), durationMinutes: Number(r.durationMinutes || 0) })),
  };
};

const validate = (f) => {
  const hours = f.tiers.map((t) => Number(t.hours));
  if (f.tiers.some((t) => t.hours === '' || t.percent === '')) return 'Fill in every refund tier';
  if (f.tiers.some((t) => Number(t.percent) < 0 || Number(t.percent) > 100)) return 'Refunds must be between 0% and 100%';
  if (hours.some((h) => h < 0)) return 'Hours can’t be negative';
  if (new Set(hours).size !== hours.length) return 'Two tiers use the same number of hours';
  const sorted = [...f.tiers].sort((a, b) => b.hours - a.hours);
  if (sorted.some((t, i) => i > 0 && Number(t.percent) > Number(sorted[i - 1].percent))) return 'Refunds can’t increase closer to departure — check the percentages';
  if (f.dateChange.allowed && (Number(f.dateChange.feePercent) < 0 || Number(f.dateChange.feePercent) > 100)) return 'The date change fee must be between 0% and 100%';
  return '';
};

const AllowToggle = ({ label, icon, value, onChange }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3">
    <span className="flex items-center gap-2 text-sm font-bold text-slate-800"><span className="material-symbols-outlined text-[18px] text-slate-400">{icon}</span>{label}</span>
    <div className="flex rounded-lg border border-slate-200 p-0.5" role="radiogroup" aria-label={label}>
      {['Allowed', 'Not allowed'].map((v) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}
          className={`rounded-md px-2.5 py-1 text-xs font-bold transition-colors ${value === v ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary'}`}>{v}</button>
      ))}
    </div>
  </div>
);

const OperatorPolicies = () => {
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [routeId, setRouteId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY);
  const [policyFor, setPolicyFor] = useState(''); // schedule whose policy is in the form
  const [saving, setSaving] = useState(false);
  const [applyToRoute, setApplyToRoute] = useState(false);

  useEffect(() => {
    Promise.allSettled([getRoutes(), getAllSchedules()]).then(([r, s]) => {
      const rs = r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : [];
      // Only schedules that can still be booked matter; completed runs are history
      const ss = (s.status === 'fulfilled' && Array.isArray(s.value) ? s.value : [])
        .filter((x) => new Date(x.arrivalTime) > new Date())
        .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
      setRoutes(rs);
      setSchedules(ss);
      const first = ss[0];
      if (first) { setRouteId(String(first.route?.id)); setScheduleId(String(first.id)); }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!scheduleId) return undefined;
    let alive = true;
    getSchedulePolicies(scheduleId)
      .then((p) => { if (alive) { const f = fromApi(p || {}); setForm(f); setSaved(f); } })
      .catch(() => { if (alive) { setForm(EMPTY); setSaved(EMPTY); toast.error('Couldn’t load this schedule’s policies'); } })
      .finally(() => { if (alive) setPolicyFor(scheduleId); });
    return () => { alive = false; };
  }, [scheduleId]);

  const loadingPolicy = Boolean(scheduleId) && policyFor !== scheduleId;
  const routeSchedules = useMemo(() => schedules.filter((s) => String(s.route?.id) === routeId), [schedules, routeId]);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const error = validate(form);
  const sortedTiers = [...form.tiers].sort((a, b) => b.hours - a.hours);

  const set = (patch) => setForm((p) => ({ ...p, ...patch }));
  const setTier = (i, patch) => set({ tiers: form.tiers.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  const save = async () => {
    if (error) return toast.error(error);
    setSaving(true);
    try {
      const payload = toApi(form);
      const targets = applyToRoute ? routeSchedules.map((s) => s.id) : [scheduleId];
      const results = await Promise.allSettled(targets.map((id) => updateSchedulePolicies(id, payload)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed) toast.error(`Saved for ${targets.length - failed} of ${targets.length} departures`);
      else toast.success(targets.length > 1 ? `Saved for all ${targets.length} departures on this route` : 'Policies saved');
      setSaved(form);
    } finally {
      setSaving(false);
    }
  };

  const scheduleLabel = (s) => `${istDate(s.departureTime, { year: undefined, weekday: 'short' })} · ${istTime(s.departureTime)} · ${s.bus?.name || 'Bus'} (${FREQUENCY_LABEL[String(s.frequency || 'ONCE').toUpperCase()] || s.frequency})`;

  return (
    <OperatorLayout activeItem="policies" title="Trip policies">
      <div className="space-y-5 pb-20">
        <PageHeader title="Trip policies" subtitle="Refunds, date changes and rules travellers see before they book" />

        {!loading && schedules.length === 0 ? (
          <Card><EmptyState icon="gavel" title="No upcoming departures" subtitle="Policies belong to a schedule. Create one from Routes & schedules first." /></Card>
        ) : (
          <>
            <Card title="Which departure?" icon="departure_board">
              <div className="grid gap-4 p-5 md:grid-cols-2">
                <label className="block">
                  <span className={LABEL}>Route</span>
                  <select className={INPUT} value={routeId} disabled={loading} onChange={(e) => {
                    setRouteId(e.target.value);
                    const first = schedules.find((s) => String(s.route?.id) === e.target.value);
                    setScheduleId(first ? String(first.id) : '');
                  }}>
                    {routes.filter((r) => schedules.some((s) => String(s.route?.id) === String(r.id))).map((r) => (
                      <option key={r.id} value={r.id}>{r.origin} → {r.destination} · {r.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={LABEL}>Departure</span>
                  <select className={INPUT} value={scheduleId} disabled={loading} onChange={(e) => setScheduleId(e.target.value)}>
                    {routeSchedules.map((s) => <option key={s.id} value={s.id}>{scheduleLabel(s)}</option>)}
                  </select>
                </label>
                <p className="md:col-span-2 flex items-start gap-2 text-xs text-slate-500">
                  <span className="material-symbols-outlined text-[16px] text-[#FF8A65]">info</span>
                  Daily departures carry their policies forward to the next day automatically.
                </p>
              </div>
            </Card>

            <div className={`grid gap-5 xl:grid-cols-2 ${loadingPolicy ? 'opacity-60 pointer-events-none' : ''}`}>
              <Card title="Cancellation refunds" subtitle="How much travellers get back, by how early they cancel" icon="currency_rupee">
                <div className="p-5 space-y-2.5">
                  {form.tiers.map((t, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                      <label className="block">
                        {i === 0 && <span className={LABEL}>Cancelled at least (hrs before)</span>}
                        <input type="number" min="0" inputMode="numeric" className={INPUT} value={t.hours} onChange={(e) => setTier(i, { hours: e.target.value === '' ? '' : Number(e.target.value) })} aria-label="Hours before departure" />
                      </label>
                      <label className="block">
                        {i === 0 && <span className={LABEL}>Refund (%)</span>}
                        <input type="number" min="0" max="100" inputMode="numeric" className={INPUT} value={t.percent} onChange={(e) => setTier(i, { percent: e.target.value === '' ? '' : Number(e.target.value) })} aria-label="Refund percent" />
                      </label>
                      <button type="button" onClick={() => set({ tiers: form.tiers.length > 1 ? form.tiers.filter((_, j) => j !== i) : form.tiers })} disabled={form.tiers.length === 1}
                        aria-label="Remove tier" className="mb-0.5 w-10 h-10 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center disabled:opacity-30">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-3 pt-1">
                    <button type="button" onClick={() => set({ tiers: [...form.tiers, { hours: '', percent: '' }] })} className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-[#FF8A65]">
                      <span className="material-symbols-outlined text-[18px]">add</span>Add tier
                    </button>
                    <button type="button" onClick={() => set({ tiers: DEFAULT_TIERS })} className="text-sm font-bold text-slate-500 hover:text-primary">Use TripGo defaults</button>
                  </div>
                  {!error && (
                    <div className="mt-2 rounded-xl bg-slate-50 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Travellers see</p>
                      <ul className="space-y-1.5 text-sm">
                        {sortedTiers.map((t, i) => (
                          <li key={i} className="flex justify-between gap-3">
                            <span className="text-slate-600">{tierLabel(sortedTiers, i)}</span>
                            <span className={`font-bold ${Number(t.percent) > 0 ? 'text-green-700' : 'text-slate-500'}`}>{Number(t.percent)}% refund</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Card>

              <div className="space-y-5">
                <Card title="Date changes" icon="event_repeat">
                  <div className="space-y-4 p-5">
                    <label className="flex items-center justify-between gap-4 cursor-pointer">
                      <span>
                        <span className="block text-sm font-bold text-slate-900">Let travellers move to another date</span>
                        <span className="block text-xs text-slate-500">From My bookings, for a fee</span>
                      </span>
                      <button type="button" role="switch" aria-checked={form.dateChange.allowed} onClick={() => set({ dateChange: { ...form.dateChange, allowed: !form.dateChange.allowed } })}
                        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${form.dateChange.allowed ? 'bg-green-600' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.dateChange.allowed ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block"><span className={LABEL}>Fee (% of fare)</span>
                        <input type="number" min="0" max="100" className={INPUT} disabled={!form.dateChange.allowed} value={form.dateChange.feePercent} onChange={(e) => set({ dateChange: { ...form.dateChange, feePercent: e.target.value } })} />
                      </label>
                      <label className="block"><span className={LABEL}>Allowed until (hrs before)</span>
                        <input type="number" min="0" className={INPUT} disabled={!form.dateChange.allowed} value={form.dateChange.minHours} onChange={(e) => set({ dateChange: { ...form.dateChange, minHours: e.target.value } })} />
                      </label>
                    </div>
                  </div>
                </Card>

                <Card title="On-board rules" icon="gavel">
                  <div className="space-y-3 p-5">
                    <AllowToggle label="Pets" icon="pets" value={form.pets} onChange={(v) => set({ pets: v })} />
                    <AllowToggle label="Alcohol" icon="liquor" value={form.liquor} onChange={(v) => set({ liquor: v })} />
                    <AllowToggle label="Smoking" icon="smoking_rooms" value={form.smoking} onChange={(v) => set({ smoking: v })} />
                    {[['luggage', 'Luggage', '2 bags up to 20 kg free; extra bags are charged'], ['children', 'Children', 'Children under 5 travel free without a seat'], ['pickup', 'Boarding', 'Arrive 15 minutes before departure with a photo ID']].map(([k, label, ph]) => (
                      <label key={k} className="block"><span className={LABEL}>{label}</span>
                        <input className={INPUT} value={form[k]} placeholder={ph} maxLength={200} onChange={(e) => set({ [k]: e.target.value })} />
                      </label>
                    ))}
                  </div>
                </Card>
              </div>

              <Card title="Rest stops" subtitle="Where the bus halts on the way" icon="local_cafe" className="xl:col-span-2">
                <div className="space-y-2.5 p-5">
                  {form.restStops.length === 0 && <p className="text-sm text-slate-500">No rest stops added.</p>}
                  {form.restStops.map((r, i) => (
                    <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_auto] items-center">
                      <input className={INPUT} placeholder="Stop name, e.g. Kamat Hotel" value={r.name} onChange={(e) => set({ restStops: form.restStops.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} aria-label="Stop name" />
                      <input className={INPUT} placeholder="Place, e.g. Kurnool" value={r.location} onChange={(e) => set({ restStops: form.restStops.map((x, j) => (j === i ? { ...x, location: e.target.value } : x)) })} aria-label="Place" />
                      <input type="number" min="0" className={INPUT} placeholder="Minutes" value={r.durationMinutes} onChange={(e) => set({ restStops: form.restStops.map((x, j) => (j === i ? { ...x, durationMinutes: e.target.value } : x)) })} aria-label="Duration in minutes" />
                      <button type="button" onClick={() => set({ restStops: form.restStops.filter((_, j) => j !== i) })} aria-label="Remove stop" className="w-10 h-10 rounded-xl border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-200 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => set({ restStops: [...form.restStops, { name: '', location: '', durationMinutes: '' }] })} className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-[#FF8A65]">
                    <span className="material-symbols-outlined text-[18px]">add</span>Add rest stop
                  </button>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      {/* Save bar */}
      {scheduleId && (
        <div className="fixed inset-x-0 bottom-[calc(65px+env(safe-area-inset-bottom))] md:bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:pl-64">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 lg:px-6">
            <p className={`text-sm ${error ? 'text-red-600' : dirty ? 'text-amber-700' : 'text-slate-500'}`}>{error || (dirty ? 'You have unsaved changes' : 'All changes saved')}</p>
            <label className="ml-auto flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={applyToRoute} onChange={(e) => setApplyToRoute(e.target.checked)} className="accent-[#0B1F3A]" />
              Apply to all {routeSchedules.length} departures on this route
            </label>
            <button onClick={() => setForm(saved)} disabled={!dirty || saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">Discard</button>
            <button onClick={save} disabled={saving || (!dirty && !applyToRoute) || !!error} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-50">{saving ? 'Saving…' : 'Save policies'}</button>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
};

export default OperatorPolicies;
