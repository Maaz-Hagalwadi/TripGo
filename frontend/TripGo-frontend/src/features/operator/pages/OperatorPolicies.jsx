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
  ['luggage', 'Luggage'],
  ['children', 'Children'],
  ['pets', 'Pets'],
  ['liquor', 'Liquor'],
  ['smoking', 'Smoking'],
  ['pickup', 'Pickup'],
];

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
        <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
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
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select schedule</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Route</label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => handleRouteChange(e.target.value)}
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
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
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
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

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
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
            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cancellation windows</h2>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, cancellation: [...prev.cancellation, createEmptyCancellationRow()] }))}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Add Row
                </button>
              </div>

              <div className="space-y-3">
                {form.cancellation.map((item, index) => (
                  <div key={`cancel-${index}`} className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_auto]">
                    <input
                      value={item.label}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        cancellation: prev.cancellation.map((row, rowIndex) => rowIndex === index ? { ...row, label: e.target.value } : row),
                      }))}
                      placeholder="Label"
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.hoursBeforeDeparture}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        cancellation: prev.cancellation.map((row, rowIndex) => rowIndex === index ? { ...row, hoursBeforeDeparture: e.target.value } : row),
                      }))}
                      placeholder="Hours before"
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={item.refundPercent}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        cancellation: prev.cancellation.map((row, rowIndex) => rowIndex === index ? { ...row, refundPercent: e.target.value } : row),
                      }))}
                      placeholder="Refund %"
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                    />
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
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Date change</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <label className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Allowed</span>
                  <select
                    value={form.dateChange.allowed ? 'true' : 'false'}
                    onChange={(e) => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, allowed: e.target.value === 'true' } }))}
                    className="w-full bg-transparent outline-none"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.dateChange.feePercent}
                  onChange={(e) => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, feePercent: e.target.value } }))}
                  placeholder="Fee percent"
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                />
                <input
                  type="number"
                  min="0"
                  value={form.dateChange.minHoursBeforeDeparture}
                  onChange={(e) => setForm((prev) => ({ ...prev, dateChange: { ...prev.dateChange, minHoursBeforeDeparture: e.target.value } }))}
                  placeholder="Min hours before"
                  className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                />
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rules</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {RULE_FIELDS.map(([key, label]) => (
                  <textarea
                    key={key}
                    rows={3}
                    value={form.rules[key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, rules: { ...prev.rules, [key]: e.target.value } }))}
                    placeholder={label}
                    className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Rest stops</h2>
                <button
                  onClick={() => setForm((prev) => ({ ...prev, restStops: [...prev.restStops, { name: '', location: '', durationMinutes: '' }] }))}
                  className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Add Stop
                </button>
              </div>

              <div className="space-y-3">
                {form.restStops.map((item, index) => (
                  <div key={`rest-${index}`} className="grid gap-3 md:grid-cols-[1.2fr_1.2fr_1fr_auto]">
                    <input
                      value={item.name}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        restStops: prev.restStops.map((row, rowIndex) => rowIndex === index ? { ...row, name: e.target.value } : row),
                      }))}
                      placeholder="Rest stop name"
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                    />
                    <input
                      value={item.location}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        restStops: prev.restStops.map((row, rowIndex) => rowIndex === index ? { ...row, location: e.target.value } : row),
                      }))}
                      placeholder="Location"
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                    />
                    <input
                      type="number"
                      min="0"
                      value={item.durationMinutes}
                      onChange={(e) => setForm((prev) => ({
                        ...prev,
                        restStops: prev.restStops.map((row, rowIndex) => rowIndex === index ? { ...row, durationMinutes: e.target.value } : row),
                      }))}
                      placeholder="Duration mins"
                      className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
                    />
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
