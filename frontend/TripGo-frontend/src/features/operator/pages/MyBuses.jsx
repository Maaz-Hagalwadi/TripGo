import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { deleteBus, getBuses, getOperatorInsights, getPendingBuses, updateBus } from '../../../api/busService';
import { getAmenities } from '../../../api/amenityService';
import { ROUTES } from '../../../shared/constants/routes';
import {
  ActionButton, Card, ConfirmDialog, EmptyState, FilterTabs, PageHeader, SearchInput, SkeletonRows, StatCard, StatusPill,
} from '../../../shared/components/console/ConsoleUI';
import { headerPrimaryButton } from '../../../shared/components/console/consoleStyles';
import { istDate, prettyType } from '../utils/operatorFormat';

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50 disabled:text-slate-500';
const LABEL = 'mb-1.5 block text-xs font-bold text-slate-600';

const EditBusDialog = ({ bus, amenities, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: bus.name || '', busCode: bus.busCode || '', vehicleNumber: bus.vehicleNumber || '', model: bus.model || '',
    amenityIds: (bus.amenities || []).map((a) => a.id),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => { setForm((p) => ({ ...p, [k]: e.target.value })); setError(''); };
  const toggle = (id) => setForm((p) => ({ ...p, amenityIds: p.amenityIds.includes(id) ? p.amenityIds.filter((x) => x !== id) : [...p.amenityIds, id] }));

  const save = async (e) => {
    e.preventDefault();
    if (['name', 'busCode', 'vehicleNumber', 'model'].some((k) => !form[k].trim())) return setError('Name, bus code, number plate and model are required');
    setSaving(true);
    try {
      // Type and seat count are fixed once the seat layout exists — sent unchanged
      await updateBus(bus.id, { ...form, name: form.name.trim(), busCode: form.busCode.trim(), vehicleNumber: form.vehicleNumber.trim().toUpperCase(), model: form.model.trim(), busType: bus.busType, totalSeats: bus.totalSeats });
      toast.success(`${form.name.trim()} updated`);
      onSaved();
    } catch (err) {
      setError(err.message || 'Couldn’t save the bus');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-bus-title"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form onSubmit={save} className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl" noValidate>
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="edit-bus-title" className="text-lg font-black text-slate-900">Edit {bus.name}</h2>
            <p className="text-sm text-slate-500">{prettyType(bus.busType)} · {bus.totalSeats} seats</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-slate-500">close</span></button>
        </div>
        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5">
          <div><label className={LABEL} htmlFor="eb-name">Bus name</label><input id="eb-name" className={INPUT} value={form.name} onChange={set('name')} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className={LABEL} htmlFor="eb-code">Bus code</label><input id="eb-code" className={INPUT} value={form.busCode} onChange={set('busCode')} /></div>
            <div><label className={LABEL} htmlFor="eb-plate">Number plate</label><input id="eb-plate" className={`${INPUT} uppercase`} value={form.vehicleNumber} onChange={set('vehicleNumber')} /></div>
          </div>
          <div><label className={LABEL} htmlFor="eb-model">Model</label><input id="eb-model" className={INPUT} value={form.model} onChange={set('model')} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><span className={LABEL}>Bus type</span><input className={INPUT} value={prettyType(bus.busType)} disabled /></div>
            <div><span className={LABEL}>Seats</span><input className={INPUT} value={bus.totalSeats} disabled /></div>
          </div>
          <p className="-mt-2 text-xs text-slate-500">Type and seats match the seat layout and can’t be changed. Add a new bus for a different layout.</p>
          {amenities.length > 0 && (
            <div>
              <span className={LABEL}>Amenities</span>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a) => {
                  const on = form.amenityIds.includes(a.id);
                  return (
                    <button key={a.id} type="button" onClick={() => toggle(a.id)} aria-pressed={on}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${on ? 'bg-primary border-primary text-white' : 'border-slate-200 text-slate-600 hover:border-[#FF8A65]'}`}>
                      {a.description || prettyType(a.code)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-50">{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  );
};

const MyBuses = () => {
  const navigate = useNavigate();
  const [buses, setBuses] = useState([]);
  const [insights, setInsights] = useState({});
  const [amenities, setAmenities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [active, pending, ins] = await Promise.allSettled([getBuses(), getPendingBuses(), getOperatorInsights()]);
    const list = (r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []);
    setBuses([...list(pending).map((b) => ({ ...b, active: false })), ...list(active)]);
    // Per-bus schedule and booking counts from one call (it used to be one occupancy request per bus)
    const rows = ins.status === 'fulfilled' && Array.isArray(ins.value?.busInsights) ? ins.value.busInsights : [];
    setInsights(Object.fromEntries(rows.map((r) => [String(r.busId), r])));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    getAmenities().then((a) => setAmenities(Array.isArray(a) ? a : [])).catch(() => {});
  }, [load]);

  const q = search.trim().toLowerCase();
  const rows = useMemo(() => buses
    .filter((b) => filter === 'ALL' || (filter === 'ACTIVE' ? b.active : !b.active))
    .filter((b) => !q || [b.name, b.busCode, b.vehicleNumber, b.model].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => Number(a.active) - Number(b.active) || String(a.name).localeCompare(String(b.name))), [buses, filter, q]);

  const activeCount = buses.filter((b) => b.active).length;
  const totalSeats = buses.filter((b) => b.active).reduce((n, b) => n + Number(b.totalSeats || 0), 0);
  const totalBooked = Object.values(insights).reduce((n, r) => n + Number(r.totalBooked || 0), 0);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteBus(toDelete.id);
      toast.success(`${toDelete.name} deleted`);
      setToDelete(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Couldn’t delete the bus');
    } finally {
      setDeleting(false);
    }
  };

  const amenityChips = (bus) => (bus.amenities || []).map((a) => (
    <span key={a.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{a.description || prettyType(a.code)}</span>
  ));

  return (
    <OperatorLayout activeItem="my-buses" title="My buses">
      <div className="space-y-5">
        <PageHeader
          title="My buses"
          subtitle="Your fleet, approval status and bus details"
          actions={<button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className={headerPrimaryButton}><span className="material-symbols-outlined text-[18px]">add</span>Add bus</button>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="directions_bus" tone="green" label="Active buses" value={activeCount} sub="Can be scheduled" loading={loading} onClick={() => setFilter('ACTIVE')} />
          <StatCard icon="pending_actions" tone="amber" label="Awaiting approval" value={buses.length - activeCount} sub="Usually within a day" loading={loading} onClick={() => setFilter('PENDING')} />
          <StatCard icon="event_seat" tone="navy" label="Seats in service" value={totalSeats.toLocaleString('en-IN')} sub="Across active buses" loading={loading} />
          <StatCard icon="confirmation_number" tone="blue" label="Seats booked" value={totalBooked.toLocaleString('en-IN')} sub="All time, all buses" loading={loading} />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <FilterTabs
            options={[{ value: 'ALL', label: 'All', count: buses.length }, { value: 'ACTIVE', label: 'Active', count: activeCount }, { value: 'PENDING', label: 'Awaiting approval', count: buses.length - activeCount }]}
            value={filter}
            onChange={setFilter}
            label="Bus status"
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, code or number plate" className="lg:ml-auto lg:w-80" />
        </div>

        <Card>
          {loading ? <SkeletonRows /> : rows.length === 0 ? (
            <EmptyState
              icon="directions_bus"
              title={buses.length ? 'No buses match' : 'Add your first bus'}
              subtitle={buses.length ? 'Try a different filter or search.' : 'Register a bus with its seat layout. TripGo approves it before you can schedule trips.'}
              action={!buses.length && <button onClick={() => navigate(ROUTES.OPERATOR_ADD_BUS)} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">Add a bus</button>}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((bus) => {
                const ins = insights[String(bus.id)] || {};
                const open = expanded === bus.id;
                return (
                  <li key={bus.id}>
                    <div className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${bus.active ? 'bg-primary/5 text-primary' : 'bg-amber-50 text-amber-600'}`}>
                          <span className="material-symbols-outlined text-[22px]">directions_bus</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{bus.name}</p>
                          <p className="text-xs text-slate-500 font-mono truncate">{[bus.vehicleNumber, bus.busCode].filter(Boolean).join(' · ')}</p>
                        </div>
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold text-slate-800">{prettyType(bus.busType)}</p>
                        <p className="text-xs text-slate-500">{bus.totalSeats} seats{bus.model ? ` · ${bus.model}` : ''}</p>
                      </div>
                      <div className="text-sm">
                        {bus.active ? (
                          <>
                            <p className="font-semibold text-slate-800">{Number(ins.totalSchedules || 0)} schedule{Number(ins.totalSchedules) === 1 ? '' : 's'}</p>
                            <p className="text-xs text-slate-500">{Number(ins.totalBooked || 0).toLocaleString('en-IN')} seats booked</p>
                          </>
                        ) : (
                          <StatusPill tone="amber">Awaiting approval</StatusPill>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                        {bus.active && <StatusPill tone="green">Active</StatusPill>}
                        <ActionButton icon={open ? 'expand_less' : 'expand_more'} onClick={() => setExpanded(open ? null : bus.id)} aria-expanded={open}>Details</ActionButton>
                        <ActionButton icon="edit" onClick={() => setEditing(bus)}>Edit</ActionButton>
                        <ActionButton icon="delete" tone="danger" onClick={() => setToDelete(bus)} aria-label={`Delete ${bus.name}`} />
                      </div>
                    </div>
                    {open && (
                      <div className="grid gap-4 bg-slate-50/70 px-5 py-4 text-sm sm:grid-cols-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Amenities</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">{amenityChips(bus).length ? amenityChips(bus) : <span className="text-slate-500">None listed</span>}</div>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Added</p>
                          <p className="mt-1 text-slate-700">{istDate(bus.createdAt)}</p>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Next step</p>
                          <p className="mt-1 text-slate-700">
                            {bus.active
                              ? <button onClick={() => navigate(ROUTES.OPERATOR_SCHEDULES)} className="font-bold text-primary hover:text-[#FF8A65]">Schedule this bus on a route →</button>
                              : 'TripGo is reviewing this bus. You’ll get an email and notification once it’s approved.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {editing && <EditBusDialog bus={editing} amenities={amenities} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {toDelete && (
        <ConfirmDialog
          title={`Delete ${toDelete.name}?`}
          message={Number(insights[String(toDelete.id)]?.totalSchedules || 0) > 0
            ? 'This bus is used by schedules. Delete those schedules (or move them to another bus) first — otherwise the delete will be refused.'
            : 'The bus, its seat layout and any bus-specific fares are removed permanently.'}
          confirmLabel="Delete bus"
          tone="danger"
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
        />
      )}
    </OperatorLayout>
  );
};

export default MyBuses;
