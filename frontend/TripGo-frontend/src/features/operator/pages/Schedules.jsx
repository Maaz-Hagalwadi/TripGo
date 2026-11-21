import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { deleteRoute, getAllSchedules, getRoutes, setScheduleActive, updateRoute } from '../../../api/routeService';
import { ROUTES } from '../../../shared/constants/routes';
import {
  ActionButton, Card, ConfirmDialog, EmptyState, FilterTabs, PageHeader, SearchInput, SkeletonRows, StatCard, StatusPill,
} from '../../../shared/components/console/ConsoleUI';
import { headerPrimaryButton } from '../../../shared/components/console/consoleStyles';
import { FREQUENCY_LABEL, istDate, istTime, TRIP_STATUS } from '../utils/operatorFormat';

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
const isUpcoming = (s) => new Date(s.arrivalTime) > new Date() && String(s.tripStatus).toUpperCase() !== 'COMPLETED';

const Schedules = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('routes');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, s] = await Promise.allSettled([getRoutes(), getAllSchedules()]);
    if (r.status === 'rejected') toast.error('Couldn’t load your routes');
    setRoutes(r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []);
    setSchedules(s.status === 'fulfilled' && Array.isArray(s.value) ? s.value : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upcoming = useMemo(() => schedules.filter(isUpcoming).sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime)), [schedules]);
  const byRoute = useMemo(() => {
    const map = {};
    upcoming.forEach((s) => { const k = String(s.route?.id); (map[k] = map[k] || []).push(s); });
    return map;
  }, [upcoming]);

  const q = search.trim().toLowerCase();
  const routeRows = routes.filter((r) => !q || [r.name, r.origin, r.destination].some((v) => String(v || '').toLowerCase().includes(q)));
  const departureRows = upcoming.filter((s) => !q || [s.route?.origin, s.route?.destination, s.bus?.name, s.driverName].some((v) => String(v || '').toLowerCase().includes(q)));
  const onSale = upcoming.filter((s) => s.active !== false).length;

  const saveEdit = async (e) => {
    e.preventDefault();
    const { id, name, origin, destination } = editing;
    if (![name, origin, destination].every((v) => String(v || '').trim())) return toast.error('Name, from and to are required');
    setSavingEdit(true);
    try {
      await updateRoute(id, { name: name.trim(), origin: origin.trim(), destination: destination.trim() });
      setRoutes((prev) => prev.map((r) => (r.id === id ? { ...r, name: name.trim(), origin: origin.trim(), destination: destination.trim() } : r)));
      toast.success('Route updated');
      setEditing(null);
    } catch (err) {
      toast.error(err.message || 'Couldn’t update the route');
    } finally {
      setSavingEdit(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteRoute(toDelete.id);
      setRoutes((prev) => prev.filter((r) => r.id !== toDelete.id));
      toast.success(`${toDelete.name} deleted`);
      setToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Couldn’t delete the route');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSale = async (s) => {
    setToggling(s.id);
    try {
      const next = s.active === false;
      await setScheduleActive(s.id, next);
      setSchedules((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: next } : x)));
      toast.success(next ? 'Back on sale' : 'Stopped selling — existing bookings are kept');
    } catch (err) {
      toast.error(err.message || 'Couldn’t update the schedule');
    } finally {
      setToggling(null);
    }
  };

  return (
    <OperatorLayout activeItem="schedules" title="Routes & schedules">
      <div className="space-y-5">
        <PageHeader
          title="Routes & schedules"
          subtitle="Your routes, their stops and fares, and every upcoming departure"
          actions={<button onClick={() => navigate(ROUTES.OPERATOR_CREATE_ROUTE)} className={headerPrimaryButton}><span className="material-symbols-outlined text-[18px]">add_road</span>New route</button>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="route" tone="navy" label="Routes" value={routes.length} loading={loading} onClick={() => setView('routes')} />
          <StatCard icon="departure_board" tone="peach" label="Upcoming departures" value={upcoming.length} loading={loading} onClick={() => setView('departures')} />
          <StatCard icon="sell" tone="green" label="On sale" value={onSale} sub={upcoming.length - onSale ? `${upcoming.length - onSale} switched off` : undefined} loading={loading} />
          <StatCard icon="badge" tone="amber" label="Without a driver" value={upcoming.filter((s) => !s.driverName).length} sub="Assign one on the route page" loading={loading} />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <FilterTabs options={[{ value: 'routes', label: 'Routes', count: routes.length }, { value: 'departures', label: 'Upcoming departures', count: upcoming.length }]} value={view} onChange={setView} label="View" />
          <SearchInput value={search} onChange={setSearch} placeholder={view === 'routes' ? 'Search routes or cities' : 'Search city, bus or driver'} className="lg:ml-auto lg:w-80" />
        </div>

        {view === 'routes' ? (
          loading ? <Card><SkeletonRows rows={3} /></Card> : routeRows.length === 0 ? (
            <Card>
              <EmptyState icon="route" title={routes.length ? 'No routes match' : 'Create your first route'}
                subtitle={routes.length ? 'Try a different search.' : 'Add the stops your bus serves and the fare for each part of the trip.'}
                action={!routes.length && <button onClick={() => navigate(ROUTES.OPERATOR_CREATE_ROUTE)} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">New route</button>} />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {routeRows.map((r) => {
                const list = byRoute[String(r.id)] || [];
                const next = list[0];
                return (
                  <section key={r.id} className="flex flex-col rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-[#FDBA74] transition-colors">
                    <button onClick={() => navigate(`/operator/routes/${r.id}`)} className="flex-1 p-5 text-left">
                      <p className="text-xs font-bold text-slate-400 truncate">{r.name}</p>
                      <p className="mt-1 text-lg font-black text-slate-900">{r.origin} <span className="text-[#FF8A65]">→</span> {r.destination}</p>
                      {r.totalDistanceKm ? <p className="text-xs text-slate-500">{r.totalDistanceKm} km</p> : null}
                      <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
                        <span>
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Next departure</span>
                          <span className="block text-sm font-bold text-slate-900">{next ? `${istDate(next.departureTime, { year: undefined, weekday: 'short' })} · ${istTime(next.departureTime)}` : 'None scheduled'}</span>
                        </span>
                        <span className="text-right">
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">Upcoming</span>
                          <span className="block text-sm font-bold text-slate-900">{list.length}</span>
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 border-t border-slate-100 px-5 py-3">
                      <button onClick={() => navigate(`/operator/routes/${r.id}`)} className="mr-auto inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-[#FF8A65]">
                        Schedules, stops & fares<span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </button>
                      <ActionButton icon="edit" onClick={() => setEditing({ id: r.id, name: r.name, origin: r.origin, destination: r.destination })} aria-label={`Edit ${r.name}`} />
                      <ActionButton icon="delete" tone="danger" onClick={() => setToDelete(r)} aria-label={`Delete ${r.name}`} />
                    </div>
                  </section>
                );
              })}
            </div>
          )
        ) : (
          <Card>
            {loading ? <SkeletonRows /> : departureRows.length === 0 ? (
              <EmptyState icon="departure_board" title="No upcoming departures" subtitle="Open a route to add a schedule." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {departureRows.map((s) => {
                  const status = TRIP_STATUS[String(s.tripStatus || 'SCHEDULED').toUpperCase()] || TRIP_STATUS.SCHEDULED;
                  const selling = s.active !== false;
                  return (
                    <li key={s.id} className={`grid gap-3 px-5 py-4 md:grid-cols-[110px_minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center ${selling ? '' : 'bg-slate-50/70'}`}>
                      <div>
                        <p className="text-sm font-black text-slate-900">{istTime(s.departureTime)}</p>
                        <p className="text-xs text-slate-500">{istDate(s.departureTime, { year: undefined, weekday: 'short' })}</p>
                      </div>
                      <button onClick={() => s.route?.id && navigate(`/operator/routes/${s.route.id}`)} className="min-w-0 text-left">
                        <p className="font-bold text-slate-900 truncate">{s.route?.origin} <span className="text-[#FF8A65]">→</span> {s.route?.destination}</p>
                        <p className="text-xs text-slate-500 truncate">{s.bus?.name || 'No bus'} · {FREQUENCY_LABEL[String(s.frequency || 'ONCE').toUpperCase()] || s.frequency}</p>
                      </button>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusPill tone={status.tone}>{status.label}{s.delayMinutes ? ` · ${s.delayMinutes} min` : ''}</StatusPill>
                        {s.driverName ? <span className="text-xs text-slate-500">Driver: {s.driverName}</span> : <StatusPill tone="amber">No driver</StatusPill>}
                      </div>
                      <label className="flex items-center gap-2 md:justify-end cursor-pointer">
                        <span className="text-xs font-bold text-slate-600">{selling ? 'On sale' : 'Off'}</span>
                        <button role="switch" aria-checked={selling} aria-label="On sale" disabled={toggling === s.id} onClick={() => toggleSale(s)}
                          className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${selling ? 'bg-green-600' : 'bg-slate-300'}`}>
                          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${selling ? 'left-[22px]' : 'left-0.5'}`} />
                        </button>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-route-title"
          onClick={(e) => e.target === e.currentTarget && !savingEdit && setEditing(null)}>
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 id="edit-route-title" className="text-lg font-black text-slate-900">Edit route</h2>
            <div className="mt-4 space-y-3">
              {[['name', 'Route name'], ['origin', 'From'], ['destination', 'To']].map(([k, label]) => (
                <label key={k} className="block">
                  <span className="mb-1.5 block text-xs font-bold text-slate-600">{label}</span>
                  <input className={INPUT} value={editing[k] || ''} onChange={(e) => setEditing((p) => ({ ...p, [k]: e.target.value }))} />
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} disabled={savingEdit} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={savingEdit} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-50">{savingEdit ? 'Saving…' : 'Save'}</button>
            </div>
          </form>
        </div>
      )}

      {toDelete && (
        <ConfirmDialog
          title={`Delete ${toDelete.name}?`}
          message={(byRoute[String(toDelete.id)] || []).length
            ? 'This route has upcoming departures. If any of them have bookings the delete will be refused — switch those schedules off instead.'
            : 'Its schedules, stops and fares are removed permanently. Routes with bookings can’t be deleted.'}
          confirmLabel="Delete route"
          tone="danger"
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
        />
      )}
    </OperatorLayout>
  );
};

export default Schedules;
