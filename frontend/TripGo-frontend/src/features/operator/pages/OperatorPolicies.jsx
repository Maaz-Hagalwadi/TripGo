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
  {
    key: 'luggage',
    label: 'Luggage Policy',
    hint: 'Explain how much luggage is allowed and whether extra baggage is chargeable.',
    placeholder: 'Example: 2 bags up to 20 kg allowed. Extra baggage is chargeable.',
  },
  {
    key: 'children',
    label: 'Children Policy',
    hint: 'Clarify child age rules and when a separate seat or ticket is required.',
    placeholder: 'Example: Children below 5 travel free without a separate seat.',
  },
  {
    key: 'pets',
    label: 'Pets Policy',
    hint: 'Mention clearly whether pets are allowed or not.',
    placeholder: 'Example: Pets are not allowed on this service.',
  },
  {
    key: 'liquor',
    label: 'Liquor Policy',
    hint: 'Say whether carrying or consuming alcohol is allowed.',
    placeholder: 'Example: Carrying or consuming liquor inside the bus is not allowed.',
  },
  {
    key: 'smoking',
    label: 'Smoking Policy',
    hint: 'Specify if smoking or vaping is prohibited.',
    placeholder: 'Example: Smoking and vaping are strictly prohibited during the trip.',
  },
  {
    key: 'pickup',
    label: 'Pickup Instructions',
    hint: 'Tell passengers when they should arrive and any pickup timing rules.',
    placeholder: 'Example: Please arrive at the boarding point 15 minutes before departure.',
  },
];

const SECTION_CARD_CLASS = 'rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800';
const INPUT_CLASS = 'w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700';
const SOFT_PANEL_CLASS = 'rounded-2xl bg-slate-50 p-4 dark:bg-slate-900';

const normalizePolicyResponse = (policy) => {
  const cancellationItems = Array.isArray(policy?.cancellation) && policy.cancellation.length
    ? policy.cancellation
    : Array.isArray(policy?.cancellationSlabs) && policy.cancellationSlabs.length
      ? policy.cancellationSlabs
      : [];

  const restStopItems = Array.isArray(policy?.restStops) && policy.restStops.length
    ? policy.restStops
    : Array.isArray(policy?.restStopDetails) && policy.restStopDetails.length
      ? policy.restStopDetails
      : [];

  return ({
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
    luggage: policy?.rules?.luggage || '',
    children: policy?.rules?.children || '',
    pets: policy?.rules?.pets || '',
    liquor: policy?.rules?.liquor || '',
    smoking: policy?.rules?.smoking || '',
    pickup: policy?.rules?.pickup || '',
  },
  restStops: restStopItems.length
    ? restStopItems.map((item) => ({
        name: item?.name || '',
        location: item?.location || '',
        durationMinutes: item?.durationMinutes ?? '',
      }))
    : [{ name: '', location: '', durationMinutes: '' }],
});
};

const buildPayload = (form) => ({
  cancellation: form.cancellation
    .filter((item) => item.label || item.hoursBeforeDeparture !== '' || item.refundPercent !== '')
    .map((item) => ({
      label: item.label || `Before ${item.hoursBeforeDeparture} hrs`,
      hoursBeforeDeparture: Number(item.hoursBeforeDeparture || 0),
      refundPercent: Number(item.refundPercent || 0),
    })),
  dateChange: {
    allowed: Boolean(form.dateChange.allowed),
    feePercent: Number(form.dateChange.feePercent || 0),
    minHoursBeforeDeparture: Number(form.dateChange.minHoursBeforeDeparture || 0),
  },
  rules: { ...form.rules },
  restStops: form.restStops
    .filter((item) => item.name || item.location || item.durationMinutes !== '')
    .map((item) => ({
      name: item.name || '',
      location: item.location || '',
      durationMinutes: Number(item.durationMinutes || 0),
    })),
});

const OperatorPolicies = () => {
  const [routes, setRoutes] = useState([]);
  const [schedulesByRoute, setSchedulesByRoute] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const routeList = await getRoutes();
        const normalizedRoutes = Array.isArray(routeList) ? routeList : [];
        setRoutes(normalizedRoutes);

        const scheduleEntries = await Promise.all(
          normalizedRoutes.map(async (route) => [route.id, await getRouteSchedules(route.id)])
        );
        const scheduleMap = Object.fromEntries(scheduleEntries.map(([routeId, list]) => [String(routeId), Array.isArray(list) ? list : []]));
        setSchedulesByRoute(scheduleMap);

        const firstRouteWithSchedule = normalizedRoutes.find((route) => (scheduleMap[String(route.id)] || []).length > 0);
        if (firstRouteWithSchedule) {
          const nextRouteId = String(firstRouteWithSchedule.id);
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
    if (!selectedScheduleId) {
      setForm(EMPTY_FORM);
      return;
    }

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

  const selectedSchedule = selectedSchedules.find((item) => String(item.id) === String(selectedScheduleId));

  const handleRouteChange = (routeId) => {
    setSelectedRouteId(routeId);
    const nextSchedules = schedulesByRoute[routeId] || [];
    setSelectedScheduleId(nextSchedules[0]?.id ? String(nextSchedules[0].id) : '');
  };

  const handleSave = async () => {
    if (!selectedScheduleId) {
      toast.error('Select a schedule to save policy details');
      return;
    }

    try {
      await updateSchedulePolicies(selectedScheduleId, buildPayload(form));
      toast.success('Policies saved successfully');
    } catch (error) {
      toast.error(error?.message || 'Failed to save policies');
    }
  };

  return (
    <OperatorLayout activeItem="policies" title="Trip Policies">
      <div className="space-y-6">
        <div className={SECTION_CARD_CLASS}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Operator Setup</p>
              <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Manage cancellation & trip policies</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Policies are saved directly to the backend schedule policy table as jsonb-backed arrays and shown on the user booking flow.
              </p>
            </div>
            <button
              onClick={handleSave}
              className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-primary/90"
            >
              Save Policies
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_1.95fr]">
          <div className={SECTION_CARD_CLASS}>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select schedule</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Route</label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => handleRouteChange(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Select route</option>
                  {routes.map((route) => (
                    <option key={route.id} value={route.id}>
                      {route.name} · {route.origin} to {route.destination}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Schedule</label>
                <select
                  value={selectedScheduleId}
                  onChange={(e) => setSelectedScheduleId(e.target.value)}
                  className={INPUT_CLASS}
                >
                  <option value="">Select schedule</option>
                  {selectedSchedules.map((schedule) => (
                    <option key={schedule.id} value={schedule.id}>
                      {(schedule.bus?.name || 'Bus')} · {new Date(schedule.departureTime).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={`mt-6 ${SOFT_PANEL_CLASS}`}>
              {loading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Loading schedules...</p>
              ) : selectedSchedule ? (
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <p className="font-semibold text-slate-900 dark:text-white">{selectedSchedule.bus?.name || 'Bus'}</p>
                  <p>{new Date(selectedSchedule.departureTime).toLocaleString('en-IN')}</p>
                  <p>{selectedSchedule.frequency || 'DAILY'}</p>
                  {loadingPolicy ? <p className="text-xs text-primary">Loading policy details...</p> : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Pick a route and schedule to configure policies.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className={SECTION_CARD_CLASS}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cancellation windows</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Define how much refund a passenger gets based on how many hours before departure they cancel.
                  </p>
                </div>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, cancellation: [...prev.cancellation, createEmptyCancellationRow()] }))}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Add Row
                </button>
              </div>

              <div className="mb-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">Example</p>
                <p className="mt-1">Before 24 hrs: 100% refund, 12 to 24 hrs: 50% refund, below 12 hrs: 0% refund.</p>
              </div>

              <div className="mb-3 hidden grid-cols-[1.6fr_1fr_1fr_auto] gap-3 px-1 md:grid">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Window Title</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Hours Before Departure</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Refund %</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Action</p>
              </div>

              <div className="space-y-3">
                {form.cancellation.map((item, index) => (
                  <div key={`cancel-${index}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="mb-3 md:hidden">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cancellation Row {index + 1}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_auto]">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 md:hidden">Window title</label>
                        <input
                          value={item.label}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            cancellation: prev.cancellation.map((row, rowIndex) => rowIndex === index ? { ...row, label: e.target.value } : row),
                          }))}
                          placeholder="Before 24 hrs"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 md:hidden">Hours before departure</label>
                        <input
                          type="number"
                          min="0"
                          value={item.hoursBeforeDeparture}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            cancellation: prev.cancellation.map((row, rowIndex) => rowIndex === index ? { ...row, hoursBeforeDeparture: e.target.value } : row),
                          }))}
                          placeholder="24"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 md:hidden">Refund percent</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={item.refundPercent}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            cancellation: prev.cancellation.map((row, rowIndex) => rowIndex === index ? { ...row, refundPercent: e.target.value } : row),
                          }))}
                          placeholder="100"
                          className={INPUT_CLASS}
                        />
                      </div>
                    <button
                      onClick={() => setForm((prev) => ({
                        ...prev,
                        cancellation: prev.cancellation.length === 1 ? [createEmptyCancellationRow()] : prev.cancellation.filter((_, rowIndex) => rowIndex !== index),
                      }))}
                      className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                    >
                      Remove
                    </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={SECTION_CARD_CLASS}>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Date change</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Turn this on if passengers can move the booking to another travel date.
              </p>

              <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Allow date change</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      If turned off, passengers will see that date change is not allowed.
                    </p>
                  </div>
                  <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, allowed: true } }))}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        form.dateChange.allowed
                          ? 'bg-primary text-black'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, allowed: false } }))}
                      className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                        !form.dateChange.allowed
                          ? 'bg-primary text-black'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Reschedule Fee (%)</label>
                    <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">How much percent should be charged when the passenger changes date?</p>
                    <input
                      type="number"
                      min="0"
                      value={form.dateChange.feePercent}
                      onChange={(e) => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, feePercent: e.target.value } }))}
                      placeholder="Example: 10"
                      className={INPUT_CLASS}
                      disabled={!form.dateChange.allowed}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">Minimum Hours Before Departure</label>
                    <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Up to how many hours before departure can the passenger request date change?</p>
                    <input
                      type="number"
                      min="0"
                      value={form.dateChange.minHoursBeforeDeparture}
                      onChange={(e) => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, minHoursBeforeDeparture: e.target.value } }))}
                      placeholder="Example: 12"
                      className={INPUT_CLASS}
                      disabled={!form.dateChange.allowed}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className={SECTION_CARD_CLASS}>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rules shown to travelers</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Write these as passenger-facing instructions. Each field below tells the operator exactly what to mention.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {RULE_FIELDS.map(({ key, label, hint, placeholder }) => (
                  <div key={key} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <label className="block text-sm font-semibold text-slate-900 dark:text-white">{label}</label>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
                    <textarea
                      rows={4}
                      value={form.rules[key]}
                      onChange={(e) => setForm((prev) => ({ ...prev, rules: { ...prev.rules, [key]: e.target.value } }))}
                      placeholder={placeholder}
                      className={`${INPUT_CLASS} mt-3`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className={SECTION_CARD_CLASS}>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rest stops</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Add each halt name, area, and how long the bus usually stops there.
                  </p>
                </div>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, restStops: [...prev.restStops, { name: '', location: '', durationMinutes: '' }] }))}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Add Stop
                </button>
              </div>

              <div className="mb-3 hidden grid-cols-[1.2fr_1.2fr_1fr_auto] gap-3 px-1 md:grid">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stop Name</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Location</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Duration In Minutes</p>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Action</p>
              </div>

              <div className="space-y-3">
                {form.restStops.map((item, index) => (
                  <div key={`rest-${index}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="mb-3 md:hidden">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Rest Stop {index + 1}</p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_1fr_auto]">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 md:hidden">Stop name</label>
                        <input
                          value={item.name}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            restStops: prev.restStops.map((row, rowIndex) => rowIndex === index ? { ...row, name: e.target.value } : row),
                          }))}
                          placeholder="Example: Highway Dhaba"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 md:hidden">Location</label>
                        <input
                          value={item.location}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            restStops: prev.restStops.map((row, rowIndex) => rowIndex === index ? { ...row, location: e.target.value } : row),
                          }))}
                          placeholder="Example: Midway, Pune Highway"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-500 md:hidden">Duration in minutes</label>
                        <input
                          type="number"
                          min="0"
                          value={item.durationMinutes}
                          onChange={(e) => setForm((prev) => ({
                            ...prev,
                            restStops: prev.restStops.map((row, rowIndex) => rowIndex === index ? { ...row, durationMinutes: e.target.value } : row),
                          }))}
                          placeholder="20"
                          className={INPUT_CLASS}
                        />
                      </div>
                    <button
                      onClick={() => setForm((prev) => ({
                        ...prev,
                        restStops: prev.restStops.length === 1 ? [{ name: '', location: '', durationMinutes: '' }] : prev.restStops.filter((_, rowIndex) => rowIndex !== index),
                      }))}
                      className="rounded-2xl bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 transition hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
                    >
                      Remove
                    </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default OperatorPolicies;
