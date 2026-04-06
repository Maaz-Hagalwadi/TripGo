import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getBuses } from '../../../api/busService';
import { getAllSchedules } from '../../../api/routeService';
import { getOperatorReviews, getOperatorBusReviews, getOperatorScheduleReviews } from '../../../api/reviewService';

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

const OperatorReviews = () => {
  const [buses, setBuses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [reviewsPage, setReviewsPage] = useState({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ busId: '', scheduleId: '' });
  const [page, setPage] = useState(0);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [busList, scheduleList] = await Promise.all([getBuses(), getAllSchedules()]);
        setBuses(Array.isArray(busList) ? busList : []);
        setSchedules(Array.isArray(scheduleList) ? scheduleList : []);
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
        let response;
        if (filters.scheduleId) {
          response = await getOperatorScheduleReviews(filters.scheduleId, { page, size: 10 });
        } else if (filters.busId) {
          response = await getOperatorBusReviews(filters.busId, { page, size: 10 });
        } else {
          response = await getOperatorReviews({ page, size: 10 });
        }
        setReviewsPage(normalizePage(response));
      } catch (error) {
        toast.error(error?.message || 'Failed to load reviews');
        setReviewsPage({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 1 });
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [filters.busId, filters.scheduleId, page]);

  const scheduleOptions = useMemo(() => {
    if (!filters.busId) return schedules;
    return schedules.filter((item) => String(item?.bus?.id || item?.busId) === String(filters.busId));
  }, [schedules, filters.busId]);

  return (
    <OperatorLayout activeItem="reviews" title="Reviews">
      <div className="space-y-6">
        <div className="rounded-[30px] bg-white p-6 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Operator Reviews</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">Passenger feedback</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review submitted trips by bus or by schedule and keep track of service quality.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <select
              value={filters.busId}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, busId: e.target.value, scheduleId: '' }));
                setPage(0);
              }}
              className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
            >
              <option value="">All buses</option>
              {buses.map((bus) => <option key={bus.id} value={bus.id}>{bus.name || bus.busName}</option>)}
            </select>

            <select
              value={filters.scheduleId}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, scheduleId: e.target.value }));
                setPage(0);
              }}
              className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 ring-1 ring-slate-200 outline-none focus:ring-2 focus:ring-primary dark:bg-slate-900 dark:text-white dark:ring-slate-700"
            >
              <option value="">All schedules</option>
              {scheduleOptions.map((schedule) => (
                <option key={schedule.id} value={schedule.id}>
                  {(schedule?.bus?.name || schedule?.busName || 'Bus')} · {formatDateTime(schedule?.departureTime)}
                </option>
              ))}
            </select>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Visible Reviews</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{reviewsPage.totalElements}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Current Page</p>
              <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{reviewsPage.page + 1}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-[30px] bg-white p-6 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:text-slate-400 dark:ring-slate-800">
            Loading reviews...
          </div>
        ) : reviewsPage.content.length === 0 ? (
          <div className="rounded-[30px] bg-white p-10 text-center shadow-sm ring-1 ring-slate-200 dark:bg-op-card dark:ring-slate-800">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">reviews</span>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No reviews found for the selected filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {reviewsPage.content.map((review) => (
              <div key={review.id} className="rounded-[28px] bg-[linear-gradient(140deg,#ffffff,#eef7ff)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(135deg,#0a0a0a,#111111)] dark:ring-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{review.title || 'Passenger review'}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{review.busName || 'Bus'} · {review.from} to {review.to}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{review.bookingCode || '--'}</span>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-amber-500">{renderStars(review.rating)} <span className="ml-1 text-slate-700 dark:text-slate-200">{review.rating}/5</span></p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(review.createdAt)}</p>
                </div>

                <p className="mt-4 min-h-[72px] text-sm leading-6 text-slate-600 dark:text-slate-300">{review.comment || 'No comment added by the traveler.'}</p>

                <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-black/40 dark:ring-white/10">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Submitted By</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{review.userName || 'Traveler'}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Schedule ID: {review.routeScheduleId || '--'}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
            disabled={page <= 0}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((prev) => (prev + 1 < reviewsPage.totalPages ? prev + 1 : prev))}
            disabled={page + 1 >= reviewsPage.totalPages}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-black hover:bg-primary/90 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default OperatorReviews;
