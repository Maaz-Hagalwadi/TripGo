import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '../api/apiClient';

const fetchDiscounts = () => apiGet('/admin/discounts');
const createDiscount = (body) => apiPost('/admin/discounts', body);
const updateDiscount = (id, body) => apiPut(`/admin/discounts/${id}`, body);
const toggleDiscount = (id) => apiPatch(`/admin/discounts/${id}/toggle`, {});
const deleteDiscount = (id) => apiDelete(`/admin/discounts/${id}`);

const EMPTY_FORM = {
  code: '',
  description: '',
  type: 'PERCENT',
  value: '',
  maxDiscount: '',
  minOrderAmount: '',
  usageLimit: '',
  validFrom: '',
  validTo: '',
  active: true,
};

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#002046] focus:ring-1 focus:ring-[#002046] transition-colors';
const LABEL = 'block text-xs font-semibold text-slate-500 mb-1';

const PromoModal = ({ promo, onClose, onSaved }) => {
  const isEdit = Boolean(promo?.id);
  const [form, setForm] = useState(
    isEdit
      ? {
          code: promo.code || '',
          description: promo.description || '',
          type: promo.type || 'PERCENT',
          value: promo.value ?? '',
          maxDiscount: promo.maxDiscount ?? '',
          minOrderAmount: promo.minOrderAmount ?? '',
          usageLimit: promo.usageLimit ?? '',
          validFrom: promo.validFrom || '',
          validTo: promo.validTo || '',
          active: promo.active ?? true,
        }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.code.trim()) return toast.error('Code is required');
    if (!form.value) return toast.error('Discount value is required');
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value),
        maxDiscount: form.maxDiscount !== '' ? Number(form.maxDiscount) : null,
        minOrderAmount: form.minOrderAmount !== '' ? Number(form.minOrderAmount) : null,
        usageLimit: form.usageLimit !== '' ? Number(form.usageLimit) : null,
        validFrom: form.validFrom || null,
        validTo: form.validTo || null,
      };
      if (isEdit) {
        await updateDiscount(promo.id, payload);
        toast.success('Promo updated');
      } else {
        await createDiscount(payload);
        toast.success('Promo created');
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Failed to save promo');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-black text-slate-900">{isEdit ? 'Edit Promo Code' : 'New Promo Code'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{isEdit ? `Editing ${promo.code}` : 'Fill in the details below'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-slate-500 text-sm">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL}>Code *</label>
              <input className={INPUT} value={form.code} onChange={(e) => set('code', e.target.value.toUpperCase())} placeholder="e.g. SUMMER30" disabled={isEdit} />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className={LABEL}>Type *</label>
              <select className={INPUT} value={form.type} onChange={(e) => set('type', e.target.value)}>
                <option value="PERCENT">Percent (%)</option>
                <option value="FLAT">Flat (₹)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>{form.type === 'PERCENT' ? 'Discount %' : 'Flat Discount (₹)'} *</label>
              <input className={INPUT} type="number" min="0" step="0.01" value={form.value} onChange={(e) => set('value', e.target.value)} placeholder={form.type === 'PERCENT' ? '20' : '100'} />
            </div>
            <div>
              <label className={LABEL}>Max Discount (₹) {form.type === 'PERCENT' ? '(cap)' : ''}</label>
              <input className={INPUT} type="number" min="0" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} placeholder="500 (optional)" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Min Order Amount (₹)</label>
              <input className={INPUT} type="number" min="0" value={form.minOrderAmount} onChange={(e) => set('minOrderAmount', e.target.value)} placeholder="200 (optional)" />
            </div>
            <div>
              <label className={LABEL}>Usage Limit</label>
              <input className={INPUT} type="number" min="1" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} placeholder="Unlimited" />
            </div>
          </div>

          <div>
            <label className={LABEL}>Description</label>
            <input className={INPUT} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Summer sale — 30% off all trips" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Valid From</label>
              <input className={INPUT} type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} />
            </div>
            <div>
              <label className={LABEL}>Valid To</label>
              <input className={INPUT} type="date" value={form.validTo} onChange={(e) => set('validTo', e.target.value)} />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('active', !form.active)}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.active ? 'bg-[#002046]' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-5' : 'translate-x-0'}`} />
            </div>
            <span className="text-sm font-medium text-slate-700">{form.active ? 'Active — users can apply this code' : 'Inactive — code is disabled'}</span>
          </label>
        </form>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-bold text-white bg-[#002046] hover:bg-[#003a80] transition-colors disabled:opacity-50">
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Promo'}
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteModal = ({ promo, onClose, onDeleted }) => {
  const [deleting, setDeleting] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-rose-500 text-2xl">delete</span>
        </div>
        <h2 className="text-lg font-black text-slate-900">Delete {promo.code}?</h2>
        <p className="text-sm text-slate-500 mt-1 mb-6">This promo code will be permanently removed. Users who already used it won't be affected.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors">Cancel</button>
          <button
            onClick={async () => {
              setDeleting(true);
              try {
                await deleteDiscount(promo.id);
                toast.success(`${promo.code} deleted`);
                onDeleted();
              } catch {
                toast.error('Failed to delete promo');
                setDeleting(false);
              }
            }}
            disabled={deleting}
            className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminPromos = () => {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editPromo, setEditPromo] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [deletePromo, setDeletePromo] = useState(null);
  const [toggling, setToggling] = useState(null);
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchDiscounts();
      setPromos(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load promos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (promo) => {
    setToggling(promo.id);
    try {
      await toggleDiscount(promo.id);
      await load();
    } catch {
      toast.error('Failed to toggle promo');
    } finally {
      setToggling(null);
    }
  };

  const filtered = promos.filter((p) =>
    !search || p.code?.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = promos.filter((p) => p.active).length;
  const totalUses = promos.reduce((acc, p) => acc + (p.usedCount || 0), 0);

  const formatValidity = (from, to) => {
    if (!from && !to) return 'No expiry';
    if (from && !to) return `From ${from}`;
    if (!from && to) return `Until ${to}`;
    return `${from} → ${to}`;
  };

  const isExpired = (p) => {
    if (!p.validTo) return false;
    return new Date(p.validTo) < new Date();
  };

  return (
    <AdminLayout title="Promo Codes" activeItemOverride="promos">
      {newOpen && <PromoModal onClose={() => setNewOpen(false)} onSaved={() => { setNewOpen(false); load(); }} />}
      {editPromo && <PromoModal promo={editPromo} onClose={() => setEditPromo(null)} onSaved={() => { setEditPromo(null); load(); }} />}
      {deletePromo && <DeleteModal promo={deletePromo} onClose={() => setDeletePromo(null)} onDeleted={() => { setDeletePromo(null); load(); }} />}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Promo Codes</h1>
            <p className="text-sm text-slate-500 mt-0.5">Create and manage discount codes for travelers</p>
          </div>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-[#002046] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#003a80] transition-colors self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Promo
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Promos', value: promos.length, icon: 'local_offer', color: 'text-[#002046]', bg: 'bg-[#002046]/8' },
            { label: 'Active Codes', value: activeCount, icon: 'check_circle', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Total Uses', value: totalUses, icon: 'redeem', color: 'text-amber-600', bg: 'bg-amber-50' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white ring-1 ring-slate-200 p-5 shadow-sm flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center flex-shrink-0`}>
                <span className={`material-symbols-outlined text-xl ${stat.color}`}>{stat.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search promos..."
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 outline-none focus:border-[#002046] focus:ring-1 focus:ring-[#002046]"
              />
            </div>
            <p className="text-xs text-slate-400 sm:ml-auto">{filtered.length} promo{filtered.length !== 1 ? 's' : ''}</p>
          </div>

          {loading ? (
            <div className="p-12 flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">local_offer</span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">{search ? 'No matches found' : 'No promo codes yet'}</h2>
              <p className="mt-1 text-sm text-slate-500">{search ? 'Try a different search term.' : 'Click "New Promo" to create your first discount code.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Code</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Discount</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Min Order</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Validity</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Uses</th>
                    <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((promo) => {
                    const expired = isExpired(promo);
                    return (
                      <tr key={promo.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-mono font-bold text-slate-900 text-sm">{promo.code}</p>
                          {promo.description && <p className="text-xs text-slate-400 mt-0.5 max-w-[160px] truncate">{promo.description}</p>}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 text-sm">
                            {promo.type === 'PERCENT' ? `${promo.value}%` : `₹${promo.value}`}
                          </span>
                          {promo.maxDiscount && <p className="text-[11px] text-slate-400 mt-0.5">max ₹{promo.maxDiscount}</p>}
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-sm text-slate-600">{promo.minOrderAmount ? `₹${promo.minOrderAmount}` : '—'}</span>
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className={`text-xs ${expired ? 'text-rose-500' : 'text-slate-500'}`}>
                            {formatValidity(promo.validFrom, promo.validTo)}
                            {expired && ' · Expired'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-700 font-medium">{promo.usedCount ?? 0}</span>
                          {promo.usageLimit && <span className="text-xs text-slate-400"> / {promo.usageLimit}</span>}
                        </td>
                        <td className="px-5 py-4">
                          <button
                            onClick={() => handleToggle(promo)}
                            disabled={toggling === promo.id}
                            className="flex items-center gap-2 cursor-pointer"
                            title={promo.active ? 'Click to deactivate' : 'Click to activate'}
                          >
                            <div className={`relative w-9 h-5 rounded-full transition-colors ${promo.active && !expired ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                              <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${promo.active && !expired ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                            <span className={`text-xs font-semibold ${promo.active && !expired ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {expired ? 'Expired' : promo.active ? 'Active' : 'Off'}
                            </span>
                          </button>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditPromo(promo)}
                              title="Edit"
                              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button
                              onClick={() => setDeletePromo(promo)}
                              title="Delete"
                              className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminPromos;
