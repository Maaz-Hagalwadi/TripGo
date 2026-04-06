import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getRoutes, getRouteSchedules } from '../../../api/routeService';
import { getStoredSchedulePolicies, saveStoredSchedulePolicies } from '../../../shared/utils/operatorPolicyStorage';

const EMPTY_POLICY_FORM = {
  cancellationPolicy: '',
  dateChangePolicy: '',
  childPassengerPolicy: '',
  luggagePolicy: '',
  petsPolicy: '',
  liquorPolicy: '',
  pickupTimePolicy: '',
  otherPolicies: '',
};

const POLICY_FIELDS = [
  { key: 'cancellationPolicy', label: 'Cancellation Policy', placeholder: 'Example: Before 24 hrs: 10% charge, within 12 hrs: 50% charge.' },
  { key: 'dateChangePolicy', label: 'Date Change Policy', placeholder: 'Example: One free date change allowed up to 12 hrs before departure.' },
  { key: 'childPassengerPolicy', label: 'Child Passenger Policy', placeholder: 'Example: Children above 5 years require a full ticket.' },
  { key: 'luggagePolicy', label: 'Luggage Policy', placeholder: 'Example: Up to 20 kg allowed. Extra baggage is chargeable.' },
  { key: 'petsPolicy', label: 'Pets Policy', placeholder: 'Example: Pets are not allowed onboard.' },
  { key: 'liquorPolicy', label: 'Liquor Policy', placeholder: 'Example: Alcohol consumption inside the bus is prohibited.' },
  { key: 'pickupTimePolicy', label: 'Pickup Time Policy', placeholder: 'Example: Report 15 minutes before departure. Bus will not wait beyond scheduled time.' },
  { key: 'otherPolicies', label: 'Other Policies', placeholder: 'Add any extra instructions travelers should see on booking.' },
];

const OperatorPolicies = () => {
  const [routes, setRoutes] = useState([]);
  const [schedulesByRoute, setSchedulesByRoute] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [form, setForm] = useState(EMPTY_POLICY_FORM);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const routeList = await getRoutes();
        const normalizedRoutes = Array.isArray(routeList) ? routeList : [];
        setRoutes(normalizedRoutes);

        const scheduleEntries = await Promise.all(
          normalizedRoutes.map(async (route) => [route.id, await getRouteSchedules(route.id)])
        );
        const scheduleMap = Object.fromEntries(scheduleEntries.map(([routeId, list]) => [routeId, Array.isArray(list) ? list : []]));
        setSchedulesByRoute(scheduleMap);

        const firstRouteWithSchedule = normalizedRoutes.find((route) => (scheduleMap[route.id] || []).length > 0);
        if (firstRouteWithSchedule) {
          const nextRouteId = String(firstRouteWithSchedule.id);
          const nextScheduleId = String(scheduleMap[firstRouteWithSchedule.id][0].id);
          setSelectedRouteId(nextRouteId);
          setSelectedScheduleId(nextScheduleId);
          setForm({ ...EMPTY_POLICY_FORM, ...(getStoredSchedulePolicies(nextScheduleId) || {}) });
        }
      } catch (error) {
        toast.error(error?.message || 'Failed to load schedules for policy setup');
      } finally {
        setLoading(false);
      }
    };

    loadRoutes();
  }, []);

  const selectedSchedules = useMemo(
    () => schedulesByRoute[selectedRouteId] || [],
    [schedulesByRoute, selectedRouteId]
  );

  const selectedSchedule = selectedSchedules.find((item) => String(item.id) === String(selectedScheduleId));

  const handleRouteChange = (routeId) => {
    setSelectedRouteId(routeId);
    const nextSchedules = schedulesByRoute[routeId] || [];
    const nextScheduleId = nextSchedules[0]?.id ? String(nextSchedules[0].id) : '';
    setSelectedScheduleId(nextScheduleId);
    setForm({ ...EMPTY_POLICY_FORM, ...(getStoredSchedulePolicies(nextScheduleId) || {}) });
  };

  const handleScheduleChange = (scheduleId) => {
    setSelectedScheduleId(scheduleId);
    setForm({ ...EMPTY_POLICY_FORM, ...(getStoredSchedulePolicies(scheduleId) || {}) });
  };

  const handleSave = () => {
    if (!selectedScheduleId) {
      toast.error('Select a schedule to save policy details');
      return;
    }
    saveStoredSchedulePolicies(selectedScheduleId, form, {
      routeId: selectedRouteId,
      routeName: routes.find((route) => String(route.id) === String(selectedRouteId))?.name || '',
      busId: selectedSchedule?.bus?.id || selectedSchedule?.busId || '',
      busName: selectedSchedule?.bus?.name || '',
    });
    toast.success('Policy details saved for this schedule');
  };

  return (
    <OperatorLayout activeItem="policies" title="Trip Policies">
      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-op-card">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Operator Setup</p>
              <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Add the cancellation policy here</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                Choose a route and schedule, then save the cancellation and travel rules that riders should see on the booking page.
              </p>
            </div>
            <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
              These policy edits are stored locally in the frontend for now and are shown immediately on the booking flow.
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_1.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-op-card">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Select schedule</h2>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Route</label>
                <select
                  value={selectedRouteId}
                  onChange={(e) => handleRouteChange(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                  onChange={(e) => handleScheduleChange(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
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
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Pick a route and schedule to configure policies.</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-op-card">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Customer-facing policy content</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Each field appears on the user booking page for the chosen schedule.
                </p>
              </div>
              <button
                onClick={handleSave}
                className="rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-black transition hover:bg-primary/90"
              >
                Save Policies
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {POLICY_FIELDS.map((field) => (
                <div key={field.key} className={field.key === 'otherPolicies' ? 'md:col-span-2' : ''}>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {field.label}
                  </label>
                  <textarea
                    rows={field.key === 'otherPolicies' ? 5 : 4}
                    value={form[field.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default OperatorPolicies;
