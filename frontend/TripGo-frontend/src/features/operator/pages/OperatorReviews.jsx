import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getBuses } from '../../../api/busService';
import { getAllSchedules } from '../../../api/routeService';
import { getOperatorReviews, getOperatorBusReviews, getOperatorScheduleReviews } from '../../../api/reviewService';

const PAGE_SIZE = 10;

const normalizePage = (data) => ({
  content: Array.isArray(data?.content) ? data.content : Array.isArray(data) ? data : [],
  page: Number(data?.page ?? 0),
  size: Number(data?.size ?? 10),
  totalElements: Number(data?.totalElements ?? (Array.isArray(data?.content) ? data.content.length : Array.isArray(data) ? data.length : 0)),
  totalPages: Number(data?.totalPages ?? 1),
});

const formatDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' };

const getRatingBadge = (rating) => {
  if (rating >= 4) return { badge: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' };
  if (rating >= 3) return { badge: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' };
  return { badge: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' };
};

const OperatorReviews = () => {
  const [buses, setBuses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [reviewsPage, setReviewsPage] = useState({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [busFilter, setBusFilter] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState('');
  const [ratingTab, setRatingTab] = useState('all');
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? 'grid' : 'list');
  const [page, setPage] = useState(0);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [busList, scheduleList] = await Promise.all([getBuses(), getAllSchedules()]);
        setBuses(Array.isArray(busList) ? busList : []);
        setSchedules(Array.isArray(scheduleList) ? scheduleList : []);
      } catch (error) {
        toast.error(error?.message || 'Failed to load filters');
      }
    };
    loadLookups();
  }, []);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        let response;
        if (scheduleFilter) {
          response = await getOperatorScheduleReviews(scheduleFilter, { page, size: 10 });
        } else if (busFilter) {
          response = await getOperatorBusReviews(busFilter, { page, size: 10 });
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
  }, [busFilter, scheduleFilter, page]);

  useEffect(() => { setPage(0); }, [ratingTab]);

  const scheduleOptions = useMemo(() => {
    if (!busFilter) return schedules;
    return schedules.filter((s) => String(s?.bus?.id || s?.busId) === String(busFilter));
  }, [schedules, busFilter]);

  const allContent = reviewsPage.content;
  const positiveCount = allContent.filter((r) => Number(r.rating) >= 4).length;
  const criticalCount = allContent.filter((r) => Number(r.rating) <= 3 && Number(r.rating) > 0).length;

  const avgRating = allContent.length > 0
    ? (allContent.reduce((sum, r) => sum + Number(r.rating || 0), 0) / allContent.length).toFixed(1)
    : null;

  const tabbedReviews = useMemo(() => {
    if (ratingTab === 'positive') return allContent.filter((r) => Number(r.rating) >= 4);
    if (ratingTab === 'critical') return allContent.filter((r) => Number(r.rating) <= 3 && Number(r.rating) > 0);
    return allContent;
  }, [allContent, ratingTab]);

  const totalPages = Math.max(1, Math.ceil(tabbedReviews.length / PAGE_SIZE));
  const paginatedReviews = useMemo(
    () => tabbedReviews.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [tabbedReviews, page]
  );

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const PaginationBar = () => (
    <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-4">
      <p className="text-sm text-slate-400">
        Showing {(page * PAGE_SIZE) + 1}–{Math.min(tabbedReviews.length, (page + 1) * PAGE_SIZE)} of {tabbedReviews.length}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const pageNum = totalPages <= 5 ? i : Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
          return (
            <button key={pageNum} onClick={() => setPage(pageNum)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${page === pageNum ? 'bg-[#002046] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {pageNum + 1}
            </button>
          );
        })}
        <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );

  return (
    <OperatorLayout activeItem="reviews" title="Reviews">
      <div className="space-y-5">

        <div>
          <h1 className="text-2xl font-black text-slate-900">Passenger Reviews</h1>
          <p className="text-sm text-slate-500 mt-0.5">Track passenger ratings and reviews for your routes</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-2">Total Reviews</p>
            {loading ? (
              <div className="animate-pulse space-y-2"><div className="h-9 w-16 bg-white/20 rounded" /><div className="h-3 w-28 bg-white/10 rounded" /></div>
            ) : (
              <>
                <p className="text-3xl font-black">{reviewsPage.totalElements}</p>
                <p className="text-xs opacity-50 mt-1.5">from passengers</p>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-2">Avg Rating</p>
            {loading ? (
              <div className="animate-pulse space-y-2"><div className="h-9 w-16 bg-white/20 rounded" /><div className="h-3 w-28 bg-white/10 rounded" /></div>
            ) : (
              <>
                <p className="text-3xl font-black">{avgRating ?? '--'} <span className="text-xl text-amber-300">★</span></p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs opacity-60">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                    {positiveCount} positive
                  </span>
                  <span className="flex items-center gap-1 text-xs opacity-60">
                    <span className="inline-block w-2 h-2 rounded-full bg-rose-400" />
                    {criticalCount} critical
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-3">Filter by Bus</p>
            <select
              value={busFilter}
              onChange={(e) => { setBusFilter(e.target.value); setScheduleFilter(''); setPage(0); }}
              className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white outline-none focus:bg-white/20 transition-colors appearance-none"
            >
              <option value="" className="text-slate-900 bg-white">All buses</option>
              {buses.map((bus) => (
                <option key={bus.id} value={bus.id} className="text-slate-900 bg-white">{bus.name || bus.busName}</option>
              ))}
            </select>
            {busFilter && scheduleOptions.length > 0 && (
              <select
                value={scheduleFilter}
                onChange={(e) => { setScheduleFilter(e.target.value); setPage(0); }}
                className="w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-sm text-white outline-none focus:bg-white/20 transition-colors appearance-none mt-2"
              >
                <option value="" className="text-slate-900 bg-white">All schedules</option>
                {scheduleOptions.map((s) => (
                  <option key={s.id} value={s.id} className="text-slate-900 bg-white">{formatDate(s?.departureTime)}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Tab bar + view toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
            {[
              { id: 'all', label: 'All', count: allContent.length },
              { id: 'positive', label: 'Positive', count: positiveCount },
              { id: 'critical', label: 'Critical', count: criticalCount },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRatingTab(tab.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${ratingTab === tab.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${ratingTab === tab.id ? 'opacity-60' : 'opacity-40'}`}>({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
            {[
              { id: 'list', icon: 'view_list', label: 'List' },
              { id: 'grid', icon: 'grid_view', label: 'Grid' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${viewMode === mode.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <span className="material-symbols-outlined text-base">{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          {loading ? (
            <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
              Loading reviews...
            </div>

          ) : tabbedReviews.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">star_border</span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">No reviews found</h2>
              <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                {ratingTab !== 'all' ? 'No reviews match this filter.' : 'Reviews appear once passengers rate their completed trips.'}
              </p>
            </div>

          ) : viewMode === 'grid' ? (
            <>
              <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedReviews.map((review, index) => {
                  const rating = Number(review.rating || 0);
                  const { badge, dot } = getRatingBadge(rating);
                  const ratingLabel = RATING_LABELS[rating] || '--';

                  return (
                    <div key={review.id || index} className="rounded-xl ring-1 ring-slate-200 p-4 bg-white hover:shadow-md transition-all">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm truncate">{review.userName || 'Traveler'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{formatDate(review.createdAt)}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                          {ratingLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-0.5 mb-2">
                        {[1,2,3,4,5].map((s) => (
                          <span key={s} className={`text-base leading-none ${s <= rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                        ))}
                        <span className="ml-1.5 text-xs font-semibold text-slate-500">{rating}/5</span>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                        {review.comment || 'No comment added.'}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {review.bookingCode && (
                          <span className="text-[10px] font-semibold bg-[#002046]/[0.08] text-[#002046] px-2 py-0.5 rounded-full">
                            {review.bookingCode}
                          </span>
                        )}
                        {review.busName && (
                          <span className="text-[10px] font-semibold bg-[#002046]/[0.08] text-[#002046] px-2 py-0.5 rounded-full">
                            {review.busName}
                          </span>
                        )}
                        {review.from && review.to && (
                          <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {review.from} → {review.to}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationBar />
            </>

          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Passenger</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Booking</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Route</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Bus</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rating</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Comment</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedReviews.map((review, index) => {
                      const rating = Number(review.rating || 0);
                      const { badge, dot } = getRatingBadge(rating);
                      const ratingLabel = RATING_LABELS[rating] || '--';

                      return (
                        <tr key={review.id || index} className="group hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4 min-w-[140px]">
                            <p className="text-sm font-bold text-slate-900">{review.userName || 'Traveler'}</p>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="text-xs font-mono text-slate-500">{review.bookingCode || '--'}</span>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            {review.from && review.to ? (
                              <span className="text-sm text-slate-600">{review.from} → {review.to}</span>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <span className="text-sm text-slate-500">{review.busName || '—'}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-0.5 mb-1">
                              {[1,2,3,4,5].map((s) => (
                                <span key={s} className={`text-base leading-none ${s <= rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
                              ))}
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                              {ratingLabel}
                            </span>
                          </td>
                          <td className="px-5 py-4 hidden xl:table-cell max-w-[220px]">
                            <p className="text-sm text-slate-600 truncate">{review.comment || '—'}</p>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="text-sm text-slate-500">{formatDate(review.createdAt)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <PaginationBar />
            </>
          )}
        </div>

      </div>
    </OperatorLayout>
  );
};

export default OperatorReviews;
