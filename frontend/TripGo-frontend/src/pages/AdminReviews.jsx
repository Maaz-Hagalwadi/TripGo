import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { getBuses, getOperators } from '../api/adminService';
import { getAdminReviews, hideAdminReview, unhideAdminReview } from '../api/reviewService';
import {
  ActionButton, Avatar, Card, ConfirmDialog, EmptyState, FilterTabs, PageHeader, Pagination,
  SkeletonRows, StatusPill,
} from '../features/admin/components/AdminUI';
import { headerButton } from '../features/admin/components/adminStyles';

const PAGE_SIZE = 10;
const EMPTY_FILTERS = { operatorId: '', busId: '', rating: '', from: '', to: '' };
const HIDE_REASONS = ['Spam', 'Offensive language', 'Fake or misleading', 'Not about the trip', 'Personal information'];
const FIELD = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

const formatDate = (value) => (value
  ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  : '');

const Stars = ({ rating }) => (
  <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={`material-symbols-outlined text-[16px] ${n <= rating ? 'text-amber-400' : 'text-slate-200'}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
    ))}
  </span>
);

const FilterDialog = ({ operators, buses, value, onApply, onClose }) => {
  const [local, setLocal] = useState(value);
  const busOptions = local.operatorId ? buses.filter((b) => String(b.operatorId) === String(local.operatorId)) : buses;
  const set = (key) => (e) => setLocal((p) => ({ ...p, [key]: e.target.value, ...(key === 'operatorId' ? { busId: '' } : {}) }));

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="filter-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="filter-title" className="text-lg font-black text-slate-900">Filter reviews</h2>
            <p className="text-sm text-slate-500">By operator, bus, rating or route</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center"><span className="material-symbols-outlined text-slate-500">close</span></button>
        </div>
        <div className="space-y-3">
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Operator</span>
            <select value={local.operatorId} onChange={set('operatorId')} className={FIELD}>
              <option value="">All operators</option>
              {operators.map((op) => <option key={op.id} value={op.id}>{op.name}</option>)}
            </select>
          </label>
          <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Bus</span>
            <select value={local.busId} onChange={set('busId')} className={FIELD}>
              <option value="">{local.operatorId && !busOptions.length ? 'This operator has no buses' : 'All buses'}</option>
              {busOptions.map((bus) => <option key={bus.id} value={bus.id}>{bus.name}{bus.vehicleNumber ? ` · ${bus.vehicleNumber}` : ''}</option>)}
            </select>
          </label>
          <div>
            <span className="mb-1.5 block text-xs font-bold text-slate-600">Rating</span>
            <div className="flex flex-wrap gap-2">
              {['', '5', '4', '3', '2', '1'].map((r) => (
                <button key={r || 'any'} type="button" onClick={() => setLocal((p) => ({ ...p, rating: r }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${local.rating === r ? 'bg-primary border-primary text-white' : 'border-slate-200 text-slate-600 hover:border-[#FF8A65]'}`}>
                  {r ? `${r} ★` : 'Any'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">From city</span>
              <input value={local.from} onChange={set('from')} placeholder="e.g. Delhi" className={FIELD} />
            </label>
            <label className="block"><span className="mb-1.5 block text-xs font-bold text-slate-600">To city</span>
              <input value={local.to} onChange={set('to')} placeholder="e.g. Jaipur" className={FIELD} />
            </label>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setLocal(EMPTY_FILTERS)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Clear</button>
          <button onClick={() => onApply({ ...local, from: local.from.trim(), to: local.to.trim() })} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C]">Apply filters</button>
        </div>
      </div>
    </div>
  );
};

const AdminReviews = () => {
  const [operators, setOperators] = useState([]);
  const [buses, setBuses] = useState([]);
  const [visibility, setVisibility] = useState('ALL');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toHide, setToHide] = useState(null);
  const [reason, setReason] = useState(HIDE_REASONS[0]);
  const [busyId, setBusyId] = useState('');

  useEffect(() => {
    Promise.all([getOperators(), getBuses()])
      .then(([ops, bs]) => { setOperators(Array.isArray(ops) ? ops : []); setBuses(Array.isArray(bs) ? bs : []); })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hidden = visibility === 'VISIBLE' ? 'false' : visibility === 'HIDDEN' ? 'true' : '';
      const res = await getAdminReviews({ ...filters, hidden, page, size: PAGE_SIZE });
      const content = Array.isArray(res?.content) ? res.content : Array.isArray(res) ? res : [];
      setReviews(content);
      setTotal(Number(res?.totalElements ?? content.length));
    } catch (e) {
      toast.error(e.message || 'Couldn’t load reviews');
      setReviews([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [visibility, filters, page]);

  useEffect(() => { load(); }, [load]);

  const unhide = async (review) => {
    setBusyId(review.id);
    try {
      await unhideAdminReview(review.id);
      setReviews((prev) => prev.map((r) => (r.id === review.id ? { ...r, hidden: false, flaggedReason: null } : r)));
      toast.success('Review is visible again');
    } catch (e) {
      toast.error(e.message || 'Couldn’t unhide the review');
    } finally {
      setBusyId('');
    }
  };

  const hide = async () => {
    setBusyId(toHide.id);
    try {
      await hideAdminReview(toHide.id, reason.trim());
      setReviews((prev) => prev.map((r) => (r.id === toHide.id ? { ...r, hidden: true, flaggedReason: reason.trim() } : r)));
      toast.success('Review hidden from travellers');
      setToHide(null);
    } catch (e) {
      toast.error(e.message || 'Couldn’t hide the review');
    } finally {
      setBusyId('');
    }
  };

  const chips = [
    filters.operatorId && ['operatorId', operators.find((o) => String(o.id) === String(filters.operatorId))?.name || 'Operator'],
    filters.busId && ['busId', buses.find((b) => String(b.id) === String(filters.busId))?.name || 'Bus'],
    filters.rating && ['rating', `${filters.rating} ★`],
    filters.from && ['from', `From ${filters.from}`],
    filters.to && ['to', `To ${filters.to}`],
  ].filter(Boolean);

  return (
    <AdminLayout activeItemOverride="reviews" title="Reviews">
      <div className="space-y-5">
        <PageHeader
          title="Reviews"
          subtitle="Moderate what travellers see on bus listings"
          actions={<button onClick={load} disabled={loading} className={headerButton}><span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>Refresh</button>}
        />

        <div className="flex flex-wrap items-center gap-3">
          <FilterTabs
            options={[{ value: 'ALL', label: 'All' }, { value: 'VISIBLE', label: 'Visible' }, { value: 'HIDDEN', label: 'Hidden' }]}
            value={visibility}
            onChange={(v) => { setVisibility(v); setPage(0); }}
            label="Visibility"
          />
          <button onClick={() => setFilterOpen(true)} className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition-colors ${chips.length ? 'bg-primary border-primary text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-[#FF8A65]'}`}>
            <span className="material-symbols-outlined text-[18px]">tune</span>
            Filters{chips.length ? ` (${chips.length})` : ''}
          </button>
          {!loading && <span className="text-sm text-slate-500 sm:ml-auto">{total.toLocaleString('en-IN')} review{total !== 1 ? 's' : ''}</span>}
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {chips.map(([key, label]) => (
              <button key={key} onClick={() => { setFilters((p) => ({ ...p, [key]: '', ...(key === 'operatorId' ? { busId: '' } : {}) })); setPage(0); }}
                className="inline-flex items-center gap-1 rounded-full bg-[#FDBA74]/25 px-3 py-1 text-xs font-bold text-orange-800 hover:bg-[#FDBA74]/40">
                {label}<span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            ))}
            <button onClick={() => { setFilters(EMPTY_FILTERS); setPage(0); }} className="text-xs font-bold text-primary hover:text-[#FF8A65]">Clear all</button>
          </div>
        )}

        <Card>
          {loading ? <SkeletonRows rows={4} /> : reviews.length === 0 ? (
            <EmptyState icon="reviews" title="No reviews found" subtitle={chips.length || visibility !== 'ALL' ? 'Try removing a filter.' : 'Reviews appear here after travellers rate their trips.'} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {reviews.map((r) => (
                <li key={r.id} className={`flex flex-col sm:flex-row gap-4 px-5 py-5 ${r.hidden ? 'bg-slate-50/70' : ''}`}>
                  <Avatar name={r.userName || 'Traveller'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Stars rating={Number(r.rating || 0)} />
                      {r.title && <p className="font-bold text-slate-900">{r.title}</p>}
                      {r.hidden ? <StatusPill tone="red">Hidden</StatusPill> : <StatusPill tone="green">Visible</StatusPill>}
                    </div>
                    <p className={`mt-1.5 text-sm leading-relaxed ${r.comment ? 'text-slate-700' : 'italic text-slate-400'}`}>{r.comment || 'No written comment'}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{r.userName || 'Traveller'}</span>
                      {[r.busName, r.from && r.to ? `${r.from} → ${r.to}` : null, formatDate(r.createdAt)].filter(Boolean).map((part) => ` · ${part}`)}
                    </p>
                    {r.hidden && r.flaggedReason && (
                      <p className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-700">
                        <span className="material-symbols-outlined text-[14px]">flag</span>Hidden for: {r.flaggedReason}
                      </p>
                    )}
                  </div>
                  <div className="flex-shrink-0 sm:pt-0.5">
                    {r.hidden ? (
                      <ActionButton icon="visibility" tone="approve" disabled={busyId === r.id} onClick={() => unhide(r)}>{busyId === r.id ? 'Updating…' : 'Unhide'}</ActionButton>
                    ) : (
                      <ActionButton icon="visibility_off" tone="danger" disabled={busyId === r.id} onClick={() => { setToHide(r); setReason(HIDE_REASONS[0]); }}>Hide</ActionButton>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={setPage} />
        </Card>
      </div>

      {filterOpen && (
        <FilterDialog operators={operators} buses={buses} value={filters}
          onApply={(next) => { setFilters(next); setPage(0); setFilterOpen(false); }} onClose={() => setFilterOpen(false)} />
      )}

      {toHide && (
        <ConfirmDialog
          title="Hide this review?"
          message="Travellers won’t see it on the bus listing. You can unhide it any time."
          confirmLabel="Hide review"
          tone="danger"
          busy={busyId === toHide.id}
          disabled={!reason.trim()}
          onConfirm={hide}
          onCancel={() => setToHide(null)}
        >
          <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
            <Stars rating={Number(toHide.rating || 0)} />
            <p className="mt-1 line-clamp-3">{toHide.comment || toHide.title || 'No written comment'}</p>
          </div>
          <p className="mt-4 mb-2 text-xs font-bold text-slate-600">Reason</p>
          <div className="flex flex-wrap gap-2">
            {HIDE_REASONS.map((r) => (
              <button key={r} type="button" onClick={() => setReason(r)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${reason === r ? 'bg-primary border-primary text-white' : 'border-slate-200 text-slate-600 hover:border-[#FF8A65]'}`}>
                {r}
              </button>
            ))}
          </div>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or write a reason" aria-label="Reason for hiding" className={`${FIELD} mt-3`} />
        </ConfirmDialog>
      )}
    </AdminLayout>
  );
};

export default AdminReviews;
