import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../api/apiClient';
import { toIstYmd } from '../shared/utils/scheduleSearchUtils';
import {
  ActionButton, Card, ConfirmDialog, EmptyState, FilterTabs, PageHeader, SearchInput, SkeletonRows, StatCard, StatusPill,
} from '../shared/components/console/ConsoleUI';
import { headerPrimaryButton } from '../shared/components/console/consoleStyles';

const fetchDiscounts = () => apiGet('/admin/discounts');
const createDiscount = (body) => apiPost('/admin/discounts', body);
const updateDiscount = (id, body) => apiPut(`/admin/discounts/${id}`, body);
const toggleDiscount = (id) => apiPatch(`/admin/discounts/${id}/toggle`, {});
const deleteDiscount = (id) => apiDelete(`/admin/discounts/${id}`);

const EMPTY_FORM = { code: '', description: '', type: 'PERCENT', value: '', maxDiscount: '', minOrderAmount: '', usageLimit: '', perCustomerLimit: '', firstBookingOnly: false, validFrom: '', validTo: '', active: true };
const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50 disabled:text-slate-500';
const LABEL = 'mb-1.5 block text-xs font-bold text-slate-600';

// Promo dates are IST calendar days and inclusive (the backend accepts a code through its last day)
const promoState = (p, today) => {
  if (p.validTo && today > p.validTo) return 'EXPIRED';
  if (!p.active) return 'OFF';
  if (p.validFrom && today < p.validFrom) return 'SCHEDULED';
  if (p.usageLimit && (p.usedCount || 0) >= p.usageLimit) return 'USED_UP';
  return 'LIVE';
};
const STATE_META = {
  LIVE: { label: 'Live', tone: 'green' },
  SCHEDULED: { label: 'Scheduled', tone: 'blue' },
  OFF: { label: 'Off', tone: 'slate' },
  EXPIRED: { label: 'Expired', tone: 'red' },
  USED_UP: { label: 'Limit reached', tone: 'amber' },
};

const formatDay = (ymd) => (ymd ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');
const validity = (p) => {
  if (!p.validFrom && !p.validTo) return 'No end date';
  if (!p.validTo) return `From ${formatDay(p.validFrom)}`;
  if (!p.validFrom) return `Until ${formatDay(p.validTo)}`;
  return `${formatDay(p.validFrom)} – ${formatDay(p.validTo)}`;
};
const discountText = (p) => (p.type === 'PERCENT' ? `${Number(p.value)}% off` : `₹${Number(p.value).toLocaleString('en-IN')} off`);
const describe = (f) => {
  if (!Number(f.value)) return '';
  const parts = [f.type === 'PERCENT' ? `${Number(f.value)}% off` : `₹${Number(f.value).toLocaleString('en-IN')} off`];
  if (f.type === 'PERCENT' && Number(f.maxDiscount)) parts.push(`up to ₹${Number(f.maxDiscount).toLocaleString('en-IN')}`);
  if (Number(f.minOrderAmount)) parts.push(`on bookings over ₹${Number(f.minOrderAmount).toLocaleString('en-IN')}`);
  return `Travellers get ${parts.join(' ')}.`;
};

const PromoDialog = ({ promo, onClose, onSaved }) => {
  const isEdit = Boolean(promo?.id);
  const [form, setForm] = useState(() => (isEdit
    ? Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, promo[k] ?? EMPTY_FORM[k]]))
    : EMPTY_FORM));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key, val) => { setForm((p) => ({ ...p, [key]: val })); setErrors((p) => ({ ...p, [key]: '' })); };

  const validate = () => {
    const e = {};
    if (!/^[A-Z0-9]{3,20}$/.test(form.code.trim())) e.code = '3–20 letters or numbers, no spaces';
    const v = Number(form.value);
    if (!(v > 0)) e.value = 'Enter an amount above 0';
    else if (form.type === 'PERCENT' && v > 100) e.value = 'A percentage can’t be more than 100';
    if (form.maxDiscount !== '' && !(Number(form.maxDiscount) > 0)) e.maxDiscount = 'Leave empty or enter an amount above 0';
    if (form.minOrderAmount !== '' && Number(form.minOrderAmount) < 0) e.minOrderAmount = 'Can’t be negative';
    if (form.usageLimit !== '' && !(Number.isInteger(Number(form.usageLimit)) && Number(form.usageLimit) >= 1)) e.usageLimit = 'Leave empty or enter a whole number';
    if (form.perCustomerLimit !== '' && !(Number.isInteger(Number(form.perCustomerLimit)) && Number(form.perCustomerLimit) >= 1)) e.perCustomerLimit = 'Leave empty or enter a whole number';
    if (form.validFrom && form.validTo && form.validTo < form.validFrom) e.validTo = 'Must be on or after the start date';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim(),
        description: form.description.trim(),
        value: Number(form.value),
        maxDiscount: form.type === 'PERCENT' && form.maxDiscount !== '' ? Number(form.maxDiscount) : null,
        minOrderAmount: form.minOrderAmount !== '' ? Number(form.minOrderAmount) : null,
        usageLimit: form.usageLimit !== '' ? Number(form.usageLimit) : null,
        perCustomerLimit: form.perCustomerLimit !== '' ? Number(form.perCustomerLimit) : null,
        firstBookingOnly: Boolean(form.firstBookingOnly),
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
      };
      if (isEdit) await updateDiscount(promo.id, payload);
      else await createDiscount(payload);
      toast.success(isEdit ? `${payload.code} updated` : `${payload.code} created`);
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Couldn’t save the promo code');
    } finally {
      setSaving(false);
    }
  };

  const err = (k) => (errors[k] ? <p className="mt-1 text-xs text-red-600">{errors[k]}</p> : null);

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="promo-title"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="promo-title" className="text-lg font-black text-slate-900">{isEdit ? `Edit ${promo.code}` : 'New promo code'}</h2>
            <p className="text-sm text-slate-500">{isEdit ? 'The code itself can’t be changed' : 'Travellers enter this code at checkout'}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-slate-500">close</span></button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); save(); }} className="max-h-[65vh] space-y-4 overflow-y-auto px-6 py-5" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="promo-code">Code</label>
              <input id="promo-code" className={`${INPUT} font-mono uppercase`} value={form.code} disabled={isEdit} autoComplete="off"
                onChange={(e) => set('code', e.target.value.toUpperCase().replace(/\s/g, ''))} placeholder="SUMMER30" />
              {err('code')}
            </div>
            <div>
              <span className={LABEL}>Discount type</span>
              <div className="flex rounded-xl border border-slate-200 p-1">
                {[['PERCENT', 'Percent'], ['FLAT', 'Flat ₹']].map(([v, l]) => (
                  <button key={v} type="button" onClick={() => set('type', v)} aria-pressed={form.type === v}
                    className={`flex-1 rounded-lg py-1.5 text-sm font-bold transition-colors ${form.type === v ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary'}`}>{l}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="promo-value">{form.type === 'PERCENT' ? 'Discount (%)' : 'Discount (₹)'}</label>
              <input id="promo-value" className={INPUT} type="number" inputMode="decimal" min="0" max={form.type === 'PERCENT' ? 100 : undefined} value={form.value}
                onChange={(e) => set('value', e.target.value)} placeholder={form.type === 'PERCENT' ? '20' : '150'} />
              {err('value')}
            </div>
            {form.type === 'PERCENT' && (
              <div>
                <label className={LABEL} htmlFor="promo-max">Maximum discount (₹) <span className="font-normal text-slate-400">optional</span></label>
                <input id="promo-max" className={INPUT} type="number" inputMode="numeric" min="0" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="No cap" />
                {err('maxDiscount')}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="promo-min">Minimum booking (₹) <span className="font-normal text-slate-400">optional</span></label>
              <input id="promo-min" className={INPUT} type="number" inputMode="numeric" min="0" value={form.minOrderAmount} onChange={(e) => set('minOrderAmount', e.target.value)} placeholder="Any amount" />
              {err('minOrderAmount')}
            </div>
            <div>
              <label className={LABEL} htmlFor="promo-limit">Total uses allowed <span className="font-normal text-slate-400">optional</span></label>
              <input id="promo-limit" className={INPUT} type="number" inputMode="numeric" min="1" step="1" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} placeholder="Unlimited" />
              {err('usageLimit')}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="promo-per-customer">Uses per traveller <span className="font-normal text-slate-400">optional</span></label>
              <input id="promo-per-customer" className={INPUT} type="number" inputMode="numeric" min="1" step="1" value={form.perCustomerLimit} onChange={(e) => set('perCustomerLimit', e.target.value)} placeholder="Unlimited" />
              {err('perCustomerLimit')}
              <p className="mt-1 text-xs text-slate-500">Counted by account, email and phone, so guests can’t reuse it either.</p>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-3.5 cursor-pointer sm:mt-6">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[#0B1F3A]" checked={Boolean(form.firstBookingOnly)} onChange={(e) => set('firstBookingOnly', e.target.checked)} />
              <span>
                <span className="block text-sm font-bold text-slate-800">First booking only</span>
                <span className="block text-xs text-slate-500">Only travellers with no confirmed TripGo booking yet</span>
              </span>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={LABEL} htmlFor="promo-from">Starts <span className="font-normal text-slate-400">optional</span></label>
              <input id="promo-from" className={INPUT} type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
            </div>
            <div>
              <label className={LABEL} htmlFor="promo-to">Last day <span className="font-normal text-slate-400">optional</span></label>
              <input id="promo-to" className={INPUT} type="date" min={form.validFrom || undefined} value={form.validTo} onChange={(e) => set('validTo', e.target.value)} />
              {err('validTo')}
            </div>
          </div>

          <div>
            <label className={LABEL} htmlFor="promo-desc">Description <span className="font-normal text-slate-400">for your team</span></label>
            <input id="promo-desc" className={INPUT} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Diwali sale on all routes" />
          </div>

          <label className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 cursor-pointer">
            <span>
              <span className="block text-sm font-bold text-slate-900">Active</span>
              <span className="block text-xs text-slate-500">{form.active ? 'Travellers can use this code' : 'The code is switched off'}</span>
            </span>
            <button type="button" role="switch" aria-checked={form.active} onClick={() => set('active', !form.active)}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${form.active ? 'bg-green-600' : 'bg-slate-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${form.active ? 'left-[22px]' : 'left-0.5'}`} />
            </button>
          </label>

          {describe(form) && (
            <p className="flex items-start gap-2 rounded-xl bg-[#FFF7F2] border border-[#FDBA74]/40 px-4 py-3 text-sm text-slate-700">
              <span className="material-symbols-outlined text-[18px] text-orange-600">sell</span>
              {describe(form)}
            </p>
          )}
          <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
        </form>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
          <button onClick={onClose} disabled={saving} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-50">
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create code'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPromos = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // promo, or {} for a new one
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const today = toIstYmd(new Date());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDiscounts();
      setPromos(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || 'Couldn’t load promo codes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const withState = useMemo(() => promos.map((p) => ({ ...p, state: promoState(p, today) }))
    .sort((a, b) => String(a.code).localeCompare(String(b.code))), [promos, today]);
  const q = search.trim().toLowerCase();
  const rows = withState
    .filter((p) => filter === 'ALL' || p.state === filter)
    .filter((p) => !q || [p.code, p.description].some((v) => String(v || '').toLowerCase().includes(q)));
  const count = (state) => withState.filter((p) => p.state === state).length;
  const in7Days = toIstYmd(new Date(Date.now() + 7 * 864e5));
  const expiringSoon = withState.filter((p) => p.state === 'LIVE' && p.validTo && p.validTo <= in7Days).length;

  const toggle = async (p) => {
    setToggling(p.id);
    try {
      const updated = await toggleDiscount(p.id);
      setPromos((prev) => prev.map((x) => (x.id === p.id ? { ...x, active: updated?.active ?? !x.active } : x)));
      toast.success(`${p.code} ${p.active ? 'switched off' : 'switched on'}`);
    } catch (e) {
      toast.error(e.message || 'Couldn’t update the code');
    } finally {
      setToggling(null);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteDiscount(toDelete.id);
      setPromos((prev) => prev.filter((x) => x.id !== toDelete.id));
      toast.success(`${toDelete.code} deleted`);
      setToDelete(null);
    } catch (e) {
      toast.error(e.message || 'Couldn’t delete the code');
    } finally {
      setDeleting(false);
    }
  };

  const copy = (code) => navigator.clipboard?.writeText(code).then(() => toast.success(`${code} copied`)).catch(() => {});

  return (
    <AdminLayout title="Promo codes" activeItemOverride="promos">
      <div className="space-y-5">
        <PageHeader
          title="Promo codes"
          subtitle="Discounts travellers can apply at checkout"
          actions={<button onClick={() => setEditing({})} className={headerPrimaryButton}><span className="material-symbols-outlined text-[18px]">add</span>New code</button>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="sell" tone="navy" label="All codes" value={promos.length} loading={loading} />
          <StatCard icon="check_circle" tone="green" label="Live now" value={count('LIVE')} loading={loading} onClick={() => setFilter('LIVE')} />
          <StatCard icon="schedule" tone="amber" label="Ending within 7 days" value={expiringSoon} loading={loading} onClick={() => setFilter('LIVE')} />
          <StatCard icon="event_busy" tone="red" label="Expired" value={count('EXPIRED')} loading={loading} onClick={() => setFilter('EXPIRED')} />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <FilterTabs
            options={[{ value: 'ALL', label: 'All', count: promos.length }, ...['LIVE', 'SCHEDULED', 'OFF', 'EXPIRED', 'USED_UP'].map((s) => ({ value: s, label: STATE_META[s].label, count: count(s) }))]}
            value={filter}
            onChange={setFilter}
            label="Code status"
          />
          <SearchInput value={search} onChange={setSearch} placeholder="Search codes" className="lg:ml-auto lg:w-72" />
        </div>

        <Card>
          {loading ? <SkeletonRows rows={4} /> : rows.length === 0 ? (
            <EmptyState
              icon="sell"
              title={promos.length ? 'No codes match' : 'No promo codes yet'}
              subtitle={promos.length ? 'Try a different filter or search.' : 'Create a code to offer travellers a discount.'}
              action={!promos.length && <button onClick={() => setEditing({})} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">New code</button>}
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {rows.map((p) => {
                const meta = STATE_META[p.state];
                const used = Number(p.usedCount || 0);
                return (
                  <li key={p.id} className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => copy(p.code)} title="Copy code" className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[#FF8A65] bg-[#FFF7F2] px-2.5 py-1 font-mono text-sm font-black tracking-wider text-slate-900 hover:bg-[#FDBA74]/20">
                          {p.code}<span className="material-symbols-outlined text-[14px] text-orange-600">content_copy</span>
                        </button>
                        <StatusPill tone={meta.tone}>{meta.label}</StatusPill>
                      </div>
                      {p.description && <p className="mt-1.5 text-xs text-slate-500 truncate">{p.description}</p>}
                    </div>
                    <div className="text-sm">
                      <p className="font-black text-slate-900">{discountText(p)}</p>
                      <p className="text-xs text-slate-500">
                        {[p.type === 'PERCENT' && p.maxDiscount ? `up to ₹${Number(p.maxDiscount).toLocaleString('en-IN')}` : null,
                          p.minOrderAmount ? `min ₹${Number(p.minOrderAmount).toLocaleString('en-IN')}` : null].filter(Boolean).join(' · ') || 'Any booking'}
                      </p>
                    </div>
                    <div className="text-sm">
                      <p className={p.state === 'EXPIRED' ? 'text-red-600' : 'text-slate-700'}>{validity(p)}</p>
                      <p className="text-xs text-slate-500">{p.usageLimit ? `${used} of ${p.usageLimit} uses` : `${used} uses · no limit`}</p>
                      {(p.firstBookingOnly || p.perCustomerLimit) && <p className="text-xs text-slate-500">{[p.firstBookingOnly && 'First booking only', p.perCustomerLimit && `${p.perCustomerLimit}× per traveller`].filter(Boolean).join(' · ')}</p>}
                    </div>
                    <div className="flex items-center gap-2 md:justify-end">
                      <button
                        role="switch"
                        aria-checked={!!p.active}
                        aria-label={`${p.code} ${p.active ? 'on' : 'off'}`}
                        disabled={toggling === p.id || p.state === 'EXPIRED'}
                        onClick={() => toggle(p)}
                        title={p.state === 'EXPIRED' ? 'Expired — edit the dates to reuse it' : p.active ? 'Switch off' : 'Switch on'}
                        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-40 ${p.active ? 'bg-green-600' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${p.active ? 'left-[22px]' : 'left-0.5'}`} />
                      </button>
                      <ActionButton icon="edit" onClick={() => setEditing(p)}>Edit</ActionButton>
                      <ActionButton icon="delete" tone="danger" onClick={() => setToDelete(p)} aria-label={`Delete ${p.code}`} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {editing && <PromoDialog promo={editing.id ? editing : null} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {toDelete && (
        <ConfirmDialog
          title={`Delete ${toDelete.code}?`}
          message="Travellers won’t be able to use it any more. Bookings that already used it are not affected. To pause it instead, switch it off."
          confirmLabel="Delete"
          tone="danger"
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminPromos;
