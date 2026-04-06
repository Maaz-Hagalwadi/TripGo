import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { getMyCompletedTrips, submitTripRating } from '../../../api/bookingService';

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

  const getTripScheduleId = (trip) => trip?.scheduleId || trip?.id || trip?.tripId || '';
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
            <div className="space-y-3">
              {completedTrips.map((trip, index) => {
                const scheduleId = getTripScheduleId(trip) || `trip-${index}`;
                const rated = Boolean(trip?.alreadyRated || trip?.ratingSubmitted);
                const currentDraft = ratingDrafts[scheduleId] || {};
                return (
                  <div key={scheduleId} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div>
                        <p className="font-semibold">{getTripRoute(trip)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{getTripBusName(trip)} {getTripDate(trip) ? `• ${new Date(getTripDate(trip)).toLocaleDateString('en-IN')}` : ''}</p>
                      </div>
                      {rated && <span className="text-xs px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">Rated</span>}
                    </div>

                    {canRateTrip(trip) ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Rating *</label>
                          <select
                            value={currentDraft.rating || ''}
                            onChange={(e) => setRatingDrafts((prev) => ({ ...prev, [scheduleId]: { ...prev[scheduleId], rating: e.target.value } }))}
                            className="w-full md:w-40 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                          >
                            <option value="">Select</option>
                            <option value="1">1 - Poor</option>
                            <option value="2">2 - Fair</option>
                            <option value="3">3 - Good</option>
                            <option value="4">4 - Very Good</option>
                            <option value="5">5 - Excellent</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Comment (optional)</label>
                          <textarea
                            rows={2}
                            value={currentDraft.comment || ''}
                            onChange={(e) => setRatingDrafts((prev) => ({ ...prev, [scheduleId]: { ...prev[scheduleId], comment: e.target.value } }))}
                            placeholder="Share your trip experience"
                            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                          />
                        </div>
                        <button
                          onClick={() => handleSubmitRating(trip)}
                          disabled={submittingRatingFor === scheduleId}
                          className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
                        >
                          {submittingRatingFor === scheduleId ? 'Submitting...' : 'Submit Rating'}
                        </button>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {rated ? 'You already submitted a rating for this trip.' : 'Rating will be available after the trip is completed.'}
                      </p>
                    )}
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
