import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getRoutes, getRouteSchedules } from '../../../api/routeService';
import { getSchedulePolicies, updateSchedulePolicies } from '../../../api/bookingService';

const createEmptyCancellationRow = () => ({
  label: '',
  hoursBeforeDeparture: '',
  refundPercent: '',
});

const EMPTY_FORM = {
  cancellation: [createEmptyCancellationRow()],
  dateChange: {
    allowed: true,
    feePercent: '',
    minHoursBeforeDeparture: '',
  },
  rules: {
    luggage: '',
    children: '',
    pets: '',
    liquor: '',
    smoking: '',
    pickup: '',
  },
  restStops: [{ name: '', location: '', durationMinutes: '' }],
};

const RULE_FIELDS = [
  { key: 'luggage',  label: 'Luggage',  icon: 'luggage',         hint: 'How much luggage is allowed and whether extra baggage is chargeable.',    placeholder: 'Example: 2 bags up to 20 kg allowed. Extra baggage is chargeable.' },
  { key: 'children', label: 'Children', icon: 'child_care',       hint: 'Child age rules and when a separate seat or ticket is required.',          placeholder: 'Example: Children below 5 travel free without a separate seat.' },
  { key: 'pets',     label: 'Pets',     icon: 'pets',             hint: 'Mention clearly whether pets are allowed or not.',                          placeholder: 'Example: Pets are not allowed on this service.' },
  { key: 'liquor',   label: 'Liquor',   icon: 'liquor',           hint: 'Whether carrying or consuming alcohol is allowed.',                          placeholder: 'Example: Carrying or consuming liquor inside the bus is not allowed.' },
  { key: 'smoking',  label: 'Smoking',  icon: 'smoking_rooms',    hint: 'Specify if smoking or vaping is prohibited.',                               placeholder: 'Example: Smoking and vaping are strictly prohibited during the trip.' },
  { key: 'pickup',   label: 'Pickup',   icon: 'directions_bus',   hint: 'Tell passengers when they should arrive and any pickup timing rules.',       placeholder: 'Example: Please arrive at the boarding point 15 minutes before departure.' },
];

const INPUT_CLASS = 'w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white outline-none focus:ring-1 focus:ring-[#002046] transition-colors';
const LABEL_CLASS = 'block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5';

const normalizePolicyResponse = (policy) => {
  const cancellationItems =
    Array.isArray(policy?.cancellation) && policy.cancellation.length
      ? policy.cancellation
      : Array.isArray(policy?.cancellationSlabs) && policy.cancellationSlabs.length
      ? policy.cancellationSlabs
      : [];

  const restStopItems =
    Array.isArray(policy?.restStops) && policy.restStops.length
      ? policy.restStops
      : Array.isArray(policy?.restStopDetails) && policy.restStopDetails.length
      ? policy.restStopDetails
      : [];

  return {
    cancellation: cancellationItems.length
      ? cancellationItems.map((item) => ({
          label: item?.label || '',
          hoursBeforeDeparture: item?.hoursBeforeDeparture ?? '',
          refundPercent: item?.refundPercent ?? '',
        }))
      : [createEmptyCancellationRow()],
    dateChange: {
      allowed: policy?.dateChange?.allowed ?? true,
      feePercent: policy?.dateChange?.feePercent ?? '',
      minHoursBeforeDeparture: policy?.dateChange?.minHoursBeforeDeparture ?? '',
    },
    rules: {
      luggage:  policy?.rules?.luggage  || '',
      children: policy?.rules?.children || '',
      pets:     policy?.rules?.pets     || '',
      liquor:   policy?.rules?.liquor   || '',
      smoking:  policy?.rules?.smoking  || '',
      pickup:   policy?.rules?.pickup   || '',
    },
    restStops: restStopItems.length
      ? restStopItems.map((item) => ({
          name:            item?.name            || '',
          location:        item?.location        || '',
          durationMinutes: item?.durationMinutes ?? '',
        }))
      : [{ name: '', location: '', durationMinutes: '' }],
  };
};

const buildPayload = (form) => ({
  cancellation: form.cancellation
    .filter((item) => item.label || item.hoursBeforeDeparture !== '' || item.refundPercent !== '')
    .map((item) => ({
      label:                item.label || `Before ${item.hoursBeforeDeparture} hrs`,
      hoursBeforeDeparture: Number(item.hoursBeforeDeparture || 0),
      refundPercent:        Number(item.refundPercent        || 0),
    })),
  dateChange: {
    allowed:                Boolean(form.dateChange.allowed),
    feePercent:             Number(form.dateChange.feePercent             || 0),
    minHoursBeforeDeparture: Number(form.dateChange.minHoursBeforeDeparture || 0),
  },
  rules: { ...form.rules },
  restStops: form.restStops
    .filter((item) => item.name || item.location || item.durationMinutes !== '')
    .map((item) => ({
      name:            item.name            || '',
      location:        item.location        || '',
      durationMinutes: Number(item.durationMinutes || 0),
    })),
});

/* ─── shared section header ─── */
const SectionHeader = ({ icon, title, subtitle }) => (
  <div className="bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-4">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-white text-lg">{icon}</span>
      </div>
      <div>
        <p className="text-sm font-black text-white">{title}</p>
        {subtitle && <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const OperatorPolicies = () => {
  const [routes, setRoutes]                     = useState([]);
  const [schedulesByRoute, setSchedulesByRoute] = useState({});
  const [loading, setLoading]                   = useState(true);
  const [loadingPolicy, setLoadingPolicy]       = useState(false);
  const [selectedRouteId, setSelectedRouteId]   = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [form, setForm]                         = useState(EMPTY_FORM);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const routeList = await getRoutes();
        const normalizedRoutes = Array.isArray(routeList) ? routeList : [];
        setRoutes(normalizedRoutes);

        const scheduleEntries = await Promise.all(
          normalizedRoutes.map(async (route) => [route.id, await getRouteSchedules(route.id)])
        );
        const scheduleMap = Object.fromEntries(
          scheduleEntries.map(([routeId, list]) => [String(routeId), Array.isArray(list) ? list : []])
        );
        setSchedulesByRoute(scheduleMap);

        const firstRouteWithSchedule = normalizedRoutes.find(
          (route) => (scheduleMap[String(route.id)] || []).length > 0
        );
        if (firstRouteWithSchedule) {
          const nextRouteId    = String(firstRouteWithSchedule.id);
          const nextScheduleId = String(scheduleMap[nextRouteId][0].id);
          setSelectedRouteId(nextRouteId);
          setSelectedScheduleId(nextScheduleId);
        }
      } catch (error) {
        toast.error(error?.message || 'Failed to load schedules for policy setup');
      } finally {
        setLoading(false);
      }
    };
    loadRoutes();
  }, []);

  useEffect(() => {
    if (!selectedScheduleId) { setForm(EMPTY_FORM); return; }
    const loadPolicy = async () => {
      try {
        setLoadingPolicy(true);
        const response = await getSchedulePolicies(selectedScheduleId);
        setForm(normalizePolicyResponse(response || {}));
      } catch (error) {
        toast.error(error?.message || 'Failed to load schedule policy');
        setForm(EMPTY_FORM);
      } finally {
        setLoadingPolicy(false);
      }
    };
    loadPolicy();
  }, [selectedScheduleId]);

  const selectedSchedules = useMemo(
    () => schedulesByRoute[selectedRouteId] || [],
    [schedulesByRoute, selectedRouteId]
  );

  const selectedSchedule = selectedSchedules.find(
    (item) => String(item.id) === String(selectedScheduleId)
  );

  const handleRouteChange = (routeId) => {
    setSelectedRouteId(routeId);
    const nextSchedules = schedulesByRoute[routeId] || [];
    setSelectedScheduleId(nextSchedules[0]?.id ? String(nextSchedules[0].id) : '');
  };

  const handleSave = async () => {
    if (!selectedScheduleId) { toast.error('Select a schedule to save policy details'); return; }
    try {
      await updateSchedulePolicies(selectedScheduleId, buildPayload(form));
      toast.success('Policies saved successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to save policies');
    }
  };

  const patchCancel   = (index, patch) => setForm(prev => ({ ...prev, cancellation: prev.cancellation.map((r, i) => i === index ? { ...r, ...patch } : r) }));
  const patchRestStop = (index, patch) => setForm(prev => ({ ...prev, restStops:    prev.restStops.map((r, i)    => i === index ? { ...r, ...patch } : r) }));

  return (
    <OperatorLayout activeItem="policies" title="Trip Policies">
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-slate-900">Trip Policies</h1>
            <p className="text-xs text-slate-500 mt-0.5">Manage cancellation and trip policies for your schedules</p>
          </div>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#002046] text-white text-sm font-bold hover:bg-[#003a80] transition-colors shadow-sm flex-shrink-0"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            Save Policies
          </button>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.05fr_1.95fr]">

          {/* ── Left: schedule selector ── */}
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden self-start">
            <SectionHeader icon="route" title="Select Schedule" subtitle="Pick a route and schedule to edit" />

            <div className="px-5 py-5 space-y-4">
              <div>
                <label className={LABEL_CLASS}>Route</label>
                <select value={selectedRouteId} onChange={(e) => handleRouteChange(e.target.value)} className={INPUT_CLASS}>
                  <option value="">Select route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name} · {route.origin} to {route.destination}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={LABEL_CLASS}>Schedule</label>
                <select value={selectedScheduleId} onChange={(e) => setSelectedScheduleId(e.target.value)} className={INPUT_CLASS}>
                  <option value="">Select schedule</option>
                  {selectedSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {schedule.bus?.name || 'Bus'} · {new Date(schedule.departureTime).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 px-4 py-3">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
                    <p className="text-sm text-slate-500">Loading schedules...</p>
                  </div>
                ) : selectedSchedule ? (
                  <div className="space-y-1.5">
                    <p className="text-sm font-bold text-slate-900">{selectedSchedule.bus?.name || 'Bus'}</p>
                    <p className="text-xs text-slate-500">{new Date(selectedSchedule.departureTime).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-500">{selectedSchedule.frequency || 'DAILY'}</p>
                    {loadingPolicy && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
                        <p className="text-xs text-[#002046]">Loading policy...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Pick a route and schedule to configure policies.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Right column ── */}
          <div className="space-y-5">

            {/* Cancellation Windows */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <SectionHeader icon="cancel" title="Cancellation Windows" subtitle="Define refund tiers based on hours before departure" />

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Window Title</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Hours Before Departure</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Refund %</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.cancellation.map((item, index) => (
                      <tr key={`cancel-${index}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <input
                            value={item.label}
                            onChange={(e) => patchCancel(index, { label: e.target.value })}
                            placeholder="Before 24 hrs"
                            className={INPUT_CLASS}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number" min="0"
                            value={item.hoursBeforeDeparture}
                            onChange={(e) => patchCancel(index, { hoursBeforeDeparture: e.target.value })}
                            placeholder="24"
                            className={INPUT_CLASS}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number" min="0" max="100"
                            value={item.refundPercent}
                            onChange={(e) => patchCancel(index, { refundPercent: e.target.value })}
                            placeholder="100"
                            className={INPUT_CLASS}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => setForm((prev) => ({
                                ...prev,
                                cancellation: prev.cancellation.length === 1
                                  ? [createEmptyCancellationRow()]
                                  : prev.cancellation.filter((_, i) => i !== index),
                              }))}
                              className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50/60 flex items-center justify-between">
                <p className="text-xs text-slate-400">{form.cancellation.length} window{form.cancellation.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, cancellation: [...prev.cancellation, createEmptyCancellationRow()] }))}
                  className="flex items-center gap-1.5 text-sm font-bold text-[#002046] hover:text-[#003a80] transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>Add Window
                </button>
              </div>
            </div>

            {/* Date Change */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <SectionHeader icon="event_repeat" title="Date Change" subtitle="Allow passengers to reschedule their booking to another date" />

              <div className="px-5 py-5 space-y-4">
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl ring-1 ring-slate-200">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Allow date change</p>
                    <p className="text-xs text-slate-500 mt-0.5">If turned off, passengers will see that date change is not allowed.</p>
                  </div>
                  <div className="inline-flex rounded-xl bg-slate-100 p-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, allowed: true } }))}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${form.dateChange.allowed ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >Yes</button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, allowed: false } }))}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${!form.dateChange.allowed ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                    >No</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={LABEL_CLASS}>Reschedule Fee (%)</label>
                    <p className="text-xs text-slate-400 mb-2">Percent charged when the passenger changes date</p>
                    <input
                      type="number" min="0"
                      value={form.dateChange.feePercent}
                      onChange={(e) => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, feePercent: e.target.value } }))}
                      placeholder="10"
                      className={INPUT_CLASS}
                      disabled={!form.dateChange.allowed}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>Min Hours Before Departure</label>
                    <p className="text-xs text-slate-400 mb-2">Latest point a passenger can request a date change</p>
                    <input
                      type="number" min="0"
                      value={form.dateChange.minHoursBeforeDeparture}
                      onChange={(e) => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, minHoursBeforeDeparture: e.target.value } }))}
                      placeholder="12"
                      className={INPUT_CLASS}
                      disabled={!form.dateChange.allowed}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Rules */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <SectionHeader icon="gavel" title="Rules Shown to Travelers" subtitle="Write passenger-facing instructions for each category" />

              <div className="px-5 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {RULE_FIELDS.map(({ key, label, icon, hint, placeholder }) => (
                    <div key={key} className="rounded-xl ring-1 ring-slate-200 overflow-hidden">
                      <div className="flex items-center gap-2.5 px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                        <span className="material-symbols-outlined text-[#002046] text-sm">{icon}</span>
                        <div>
                          <p className="text-xs font-black text-slate-800 uppercase tracking-wider">{label}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>
                        </div>
                      </div>
                      <div className="p-4">
                        <textarea
                          rows={3}
                          value={form.rules[key]}
                          onChange={(e) => setForm((prev) => ({ ...prev, rules: { ...prev.rules, [key]: e.target.value } }))}
                          placeholder={placeholder}
                          className={INPUT_CLASS}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Rest Stops */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
              <SectionHeader icon="local_cafe" title="Rest Stops" subtitle="Add halt name, area, and stop duration" />

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Stop Name</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Duration (min)</th>
                      <th className="px-5 py-3.5 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.restStops.map((item, index) => (
                      <tr key={`rest-${index}`} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3">
                          <input
                            value={item.name}
                            onChange={(e) => patchRestStop(index, { name: e.target.value })}
                            placeholder="Highway Dhaba"
                            className={INPUT_CLASS}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            value={item.location}
                            onChange={(e) => patchRestStop(index, { location: e.target.value })}
                            placeholder="Midway, Pune Highway"
                            className={INPUT_CLASS}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="number" min="0"
                            value={item.durationMinutes}
                            onChange={(e) => patchRestStop(index, { durationMinutes: e.target.value })}
                            placeholder="20"
                            className={INPUT_CLASS}
                          />
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end">
                            <button
                              onClick={() => setForm((prev) => ({
                                ...prev,
                                restStops: prev.restStops.length === 1
                                  ? [{ name: '', location: '', durationMinutes: '' }]
                                  : prev.restStops.filter((_, i) => i !== index),
                              }))}
                              className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-100 px-5 py-3.5 bg-slate-50/60 flex items-center justify-between">
                <p className="text-xs text-slate-400">{form.restStops.length} stop{form.restStops.length !== 1 ? 's' : ''}</p>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, restStops: [...prev.restStops, { name: '', location: '', durationMinutes: '' }] }))}
                  className="flex items-center gap-1.5 text-sm font-bold text-[#002046] hover:text-[#003a80] transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>Add Stop
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default OperatorPolicies;
