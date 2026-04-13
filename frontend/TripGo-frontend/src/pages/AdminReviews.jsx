import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import PaginationControls from '../shared/components/ui/PaginationControls';
import { getBuses, getOperators } from '../api/adminService';
import { getAdminReviews, hideAdminReview, unhideAdminReview } from '../api/reviewService';

const normalizePage = (data) => ({
  content: Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [],
  page: Number(data?.page ?? 0),
  size: Number(data?.size ?? 10),
  totalElements: Number(data?.totalElements ?? (Array.isArray(data?.content) ? data.content.length : Array.isArray(data) ? data.length : 0)),
  totalPages: Number(data?.totalPages ?? 1),
});

const renderStars = (rating) => '★'.repeat(Number(rating || 0)) + '☆'.repeat(Math.max(5 - Number(rating || 0), 0));

const formatDateTime = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const ViewToggle = ({ viewMode, onChange }) => (
  <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
    {['grid', 'list'].map((mode) => (
      <button
        key={mode}
        type="button"
        onClick={() => onChange(mode)}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${viewMode === mode ? 'bg-white text-slate-900 shadow-sm dark:bg-black/40 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}
      >
        {mode === 'grid' ? 'Grid' : 'List'}
      </button>
    ))}
  </div>
);

const ReviewModerationModal = ({ review, reason, setReason, onClose, onConfirm, submitting }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,#080808_0%,#121212_100%)] dark:ring-white/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Review moderation</p>
          <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Hide review</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Add the moderation reason for "{review?.title || 'Passenger review'}".
          </p>
        </div>
        <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{review?.userName || 'Traveler'} · {review?.busName || 'Bus'}</p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{review?.from || '--'} to {review?.to || '--'}</p>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{review?.comment || 'No comment added.'}</p>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-semibold text-slate-900 dark:text-white">Reason</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          placeholder="Explain why this review should be hidden."
          className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 focus:ring-2 focus:ring-primary dark:bg-white/[0.04] dark:text-white dark:ring-white/10"
        />
      </div>

      <div className="mt-6 flex gap-3">
        <button onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/15">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={submitting || !reason.trim()}
          className="flex-1 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-60"
        >
          {submitting ? 'Updating...' : 'Hide review'}
        </button>
      </div>
    </div>
  </div>
);

const AdminReviews = () => {
  const [operators, setOperators] = useState([]);
  const [buses, setBuses] = useState([]);
  const [filters, setFilters] = useState({
    operatorId: '',
    busId: '',
    rating: '',
    from: '',
    to: '',
    hidden: '',
  });
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [reviewsPage, setReviewsPage] = useState({ content: [], page: 0, size: 9, totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [moderatingId, setModeratingId] = useState('');
  const [reviewToHide, setReviewToHide] = useState(null);
  const [hideReason, setHideReason] = useState('Spam');

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [operatorList, busList] = await Promise.all([getOperators(), getBuses()]);
        setOperators(Array.isArray(operatorList) ? operatorList : []);
        setBuses(Array.isArray(busList) ? busList : []);
      } catch (error) {
        toast.error(error?.message || 'Failed to load review filters');
      }
    };

    loadLookups();
  }, []);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        const response = await getAdminReviews({ ...filters, page, size: 9 });
        setReviewsPage(normalizePage(response));
      } catch (error) {
        toast.error(error?.message || 'Failed to load admin reviews');
        setReviewsPage({ content: [], page: 0, size: 9, totalElements: 0, totalPages: 1 });
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [filters, page]);

  const filteredBuses = useMemo(() => {
    if (!filters.operatorId) return buses;
    return buses.filter((bus) => String(bus.operatorId || bus.operator?.id || '') === String(filters.operatorId));
  }, [buses, filters.operatorId]);

  return (
    <AdminLayout activeItemOverride="reviews" title="Reviews & Feedback">
      <div className="space-y-6">
        <div className="rounded-[30px] bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Admin Moderation</p>
              <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">Reviews & feedback</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review platform feedback across all operators, filter it, and hide or unhide problematic content.</p>
            </div>
            <ViewToggle viewMode={viewMode} onChange={setViewMode} />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <select value={filters.operatorId} onChange={(e) => { setFilters((prev) => ({ ...prev, operatorId: e.target.value, busId: '' })); setPage(0); }} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700">
              <option value="">All operators</option>
              {operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.name || operator.operatorName || operator.email}</option>)}
            </select>
            <select value={filters.busId} onChange={(e) => { setFilters((prev) => ({ ...prev, busId: e.target.value })); setPage(0); }} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700">
              <option value="">All buses</option>
              {filteredBuses.map((bus) => <option key={bus.id} value={bus.id}>{bus.name || bus.busName}</option>)}
            </select>
            <select value={filters.rating} onChange={(e) => { setFilters((prev) => ({ ...prev, rating: e.target.value })); setPage(0); }} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700">
              <option value="">All ratings</option>
              {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} stars</option>)}
            </select>
            <input value={filters.from} onChange={(e) => { setFilters((prev) => ({ ...prev, from: e.target.value })); setPage(0); }} placeholder="From city" className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700" />
            <input value={filters.to} onChange={(e) => { setFilters((prev) => ({ ...prev, to: e.target.value })); setPage(0); }} placeholder="To city" className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700" />
            <select value={filters.hidden} onChange={(e) => { setFilters((prev) => ({ ...prev, hidden: e.target.value })); setPage(0); }} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700">
              <option value="">All visibility</option>
              <option value="false">Visible</option>
              <option value="true">Hidden</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[30px] bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:text-slate-400 dark:ring-slate-800">Loading reviews...</div>
        ) : reviewsPage.content.length === 0 ? (
          <div className="rounded-[30px] bg-white p-10 text-center shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">reviews</span>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No reviews match the selected filters.</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid gap-4 xl:grid-cols-3' : 'space-y-4'}>
            {reviewsPage.content.map((review) => (
              <div key={review.id} className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
                <div className={`flex gap-4 ${viewMode === 'grid' ? 'h-full flex-col' : 'flex-col lg:flex-row lg:items-start lg:justify-between'}`}>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900 dark:text-white">{review.title || 'Passenger review'}</h2>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${review.hidden ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
                        {review.hidden ? 'Hidden' : (review.moderationStatus || 'APPROVED')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{review.userName || 'Traveler'} · {review.busName || 'Bus'} · {review.from} to {review.to}</p>
                    <p className="text-sm font-semibold text-amber-500">{renderStars(review.rating)} <span className="ml-1 text-slate-700 dark:text-slate-200">{review.rating}/5</span></p>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{review.comment || 'No comment added.'}</p>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">Booking {review.bookingCode || '--'}</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">{formatDateTime(review.createdAt)}</span>
                      {review.flaggedReason ? <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">Reason: {review.flaggedReason}</span> : null}
                    </div>
                  </div>

                  <div className={`rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 ${viewMode === 'grid' ? 'mt-auto' : 'min-w-[220px]'}`}>
                    {review.hidden ? (
                      <button
                        onClick={async () => {
                          try {
                            setModeratingId(review.id);
                            await unhideAdminReview(review.id);
                            toast.success('Review is visible again.');
                            setReviewsPage((prev) => ({
                              ...prev,
                              content: prev.content.map((item) => item.id === review.id ? { ...item, hidden: false, flaggedReason: null, moderationStatus: 'APPROVED' } : item),
                            }));
                          } catch (error) {
                            toast.error(error?.message || 'Failed to unhide review');
                          } finally {
                            setModeratingId('');
                          }
                        }}
                        disabled={moderatingId === review.id}
                        className="w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60"
                      >
                        {moderatingId === review.id ? 'Updating...' : 'Unhide Review'}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setReviewToHide(review);
                          setHideReason(review.flaggedReason || 'Spam');
                        }}
                        disabled={moderatingId === review.id}
                        className="w-full rounded-2xl bg-rose-500 px-4 py-3 text-sm font-bold text-white hover:bg-rose-600 disabled:opacity-60"
                      >
                        {moderatingId === review.id ? 'Updating...' : 'Hide Review'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <PaginationControls
          page={reviewsPage.page}
          pageSize={reviewsPage.size}
          totalItems={reviewsPage.totalElements}
          onPageChange={setPage}
          itemLabel="reviews"
        />
      </div>

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
              setReviewsPage((prev) => ({
                ...prev,
                content: prev.content.map((item) => item.id === reviewToHide.id ? { ...item, hidden: true, flaggedReason: hideReason.trim(), moderationStatus: 'HIDDEN' } : item),
              }));
              setReviewToHide(null);
              setHideReason('Spam');
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
