import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { getMyCompletedTrips, submitTripRating } from '../../../api/bookingService';

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

const toDisplayBookingId = (trip) => {
  const raw = String(trip?.bookingCode || trip?.publicBookingId || trip?.bookingNumber || trip?.pnr || trip?.bookingId || trip?.id || '').trim();
  if (!raw) return '--';
  if (raw.startsWith('TG-') || raw.startsWith('TRIPGO-')) return raw;
  const compact = raw.replace(/-/g, '').slice(0, 8).toUpperCase();
  return compact ? `TG-${compact}` : raw;
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [completedTrips, setCompletedTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [ratingDrafts, setRatingDrafts] = useState({});
  const [submittingRatingFor, setSubmittingRatingFor] = useState('');

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
        setCompletedTrips(list);
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
      <div className="space-y-6">
        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">Rate Completed Trips</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Profile and account controls were moved to Settings. This page is now focused on ratings only.</p>
        </div>

        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">Completed Trips</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Ratings are available only after trip completion.</p>

          {loadingTrips ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading completed trips...</p>
          ) : completedTrips.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No completed trips found yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {completedTrips.map((trip, index) => {
                const scheduleId = getTripScheduleId(trip) || `trip-${index}`;
                const rated = Boolean(trip?.alreadyRated || trip?.ratingSubmitted);
                const currentDraft = ratingDrafts[scheduleId] || {};
                const bookingCode = toDisplayBookingId(trip);
                const travelDate = getTripDate(trip);
                return (
                  <div key={scheduleId} className="rounded-[28px] bg-[linear-gradient(140deg,#ffffff,#eef7ff)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(135deg,#0a0a0a,#111111)] dark:ring-white/10">
                    <div className="flex h-full flex-col gap-5">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                          <span className="material-symbols-outlined text-2xl text-primary">directions_bus</span>
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">{getTripRoute(trip)}</h4>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${rated ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                              {rated ? 'Rated' : 'Pending Review'}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-200">{getTripBusName(trip)}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">{travelDate !== '--' ? travelDate : 'Completed trip'}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">Booking {bookingCode}</span>
                            {trip?.rating ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-white/5 dark:text-slate-300">⭐ {trip.rating}/5</span> : null}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70 dark:bg-black/40 dark:ring-white/10">
                        {canRateTrip(trip) ? (
                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Rating *</label>
                              <select
                                value={currentDraft.rating || ''}
                                onChange={(e) => setRatingDrafts((prev) => ({ ...prev, [scheduleId]: { ...prev[scheduleId], rating: e.target.value } }))}
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              >
                                <option value="">Select rating</option>
                                <option value="1">1 - Poor</option>
                                <option value="2">2 - Fair</option>
                                <option value="3">3 - Good</option>
                                <option value="4">4 - Very Good</option>
                                <option value="5">5 - Excellent</option>
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Comment</label>
                              <textarea
                                rows={3}
                                value={currentDraft.comment || ''}
                                onChange={(e) => setRatingDrafts((prev) => ({ ...prev, [scheduleId]: { ...prev[scheduleId], comment: e.target.value } }))}
                                placeholder="Share your trip experience"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                              />
                            </div>
                            <button
                              onClick={() => handleSubmitRating(trip)}
                              disabled={submittingRatingFor === scheduleId}
                              className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-black text-black hover:bg-primary/90 disabled:opacity-60"
                            >
                              {submittingRatingFor === scheduleId ? 'Submitting...' : 'Submit Rating'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{rated ? 'Review submitted' : 'Review unavailable'}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {rated ? 'You already submitted a rating for this trip.' : 'Rating will be available after the trip is completed.'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default UserProfile;
