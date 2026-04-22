import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { getMyCompletedTrips, submitTripRating } from '../../../api/bookingService';

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
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
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

const StarRatingInput = ({ value, onChange, disabled = false }) => {
  const rating = Number(value || 0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= rating;
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            className={`text-3xl leading-none transition-transform ${active ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'} ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:scale-110'}`}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            ★
          </button>
        );
      })}
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
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') {
      navigate(ROUTES.HOME);
      return;
    }
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
    if (!rating || rating < 1 || rating > 5) {
      return toast.error('Please select a rating between 1 and 5');
    }

    setSubmittingRatingFor(scheduleId);
    try {
      await submitTripRating(scheduleId, {
        rating,
        comment: String(draft.comment || '').trim(),
      });
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

  return (
    <UserLayout activeItem="ratings" title="Ratings & Reviews">
      <div className="space-y-4">

        {/* Header card */}
        <div className="rounded-2xl bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold">My Trip Ratings</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{completedTrips.length} completed trip{completedTrips.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="hidden sm:inline-flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">
            {['grid', 'list'].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition flex items-center gap-1 ${viewMode === mode ? 'bg-white text-slate-900 shadow-sm dark:bg-black/40 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}
              >
                <span className="material-symbols-outlined text-[14px]">{mode === 'grid' ? 'grid_view' : 'view_list'}</span>
                {mode === 'grid' ? 'Grid' : 'List'}
              </button>
            ))}
          </div>
        </div>

        {/* Trips */}
        {loadingTrips ? (
          <div className="rounded-2xl bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 p-6 text-sm text-slate-500">Loading trips...</div>
        ) : completedTrips.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 p-10 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 block mb-3">star_border</span>
            <p className="font-semibold text-slate-700 dark:text-slate-300">No completed trips yet</p>
            <p className="text-xs text-slate-400 mt-1">Ratings appear after your trip is completed</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'space-y-4'}>
            {completedTrips.map((trip, index) => {
              const scheduleId = getTripScheduleId(trip) || `trip-${index}`;
              const rated = Boolean(trip?.alreadyRated || trip?.ratingSubmitted);
              const currentDraft = ratingDrafts[scheduleId] || {};
              const bookingCode = toDisplayBookingId(trip);
              const travelDate = formatTripDate(getTripDate(trip));

              return (
                <div key={scheduleId} className="rounded-[30px] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,rgba(12,12,12,0.96)_0%,rgba(6,6,6,0.98)_100%)] dark:ring-white/10 p-6">
                  {/* Header row */}
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">{getTripRoute(trip)}</h2>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          rated
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                        }`}>
                          {rated ? 'Rated ✓' : 'Pending Review'}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{getTripBusName(trip)}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Booking ID: {bookingCode}</p>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{travelDate}</p>
                    </div>
                    {trip?.rating ? (
                      <div className="rounded-2xl bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-amber-600 dark:text-amber-400">Your rating</p>
                        <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{'★'.repeat(trip.rating)}{'☆'.repeat(5 - trip.rating)}</p>
                      </div>
                    ) : null}
                  </div>

                  {/* Rating form */}
                  {canRateTrip(trip) ? (
                    <div className="mt-5 rounded-2xl bg-slate-50 dark:bg-white/[0.03] p-4 ring-1 ring-slate-200/70 dark:ring-white/10 space-y-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-2">Rate this trip</p>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              disabled={submittingRatingFor === scheduleId}
                              onClick={() => setRatingDrafts(prev => ({ ...prev, [scheduleId]: { ...prev[scheduleId], rating: star } }))}
                              className={`text-3xl leading-none transition-transform ${
                                star <= (currentDraft.rating || 0) ? 'text-amber-400' : 'text-slate-200 dark:text-slate-700'
                              } ${submittingRatingFor === scheduleId ? 'cursor-not-allowed' : 'hover:scale-110'}`}
                            >★</button>
                          ))}
                          {currentDraft.rating ? (
                            <span className="ml-2 text-sm font-semibold text-amber-500">{RATING_LABELS[currentDraft.rating]}</span>
                          ) : null}
                        </div>
                      </div>
                      <textarea
                        rows={3}
                        value={currentDraft.comment || ''}
                        onChange={(e) => setRatingDrafts(prev => ({ ...prev, [scheduleId]: { ...prev[scheduleId], comment: e.target.value } }))}
                        placeholder="Share your trip experience (optional)"
                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-black/40 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-primary resize-none"
                      />
                      <button
                        onClick={() => handleSubmitRating(trip)}
                        disabled={submittingRatingFor === scheduleId || !currentDraft.rating}
                        className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-black hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        {submittingRatingFor === scheduleId ? 'Submitting...' : 'Submit Rating'}
                      </button>
                    </div>
                  ) : rated ? (
                    <div className="mt-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">Thank you for your review!</p>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </UserLayout>
  );
};

export default UserProfile;
