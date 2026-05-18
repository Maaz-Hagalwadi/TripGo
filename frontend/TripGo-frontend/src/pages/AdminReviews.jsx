import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { getBuses, getOperators } from '../api/adminService';
import { getAdminReviews, hideAdminReview, unhideAdminReview } from '../api/reviewService';

const PAGE_SIZE = 10;
const VISIBILITY_FILTERS = ['ALL', 'VISIBLE', 'HIDDEN'];

const normalizePage = (data) => ({
  content: Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [],
  totalElements: Number(data?.totalElements ?? (Array.isArray(data?.content) ? data.content.length : Array.isArray(data) ? data.length : 0)),
});

const renderStars = (rating) => '★'.repeat(Number(rating || 0)) + '☆'.repeat(Math.max(5 - Number(rating || 0), 0));

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const FIELD_CLASS = 'w-full rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-[#002046]/40 transition-all';

const StatusBadge = ({ hidden }) => hidden
  ? <span className="inline-flex rounded-lg px-2 py-1 text-xs font-bold bg-rose-50 text-rose-700 ring-1 ring-rose-200">Hidden</span>
  : <span className="inline-flex rounded-lg px-2 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">Visible</span>;

const ViewToggle = ({ viewMode, onChange }) => (
  <div className="hidden sm:flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
    {[{ id: 'list', icon: 'view_list', label: 'List' }, { id: 'grid', icon: 'grid_view', label: 'Grid' }].map((mode) => (
      <button key={mode.id} type="button" onClick={() => onChange(mode.id)}
        className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${viewMode === mode.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
        <span className="material-symbols-outlined text-base">{mode.icon}</span>
        {mode.label}
      </button>
    ))}
  </div>
);

const InlinePagination = ({ page, total, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-4">
      <p className="text-sm text-slate-400">
        Showing {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const n = totalPages <= 5 ? i : Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
          return (
            <button key={n} onClick={() => onPageChange(n)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${page === n ? 'bg-[#002046] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {n + 1}
            </button>
          );
        })}
        <button onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

const FilterModal = ({ open, operators, buses, advancedFilters, onApply, onClose }) => {
  const [local, setLocal] = useState(advancedFilters);

  useEffect(() => { if (open) setLocal(advancedFilters); }, [open]);

  const filteredBuses = local.operatorId
    ? buses.filter((bus) => String(bus.operatorId || bus.operator?.id || '') === String(local.operatorId))
    : buses;

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-black text-slate-900">Advanced Filters</h3>
            <p className="text-xs text-slate-500 mt-0.5">Narrow reviews by operator, bus, rating, and route.</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
        <div className="space-y-3">
          <select value={local.operatorId} onChange={(e) => setLocal((p) => ({ ...p, operatorId: e.target.value, busId: '' }))} className={FIELD_CLASS}>
            <option value="">All operators</option>
            {operators.map((op) => <option key={op.id} value={op.id}>{op.name || op.operatorName || op.email}</option>)}
          </select>
          <select value={local.busId} onChange={(e) => setLocal((p) => ({ ...p, busId: e.target.value }))} className={FIELD_CLASS}>
            <option value="">All buses</option>
            {filteredBuses.map((bus) => <option key={bus.id} value={bus.id}>{bus.name || bus.busName}</option>)}
          </select>
          <select value={local.rating} onChange={(e) => setLocal((p) => ({ ...p, rating: e.target.value }))} className={FIELD_CLASS}>
            <option value="">All ratings</option>
            {[5, 4, 3, 2, 1].map((v) => <option key={v} value={v}>{v} stars</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input value={local.from} onChange={(e) => setLocal((p) => ({ ...p, from: e.target.value }))} placeholder="From city" className={FIELD_CLASS} />
            <input value={local.to} onChange={(e) => setLocal((p) => ({ ...p, to: e.target.value }))} placeholder="To city" className={FIELD_CLASS} />
          </div>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => setLocal({ operatorId: '', busId: '', rating: '', from: '', to: '' })}
            className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={() => onApply(local)}
            className="flex-1 rounded-xl bg-[#002046] py-2.5 text-sm font-bold text-white hover:bg-[#003a80] transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

const ReviewModerationModal = ({ review, reason, setReason, onClose, onConfirm, submitting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#002046]/60">Review moderation</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Hide review</h2>
          <p className="mt-1 text-sm text-slate-500">Add the moderation reason for "{review?.title || 'Passenger review'}".</p>
        </div>
        <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>
      <div className="rounded-2xl bg-slate-50 ring-1 ring-slate-200 p-4 mb-5">
        <p className="text-sm font-semibold text-slate-900">{review?.userName || 'Traveler'} · {review?.busName || 'Bus'}</p>
        <p className="mt-1 text-sm text-slate-500">{review?.from || '--'} to {review?.to || '--'}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600">{review?.comment || 'No comment added.'}</p>
      </div>
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-slate-900">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={4}
          placeholder="Explain why this review should be hidden."
          className="w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 transition-all resize-none"
        />
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors">
          Cancel
        </button>
        <button onClick={onConfirm} disabled={submitting || !reason.trim()} className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-60 transition-colors">
          {submitting ? 'Updating...' : 'Hide review'}
        </button>
      </div>
    </div>
  </div>
);

const AdminReviews = () => {
  const [operators, setOperators] = useState([]);
  const [buses, setBuses] = useState([]);
  const [visibilityFilter, setVisibilityFilter] = useState('ALL');
  const [advancedFilters, setAdvancedFilters] = useState({ operatorId: '', busId: '', rating: '', from: '', to: '' });
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState('list');
  const [reviews, setReviews] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [moderatingId, setModeratingId] = useState('');
  const [reviewToHide, setReviewToHide] = useState(null);
  const [hideReason, setHideReason] = useState('Spam');

  const hasAdvancedFilters = Object.values(advancedFilters).some(Boolean);
  const selectedReview = reviews.find((r) => String(r.id) === String(selectedId)) ?? null;

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [operatorList, busList] = await Promise.all([getOperators(), getBuses()]);
        setOperators(Array.isArray(operatorList) ? operatorList : []);
        setBuses(Array.isArray(busList) ? busList : []);
      } catch (error) {
        toast.error(error?.message || 'Failed to load filters');
      }
    };
    loadLookups();
  }, []);

  useEffect(() => {
    const hiddenParam = visibilityFilter === 'VISIBLE' ? 'false' : visibilityFilter === 'HIDDEN' ? 'true' : '';
    const loadReviews = async () => {
      try {
        setLoading(true);
        setSelectedId(null);
        const response = await getAdminReviews({ ...advancedFilters, hidden: hiddenParam, page, size: PAGE_SIZE });
        const normalized = normalizePage(response);
        setReviews(normalized.content);
        setTotalElements(normalized.totalElements);
      } catch (error) {
        toast.error(error?.message || 'Failed to load reviews');
        setReviews([]);
        setTotalElements(0);
      } finally {
        setLoading(false);
      }
    };
    loadReviews();
  }, [visibilityFilter, advancedFilters, page]);

  const handleUnhide = async (review) => {
    try {
      setModeratingId(review.id);
      await unhideAdminReview(review.id);
      toast.success('Review is visible again.');
      setReviews((prev) => prev.map((item) => item.id === review.id ? { ...item, hidden: false, flaggedReason: null, moderationStatus: 'APPROVED' } : item));
      setSelectedId(null);
    } catch (error) {
      toast.error(error?.message || 'Failed to unhide review');
    } finally {
      setModeratingId('');
    }
  };

  return (
    <AdminLayout activeItemOverride="reviews" title="Reviews & Feedback">
      <div className="space-y-4">

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-5 text-white shadow-sm relative overflow-hidden">
          <div className="absolute -top-3 -right-3 text-7xl opacity-10 select-none">★</div>
          <p className="text-[10px] font-semibold opacity-60 uppercase tracking-widest mb-1">Admin Moderation</p>
          <h1 className="text-2xl font-black">Reviews & Feedback</h1>
          <p className="text-sm opacity-70 mt-1">Filter and moderate platform feedback across all operators.</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm flex-wrap">
            {VISIBILITY_FILTERS.map((f) => (
              <button key={f} type="button"
                onClick={() => { setVisibilityFilter(f); setPage(0); }}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${visibilityFilter === f ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                {f === 'ALL' ? 'All' : f === 'VISIBLE' ? 'Visible' : 'Hidden'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button type="button" onClick={() => setFilterModalOpen(true)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ring-1 shadow-sm ${hasAdvancedFilters ? 'bg-[#002046] text-white ring-[#002046]' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>
              <span className="material-symbols-outlined text-base">filter_list</span>
              Filters{hasAdvancedFilters ? ' ·' : ''}
            </button>
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          </div>
        </div>

        {/* Action bar */}
        {selectedReview ? (
          <div className="flex items-center gap-3 bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3 shadow-sm flex-wrap">
            <p className="text-sm font-semibold text-slate-900 flex-1 min-w-0 truncate">
              "{selectedReview.title || 'Review'}" selected
            </p>
            {selectedReview.hidden ? (
              <button
                onClick={() => handleUnhide(selectedReview)}
                disabled={!!moderatingId}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60 transition-colors"
              >
                <span className="material-symbols-outlined text-base">visibility</span>
                {moderatingId ? 'Updating...' : 'Unhide Review'}
              </button>
            ) : (
              <button
                onClick={() => { setReviewToHide(selectedReview); setHideReason(selectedReview.flaggedReason || 'Spam'); }}
                disabled={!!moderatingId}
                className="flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-60 transition-colors"
              >
                <span className="material-symbols-outlined text-base">visibility_off</span>
                {moderatingId ? 'Updating...' : 'Hide Review'}
              </button>
            )}
            <button onClick={() => setSelectedId(null)} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        ) : null}

        {/* Main card */}
        {loading ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-10 text-center shadow-sm">
            <div className="inline-flex items-center gap-3 text-sm text-slate-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/20 border-t-[#002046]" />
              Loading reviews...
            </div>
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-slate-200">reviews</span>
            <p className="mt-3 text-sm text-slate-500">No reviews match the selected filters.</p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
            {viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="pl-5 pr-2 py-3.5 w-10" />
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Review</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Route</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Rating</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {reviews.map((review) => {
                      const isSel = String(review.id) === String(selectedId);
                      return (
                        <tr
                          key={review.id}
                          onClick={() => setSelectedId(isSel ? null : String(review.id))}
                          className={`cursor-pointer transition-colors ${isSel ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}
                        >
                          <td className="pl-5 pr-2 py-4">
                            <div
                              className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSel ? 'bg-[#002046] border-[#002046]' : 'bg-white border-slate-300 hover:border-[#002046]/40'}`}
                            >
                              {isSel && <span className="material-symbols-outlined text-white" style={{ fontSize: '12px' }}>check</span>}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-900 truncate max-w-[200px]">{review.title || 'Passenger review'}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{review.userName || 'Traveler'} · {review.busName || 'Bus'}</p>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <p className="text-sm text-slate-700">{review.from || '--'} → {review.to || '--'}</p>
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <p className="text-sm font-semibold text-amber-500">{renderStars(review.rating)}</p>
                            <p className="text-xs text-slate-500">{review.rating}/5</p>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge hidden={review.hidden} />
                          </td>
                          <td className="px-5 py-4 hidden xl:table-cell">
                            <p className="text-sm text-slate-500">{formatDate(review.createdAt)}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {reviews.map((review) => {
                  const isSel = String(review.id) === String(selectedId);
                  return (
                    <div
                      key={review.id}
                      onClick={() => setSelectedId(isSel ? null : String(review.id))}
                      className={`cursor-pointer rounded-xl p-4 ring-1 transition-all ${isSel ? 'ring-[#002046]/40 bg-slate-50 shadow-sm' : 'ring-slate-200 bg-white hover:shadow-sm'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{review.title || 'Passenger review'}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{review.userName || 'Traveler'} · {review.busName || 'Bus'}</p>
                        </div>
                        <StatusBadge hidden={review.hidden} />
                      </div>
                      <p className="text-sm font-semibold text-amber-500 mb-1">
                        {renderStars(review.rating)} <span className="text-slate-600 font-normal text-xs">{review.rating}/5</span>
                      </p>
                      <p className="text-xs text-slate-500 mb-2">{review.from || '--'} → {review.to || '--'}</p>
                      <p className="text-sm text-slate-600 leading-5 line-clamp-2">{review.comment || 'No comment.'}</p>
                      {review.flaggedReason ? (
                        <p className="text-xs text-rose-600 mt-2 truncate">Reason: {review.flaggedReason}</p>
                      ) : null}
                      <p className="text-xs text-slate-400 mt-2">{formatDate(review.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
            )}
            <InlinePagination page={page} total={totalElements} onPageChange={setPage} />
          </div>
        )}
      </div>

      <FilterModal
        open={filterModalOpen}
        operators={operators}
        buses={buses}
        advancedFilters={advancedFilters}
        onApply={(newFilters) => { setAdvancedFilters(newFilters); setPage(0); setFilterModalOpen(false); }}
        onClose={() => setFilterModalOpen(false)}
      />

      {reviewToHide ? (
        <ReviewModerationModal
          review={reviewToHide}
          reason={hideReason}
          setReason={setHideReason}
          submitting={moderatingId === reviewToHide.id}
          onClose={() => {
            if (moderatingId === reviewToHide.id) return;
            setReviewToHide(null);
            setHideReason('Spam');
          }}
          onConfirm={async () => {
            try {
              setModeratingId(reviewToHide.id);
              await hideAdminReview(reviewToHide.id, hideReason.trim());
              toast.success('Review hidden successfully.');
              setReviews((prev) => prev.map((item) => item.id === reviewToHide.id ? { ...item, hidden: true, flaggedReason: hideReason.trim(), moderationStatus: 'HIDDEN' } : item));
              setReviewToHide(null);
              setHideReason('Spam');
              setSelectedId(null);
            } catch (error) {
              toast.error(error?.message || 'Failed to hide review');
            } finally {
              setModeratingId('');
            }
          }}
        />
      ) : null}
    </AdminLayout>
  );
};

export default AdminReviews;
