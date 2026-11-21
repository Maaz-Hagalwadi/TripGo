import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { addDriver, deleteDriver, getDrivers, updateDriver } from '../../../api/operatorDriverService';
import {
  ActionButton, Avatar, Card, ConfirmDialog, EmptyState, FilterTabs, PageHeader, SearchInput, SkeletonRows, StatCard, StatusPill,
} from '../../../shared/components/console/ConsoleUI';
import { headerPrimaryButton } from '../../../shared/components/console/consoleStyles';
import { toIstYmd } from '../../../shared/utils/scheduleSearchUtils';

const EMPTY = { firstName: '', lastName: '', phone: '', licenseNumber: '', licenseExpiry: '' };
const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';
const LABEL = 'mb-1.5 block text-xs font-bold text-slate-600';

const name = (d) => `${d?.firstName || ''} ${d?.lastName || ''}`.trim() || 'Driver';
const addDays = (ymd, n) => { const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const formatYmd = (ymd) => (ymd ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');

// License dates are calendar days: compare as YYYY-MM-DD strings against today in IST
const licenseState = (d, today) => {
  if (!d.licenseExpiry) return 'UNKNOWN';
  if (d.licenseExpiry < today) return 'EXPIRED';
  if (d.licenseExpiry <= addDays(today, 30)) return 'EXPIRING';
  return 'VALID';
};
const STATE = {
  VALID: { label: 'Valid', tone: 'green' },
  EXPIRING: { label: 'Expires soon', tone: 'amber' },
  EXPIRED: { label: 'Expired', tone: 'red' },
  UNKNOWN: { label: 'No expiry date', tone: 'slate' },
};

const DriverDialog = ({ driver, onClose, onSaved }) => {
  const editing = Boolean(driver?.id);
  const [form, setForm] = useState(editing ? { ...EMPTY, ...driver } : EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const today = toIstYmd(new Date());
  const set = (k, v) => { setForm((p) => ({ ...p, [k]: v })); setErrors((p) => ({ ...p, [k]: '' })); };

  const save = async (e) => {
    e.preventDefault();
    const err = {};
    if (!form.firstName.trim()) err.firstName = 'Required';
    if (!/^\d{10}$/.test(form.phone)) err.phone = 'Enter a 10-digit mobile number';
    if (!/^[A-Z0-9-]{8,20}$/.test(form.licenseNumber.trim().toUpperCase().replace(/\s/g, ''))) err.licenseNumber = 'Enter the licence number as printed (8–20 letters/numbers)';
    if (!form.licenseExpiry) err.licenseExpiry = 'Required';
    else if (!editing && form.licenseExpiry < today) err.licenseExpiry = 'This licence has already expired';
    setErrors(err);
    if (Object.keys(err).length) return;
    setSaving(true);
    try {
      const payload = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone, licenseNumber: form.licenseNumber.trim().toUpperCase().replace(/\s/g, ''), licenseExpiry: form.licenseExpiry };
      if (editing) await updateDriver(driver.id, payload); else await addDriver(payload);
      toast.success(editing ? `${payload.firstName} updated` : `${payload.firstName} added`);
      onSaved();
    } catch (er) {
      toast.error(er.message || 'Couldn’t save the driver');
    } finally {
      setSaving(false);
    }
  };

  const err = (k) => (errors[k] ? <p className="mt-1 text-xs text-red-600">{errors[k]}</p> : null);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="driver-title"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <form onSubmit={save} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" noValidate>
        <h2 id="driver-title" className="text-lg font-black text-slate-900">{editing ? `Edit ${name(driver)}` : 'Add a driver'}</h2>
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={LABEL} htmlFor="d-first">First name</label><input id="d-first" className={INPUT} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} autoComplete="off" />{err('firstName')}</div>
            <div><label className={LABEL} htmlFor="d-last">Last name</label><input id="d-last" className={INPUT} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} autoComplete="off" /></div>
          </div>
          <div><label className={LABEL} htmlFor="d-phone">Mobile number</label><input id="d-phone" inputMode="numeric" className={INPUT} value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit mobile" />{err('phone')}</div>
          <div><label className={LABEL} htmlFor="d-lic">Driving licence number</label><input id="d-lic" className={`${INPUT} uppercase`} value={form.licenseNumber} onChange={(e) => set('licenseNumber', e.target.value)} placeholder="e.g. KA0120230012345" />{err('licenseNumber')}</div>
          <div><label className={LABEL} htmlFor="d-exp">Licence valid until</label><input id="d-exp" type="date" className={INPUT} value={form.licenseExpiry} min={editing ? undefined : today} onChange={(e) => set('licenseExpiry', e.target.value)} />{err('licenseExpiry')}</div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save changes' : 'Add driver'}</button>
        </div>
      </form>
    </div>
  );
};

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // {} = new
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const today = toIstYmd(new Date());

  const load = useCallback(async () => {
    try {
      const d = await getDrivers();
      setDrivers(Array.isArray(d) ? d : Array.isArray(d?.content) ? d.content : []);
    } catch (e) {
      toast.error(e.message || 'Couldn’t load drivers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const count = (s) => drivers.filter((d) => licenseState(d, today) === s).length;
  const q = search.trim().toLowerCase();
  const rows = useMemo(() => drivers
    .filter((d) => filter === 'ALL' || (filter === 'UNASSIGNED' ? !d.assignedBusId : licenseState(d, today) === filter))
    .filter((d) => !q || [name(d), d.phone, d.licenseNumber, d.assignedBusName].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => ['EXPIRED', 'EXPIRING', 'UNKNOWN', 'VALID'].indexOf(licenseState(a, today)) - ['EXPIRED', 'EXPIRING', 'UNKNOWN', 'VALID'].indexOf(licenseState(b, today)) || name(a).localeCompare(name(b))),
  [drivers, filter, q, today]);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteDriver(toDelete.id);
      toast.success(`${name(toDelete)} removed`);
      setToDelete(null);
      load();
    } catch (e) {
      toast.error(e.message || 'Couldn’t remove the driver');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <OperatorLayout activeItem="drivers" title="Drivers">
      <div className="space-y-5">
        <PageHeader
          title="Drivers"
          subtitle="Your crew and their licence validity · assign drivers to buses from a route’s schedules"
          actions={<button onClick={() => setEditing({})} className={headerPrimaryButton}><span className="material-symbols-outlined text-[18px]">person_add</span>Add driver</button>}
        />

        {!loading && count('EXPIRED') > 0 && (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 border border-red-200 px-5 py-3 text-sm text-red-800">
            <span className="material-symbols-outlined text-red-600">warning</span>
            <p><b>{count('EXPIRED')} driver{count('EXPIRED') > 1 ? 's have' : ' has'} an expired licence.</b> Renew or replace them before their next trip.</p>
          </div>
        )}

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="badge" tone="navy" label="Drivers" value={drivers.length} loading={loading} />
          <StatCard icon="directions_bus" tone="blue" label="Assigned to a bus" value={drivers.filter((d) => d.assignedBusId).length} sub={`${drivers.filter((d) => !d.assignedBusId).length} available`} loading={loading} onClick={() => setFilter('UNASSIGNED')} />
          <StatCard icon="schedule" tone="amber" label="Licence expires in 30 days" value={count('EXPIRING')} loading={loading} onClick={() => setFilter('EXPIRING')} />
          <StatCard icon="gpp_bad" tone="red" label="Licence expired" value={count('EXPIRED')} loading={loading} onClick={() => setFilter('EXPIRED')} />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <FilterTabs
            options={[{ value: 'ALL', label: 'All', count: drivers.length }, { value: 'VALID', label: 'Valid', count: count('VALID') }, { value: 'EXPIRING', label: 'Expiring', count: count('EXPIRING') }, { value: 'EXPIRED', label: 'Expired', count: count('EXPIRED') }, { value: 'UNASSIGNED', label: 'No bus', count: drivers.filter((d) => !d.assignedBusId).length }]}
            value={filter}
            onChange={setFilter}
            label="Driver filter"
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone or licence" className="lg:ml-auto lg:w-80" />
        </div>

        <Card>
          {loading ? <SkeletonRows /> : rows.length === 0 ? (
            <EmptyState icon="badge" title={drivers.length ? 'No drivers match' : 'Add your first driver'} subtitle={drivers.length ? 'Try a different filter.' : 'Drivers are shown to your operations team and assigned per bus.'}
              action={!drivers.length && <button onClick={() => setEditing({})} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">Add driver</button>} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((d) => {
                const st = licenseState(d, today);
                return (
                  <li key={d.id} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={name(d)} />
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900 truncate">{name(d)}</p>
                        {d.phone ? <a href={`tel:${d.phone}`} className="text-xs text-slate-500 hover:text-primary">{d.phone}</a> : <span className="text-xs text-slate-400">No phone</span>}
                      </div>
                    </div>
                    <div className="text-sm">
                      <p className="font-mono text-slate-700">{d.licenseNumber || '—'}</p>
                      <p className={`text-xs ${st === 'EXPIRED' ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>{st === 'EXPIRED' ? 'Expired' : 'Valid until'} {formatYmd(d.licenseExpiry)}</p>
                    </div>
                    <div className="text-sm">
                      {d.assignedBusName
                        ? <><p className="font-semibold text-slate-800 truncate">{d.assignedBusName}</p><p className="text-xs text-slate-500 font-mono">{d.assignedBusNumber}</p></>
                        : <span className="text-slate-400">Not assigned</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                      <StatusPill tone={STATE[st].tone}>{STATE[st].label}</StatusPill>
                      <ActionButton icon="edit" onClick={() => setEditing({ ...d })} aria-label={`Edit ${name(d)}`} />
                      <ActionButton icon="delete" tone="danger" onClick={() => setToDelete(d)} aria-label={`Remove ${name(d)}`} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {editing && <DriverDialog driver={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {toDelete && (
        <ConfirmDialog
          title={`Remove ${name(toDelete)}?`}
          message={toDelete.assignedBusName ? `They’ll be unassigned from ${toDelete.assignedBusName}. Assign another driver to that bus before its next trip.` : 'Their details are deleted permanently.'}
          confirmLabel="Remove driver"
          tone="danger"
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
        />
      )}
    </OperatorLayout>
  );
};

export default Drivers;
