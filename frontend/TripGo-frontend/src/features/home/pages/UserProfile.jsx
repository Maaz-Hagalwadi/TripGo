import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { getMyCompletedTrips, submitTripRating } from '../../../api/bookingService';

const PAGE_SIZE = 10;

const RATING_LABELS = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

const formatTripDate = (value) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getTripTimestamp = (trip) => {
  const value = trip?.travelDate || trip?.departureTime || trip?.completedAt || trip?.createdAt;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const toDisplayBookingId = (trip) => {
  const raw = String(trip?.bookingCode || trip?.publicBookingId || trip?.bookingNumber || trip?.pnr || trip?.bookingId || trip?.id || '').trim();
  if (!raw) return '--';
  if (raw.startsWith('TG-') || raw.startsWith('TRIPGO-')) return raw;
  const compact = raw.replace(/-/g, '').slice(0, 8).toUpperCase();
  return compact ? `TG-${compact}` : raw;
};

const RatingModal = ({ trip, getTripRoute, getTripBusName, onClose, onSubmit, submitting }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600/80">Rate your trip</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{getTripRoute(trip)}</h2>
            <p className="mt-1 text-sm text-slate-400">{getTripBusName(trip)}</p>
          </div>
          <button onClick={onClose} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-900">How was your trip?</p>
          <div className="mt-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((v) => (
              <button key={v} type="button" onClick={() => setRating(v)} className="transition-transform hover:scale-110 active:scale-95 p-1">
                <span
                  className={`material-symbols-outlined text-4xl transition-colors ${rating >= v ? 'text-amber-400' : 'text-slate-300'}`}
                  style={{ fontVariationSettings: rating >= v ? "'FILL' 1" : "'FILL' 0" }}
                >star</span>
              </button>
            ))}
            {rating > 0 && <span className="ml-2 text-sm font-semibold text-slate-600">{RATING_LABELS[rating]}</span>}
          </div>
        </div>

        <div className="mt-5">
          <label className="mb-2 block text-sm font-semibold text-slate-900">Comment (optional)</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Tell us about seat comfort, punctuality, or overall experience."
            className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 focus:ring-2 focus:ring-amber-400"
          />
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
            Cancel
          </button>
          <button
            onClick={() => onSubmit({ rating, comment })}
            disabled={!rating || submitting}
            className="flex-1 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-3 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [completedTrips, setCompletedTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [submittingRatingFor, setSubmittingRatingFor] = useState('');
  const [viewMode, setViewMode] = useState(() => window.innerWidth < 768 ? 'grid' : 'list');
  const [ratingTab, setRatingTab] = useState('all');
  const [selectedTripId, setSelectedTripId] = useState('');
  const [ratingModalTrip, setRatingModalTrip] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') { navigate(ROUTES.HOME); }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'USER') return;
    const loadCompletedTrips = async () => {
      setLoadingTrips(true);
      try {
        const data = await getMyCompletedTrips();
        const list = Array.isArray(data) ? data : Array.isArray(data?.trips) ? data.trips : [];
        const sortedTrips = [...list].sort((a, b) => {
          const aPending = canRateTrip(a) ? 1 : 0;
          const bPending = canRateTrip(b) ? 1 : 0;
          if (aPending !== bPending) return bPending - aPending;
          return getTripTimestamp(b) - getTripTimestamp(a);
        });
        setCompletedTrips(sortedTrips);
      } catch (e) {
        toast.error(e.message || 'Failed to load completed trips');
      } finally {
        setLoadingTrips(false);
      }
    };
    loadCompletedTrips();
  }, [user]);

  useEffect(() => { setPage(0); setSelectedTripId(''); }, [ratingTab]);

  const getTripScheduleId = (trip) => trip?.routeScheduleId || trip?.scheduleId || trip?.id || trip?.tripId || '';
  const getTripRoute = (trip) => {
    const from = trip?.fromCity || trip?.from || trip?.source || trip?.origin;
    const to = trip?.toCity || trip?.to || trip?.destination;
    if (from && to) return `${from} → ${to}`;
    return trip?.routeName || 'Route';
  };
  const getTripBusName = (trip) => trip?.busName || trip?.operatorBusName || 'Bus';
  const getTripDate = (trip) => trip?.travelDate || trip?.departureTime || trip?.completedAt || '';
  const canRateTrip = (trip) => !trip?.alreadyRated && !trip?.ratingSubmitted && getTripScheduleId(trip);

  const handleSubmitRating = async (trip) => {
    const scheduleId = getTripScheduleId(trip);
    if (!scheduleId) return toast.error('Schedule ID missing for this trip');
    const draft = ratingDrafts[scheduleId] || {};
    const rating = Number(draft.rating || 0);
    if (!rating || rating < 1 || rating > 5) return toast.error('Please select a rating between 1 and 5');
    setSubmittingRatingFor(scheduleId);
    try {
      await submitTripRating(scheduleId, { rating, comment: String(draft.comment || '').trim() });
      toast.success('Rating submitted successfully');
      setCompletedTrips((prev) =>
        prev.map((item) => (getTripScheduleId(item) === scheduleId ? { ...item, alreadyRated: true, ratingSubmitted: true } : item))
      );
    } catch (e) {
      toast.error(e.message || 'Failed to submit rating');
    } finally {
      setSubmittingRatingFor('');
    }
  };

  const handleModalSubmit = async ({ rating, comment }) => {
    if (!ratingModalTrip) return;
    const scheduleId = getTripScheduleId(ratingModalTrip);
    if (!scheduleId) return toast.error('Schedule ID missing');
    if (!rating || rating < 1) return toast.error('Please select a rating');
    setSubmittingRatingFor(scheduleId);
    try {
      await submitTripRating(scheduleId, { rating, comment: String(comment || '').trim() });
      toast.success('Rating submitted successfully');
      setCompletedTrips((prev) =>
        prev.map((item) => (getTripScheduleId(item) === scheduleId ? { ...item, alreadyRated: true, ratingSubmitted: true } : item))
      );
      setRatingModalTrip(null);
      setSelectedTripId('');
    } catch (e) {
      toast.error(e.message || 'Failed to submit rating');
    } finally {
      setSubmittingRatingFor('');
    }
  };

  const ratedCount = completedTrips.filter((t) => t.alreadyRated || t.ratingSubmitted).length;
  const pendingCount = completedTrips.filter((t) => canRateTrip(t)).length;

  const tripsWithRating = completedTrips.filter((t) => t.rating && Number(t.rating) > 0);
  const avgRating = tripsWithRating.length > 0
    ? (tripsWithRating.reduce((sum, t) => sum + Number(t.rating), 0) / tripsWithRating.length).toFixed(1)
    : null;

  const tabbedTrips = useMemo(() => (
    ratingTab === 'pending'
      ? completedTrips.filter((t) => canRateTrip(t))
      : ratingTab === 'rated'
        ? completedTrips.filter((t) => t.alreadyRated || t.ratingSubmitted)
        : completedTrips
  ), [completedTrips, ratingTab]);

  const totalPages = Math.max(1, Math.ceil(tabbedTrips.length / PAGE_SIZE));
  const paginatedTrips = useMemo(
    () => tabbedTrips.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [tabbedTrips, page]
  );

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  const gridActionTrip = viewMode === 'grid' && selectedTripId
    ? paginatedTrips.find((t) => getTripScheduleId(t) === selectedTripId) ?? null
    : null;

  const PaginationBar = () => (
    <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-4">
      <p className="text-sm text-slate-400">
        Showing {(page * PAGE_SIZE) + 1}–{Math.min(tabbedTrips.length, (page + 1) * PAGE_SIZE)} of {tabbedTrips.length}
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
    <UserLayout activeItem="ratings" title="Ratings & Reviews">
      <div className="space-y-5">

        <div>
          <h1 className="text-2xl font-black text-slate-900">Ratings & Reviews</h1>
          <p className="text-sm text-slate-500 mt-0.5">Rate your completed trips and share your experience</p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Trips */}
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-2">Total Trips</p>
            {loadingTrips ? (
              <div className="animate-pulse space-y-2"><div className="h-9 w-16 bg-white/20 rounded" /><div className="h-3 w-28 bg-white/10 rounded" /></div>
            ) : (
              <>
                <p className="text-3xl font-black">{completedTrips.length}</p>
                <p className="text-xs opacity-50 mt-1.5">{avgRating ? `avg rating ${avgRating} ★` : 'completed trips'}</p>
              </>
            )}
          </div>

          {/* Review Status */}
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-3">Review Status</p>
            {loadingTrips ? (
              <div className="space-y-3 animate-pulse">
                {[1,2].map(i => <div key={i} className="flex justify-between"><div className="h-3 w-20 bg-white/20 rounded"/><div className="h-3 w-6 bg-white/10 rounded"/></div>)}
              </div>
            ) : (
              <>
                <p className="text-3xl font-black">{ratedCount}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs opacity-60">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                    {ratedCount} rated
                  </span>
                  <span className="flex items-center gap-1 text-xs opacity-60">
                    <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                    {pendingCount} pending
                  </span>
                </div>
              </>
            )}
          </div>

          {/* TripGo Premium */}
          <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
            <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
            <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-2">TripGo Premium</p>
            <h3 className="text-lg font-black leading-snug">Priority seats &amp; zero cancellation fees</h3>
            <p className="text-xs opacity-50 mt-1.5 mb-5">Upgrade for exclusive benefits on every trip</p>
            <button className="rounded-xl bg-white/15 hover:bg-white/25 px-4 py-2 text-xs font-bold transition-colors">
              Upgrade now →
            </button>
          </div>
        </div>

        {/* Tab filter + view toggle */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
            {[
              { id: 'all', label: 'All', count: completedTrips.length },
              { id: 'pending', label: 'Pending', count: pendingCount },
              { id: 'rated', label: 'Rated', count: ratedCount },
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
                onClick={() => { setViewMode(mode.id); setSelectedTripId(''); }}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${viewMode === mode.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <span className="material-symbols-outlined text-base">{mode.icon}</span>
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trips table / grid */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          {loadingTrips ? (
            <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
              Loading your trips...
            </div>
          ) : tabbedTrips.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">star_border</span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                {ratingTab === 'pending' ? 'No pending reviews' : ratingTab === 'rated' ? 'No rated trips yet' : 'No completed trips yet'}
              </h2>
              <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
                Ratings appear after your trip is completed by the operator.
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <>
              {/* Action bar — inside card, just above the grid */}
              {gridActionTrip ? (
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                  <span className="material-symbols-outlined text-base text-amber-400 flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="text-sm font-bold text-slate-800 truncate flex-1">{getTripRoute(gridActionTrip)}</span>
                  {canRateTrip(gridActionTrip) ? (
                    <button
                      onClick={() => setRatingModalTrip(gridActionTrip)}
                      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-base">star</span>
                      Give Review
                    </button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 whitespace-nowrap">
                      <span className="material-symbols-outlined text-sm">task_alt</span>
                      Already rated
                    </span>
                  )}
                  <button
                    onClick={() => setSelectedTripId('')}
                    className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-slate-500">close</span>
                  </button>
                </div>
              ) : null}

              <div className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {paginatedTrips.map((trip, index) => {
                  const scheduleId = getTripScheduleId(trip) || `trip-${index}`;
                  const rated = Boolean(trip?.alreadyRated || trip?.ratingSubmitted);
                  const pending = canRateTrip(trip);
                  const currentDraft = ratingDrafts[scheduleId] || {};
                  const travelDate = formatTripDate(getTripDate(trip));
                  const badgeClass = rated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
                  const dotClass = rated ? 'bg-emerald-500' : 'bg-amber-500';
                  const isGridSelected = selectedTripId === scheduleId;

                  return (
                    <div
                      key={scheduleId}
                      onClick={() => setSelectedTripId((prev) => prev === scheduleId ? '' : scheduleId)}
                      className={`rounded-xl ring-1 p-4 hover:shadow-md transition-all cursor-pointer ${isGridSelected ? 'bg-slate-50 ring-[#002046]/40 shadow-sm' : 'bg-white ring-slate-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 text-sm truncate">{getTripRoute(trip)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{getTripBusName(trip)} · {travelDate}</p>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                          {rated ? 'Rated' : 'Pending'}
                        </span>
                      </div>
                      {rated && trip?.rating ? (
                        <div className="flex items-center gap-0.5 mb-2">
                          {[1, 2, 3, 4, 5].map((s) => <span key={s} className={`text-base leading-none ${s <= trip.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>)}
                          <span className="ml-1.5 text-xs font-semibold text-amber-600">{RATING_LABELS[trip.rating]}</span>
                        </div>
                      ) : pending ? (
                        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} type="button" disabled={submittingRatingFor === scheduleId}
                                onClick={() => setRatingDrafts((prev) => ({ ...prev, [scheduleId]: { ...prev[scheduleId], rating: star } }))}
                                className={`text-2xl leading-none transition-transform ${star <= (currentDraft.rating || 0) ? 'text-amber-400' : 'text-slate-200'} ${submittingRatingFor === scheduleId ? 'cursor-not-allowed' : 'hover:scale-110'}`}>★</button>
                            ))}
                          </div>
                          {currentDraft.rating && (
                            <button onClick={() => handleSubmitRating(trip)} disabled={submittingRatingFor === scheduleId}
                              className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-2 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50">
                              {submittingRatingFor === scheduleId ? 'Submitting...' : 'Submit Rating'}
                            </button>
                          )}
                        </div>
                      ) : null}
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
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Trip</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Bus</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Date</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Rating</th>
                      <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginatedTrips.map((trip, index) => {
                      const scheduleId = getTripScheduleId(trip) || `trip-${index}`;
                      const rated = Boolean(trip?.alreadyRated || trip?.ratingSubmitted);
                      const pending = canRateTrip(trip);
                      const currentDraft = ratingDrafts[scheduleId] || {};
                      const travelDate = formatTripDate(getTripDate(trip));
                      const dotClass = rated ? 'bg-emerald-500' : pending ? 'bg-amber-500' : 'bg-slate-400';
                      const badgeClass = rated ? 'bg-emerald-50 text-emerald-700' : pending ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500';
                      const badgeLabel = rated ? 'Rated' : pending ? 'Pending' : 'No review';

                      return (
                        <tr key={scheduleId} className="group hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4 min-w-[160px]">
                            <p className="text-sm font-bold text-slate-900">{getTripRoute(trip)}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{toDisplayBookingId(trip)}</p>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className="text-sm text-slate-500">{getTripBusName(trip)}</span>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="text-sm text-slate-600">{travelDate}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
                              {badgeLabel}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            {rated && trip?.rating ? (
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => <span key={s} className={`text-base leading-none ${s <= trip.rating ? 'text-amber-400' : 'text-slate-200'}`}>★</span>)}
                                <span className="ml-1.5 text-xs font-semibold text-amber-500">{RATING_LABELS[trip.rating]}</span>
                              </div>
                            ) : pending ? (
                              <div className="flex items-center gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button key={star} type="button" disabled={submittingRatingFor === scheduleId}
                                    onClick={() => setRatingDrafts((prev) => ({ ...prev, [scheduleId]: { ...prev[scheduleId], rating: star } }))}
                                    className={`text-xl leading-none transition-transform ${star <= (currentDraft.rating || 0) ? 'text-amber-400' : 'text-slate-200'} ${submittingRatingFor === scheduleId ? 'cursor-not-allowed' : 'hover:scale-110'}`}>★</button>
                                ))}
                                {currentDraft.rating && (
                                  <span className="ml-1 text-[10px] font-semibold text-amber-500">{RATING_LABELS[currentDraft.rating]}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end">
                              {pending && currentDraft.rating ? (
                                <button onClick={() => handleSubmitRating(trip)} disabled={submittingRatingFor === scheduleId}
                                  className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50 transition-opacity whitespace-nowrap">
                                  {submittingRatingFor === scheduleId ? 'Submitting...' : 'Submit'}
                                </button>
                              ) : pending ? (
                                <button onClick={() => setRatingModalTrip(trip)}
                                  className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors whitespace-nowrap">
                                  Give Review
                                </button>
                              ) : rated ? (
                                <span className="text-xs text-emerald-600 font-semibold">✓ Done</span>
                              ) : null}
                            </div>
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

      {ratingModalTrip && (
        <RatingModal
          trip={ratingModalTrip}
          getTripRoute={getTripRoute}
          getTripBusName={getTripBusName}
          submitting={Boolean(submittingRatingFor)}
          onClose={() => setRatingModalTrip(null)}
          onSubmit={handleModalSubmit}
        />
      )}
    </UserLayout>
  );
};

export default UserProfile;
