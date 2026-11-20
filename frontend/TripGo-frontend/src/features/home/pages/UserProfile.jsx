import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import PaginationControls from '../../../shared/components/ui/PaginationControls';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { getMyCompletedTrips, submitTripRating } from '../../../api/bookingService';
import { localDateString } from '../../../shared/utils/date';

const PAGE_SIZE = 10;

const RATING_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very good', 5: 'Excellent' };

const TABS = [
  { id: 'pending', label: 'To rate' },
  { id: 'rated', label: 'Rated' },
  { id: 'all', label: 'All trips' },
];

const getScheduleId = (trip) => trip?.routeScheduleId || trip?.scheduleId || trip?.id || trip?.tripId || '';
const isRated = (trip) => Boolean(trip?.alreadyRated || trip?.ratingSubmitted);

/** The trip's real date: travelDate when present (recurring buses), else the schedule departure. */
const getTripDate = (trip) => {
  const value = trip?.travelDate ? `${trip.travelDate}T12:00:00+05:30` : trip?.departureTime;
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
};

const formatTripDate = (trip) => {
  const d = getTripDate(trip);
  return d ? d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '—';
};

const toDisplayBookingId = (trip) => {
  const raw = String(trip?.bookingCode || trip?.bookingId || trip?.id || '').trim();
  if (!raw) return '';
  if (raw.startsWith('TG-') || raw.startsWith('TRIPGO-')) return raw;
  return `TG-${raw.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
};

const Stars = ({ value, size = 'text-xl', onPick, hover, onHover }) => (
  <div className="flex items-center" onMouseLeave={() => onHover?.(0)}>
    {[1, 2, 3, 4, 5].map((n) => {
      const filled = n <= (hover || value);
      const star = (
        <span
          className={`material-symbols-outlined ${size} transition-colors ${filled ? 'text-[#FF8A65]' : 'text-slate-200'}`}
          style={{ fontVariationSettings: filled ? "'FILL' 1" : "'FILL' 0" }}
        >
          star
        </span>
      );
      return onPick ? (
        <button key={n} type="button" onClick={() => onPick(n)} onMouseEnter={() => onHover?.(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="p-0.5 hover:scale-110 active:scale-95 transition-transform">
          {star}
        </button>
      ) : <span key={n}>{star}</span>;
    })}
  </div>
);

const RatingModal = ({ trip, initialRating, onClose, onSubmit, submitting }) => {
  const [rating, setRating] = useState(initialRating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-orange-600">Rate your trip</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900 truncate">{trip.from} <span className="text-[#FF8A65]">→</span> {trip.to}</h2>
            <p className="text-sm text-slate-500">{trip.busName} · {formatTripDate(trip)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-900">How was your trip?</p>
          <div className="mt-2 flex items-center gap-3">
            <Stars value={rating} size="text-4xl" onPick={setRating} hover={hover} onHover={setHover} />
            <span className="text-sm font-bold text-slate-600">{RATING_LABELS[hover || rating] || ''}</span>
          </div>
        </div>

        <div className="mt-5">
          <label htmlFor="review-comment" className="mb-2 block text-sm font-semibold text-slate-900">Your review <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={1000}
            placeholder="Seat comfort, punctuality, staff, boarding — what should other travellers know?"
            className="w-full rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-[#FF8A65] focus:ring-4 focus:ring-[#FDBA74]/25"
          />
          <p className="mt-1 text-xs text-slate-400">Reviews with a comment can be shown on the TripGo home page with your first name and last initial.</p>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
            Maybe later
          </button>
          <button
            onClick={() => onSubmit({ rating, comment })}
            disabled={!rating || submitting}
            className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserProfile = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [tab, setTab] = useState('pending');
  const [page, setPage] = useState(0);
  const [modal, setModal] = useState(null); // { trip, initialRating }
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'USER') return;
    getMyCompletedTrips()
      .then((data) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.trips) ? data.trips : [];
        setTrips([...list].sort((a, b) => (getTripDate(b)?.getTime() ?? 0) - (getTripDate(a)?.getTime() ?? 0)));
      })
      .catch((e) => toast.error(e.message || 'Failed to load your trips'))
      .finally(() => setLoadingTrips(false));
  }, [user]);

  const pending = trips.filter((t) => !isRated(t) && getScheduleId(t));
  const rated = trips.filter(isRated);
  const ratedWithScore = rated.filter((t) => Number(t.rating) > 0);
  const avgRating = ratedWithScore.length
    ? ratedWithScore.reduce((sum, t) => sum + Number(t.rating), 0) / ratedWithScore.length
    : null;

  // Default to "All trips" when nothing is waiting for a review
  const activeTab = tab === 'pending' && !loadingTrips && pending.length === 0 ? 'all' : tab;
  const listed = useMemo(
    () => (activeTab === 'pending' ? pending : activeTab === 'rated' ? rated : trips),
    [activeTab, pending, rated, trips]
  );
  const counts = { pending: pending.length, rated: rated.length, all: trips.length };
  const paginated = listed.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [activeTab]);

  const handleSubmit = async ({ rating, comment }) => {
    const scheduleId = getScheduleId(modal.trip);
    if (!scheduleId) return toast.error('This trip can’t be rated right now.');
    setSubmitting(true);
    try {
      await submitTripRating(scheduleId, { rating, title: `${rating} star review`, comment: String(comment || '').trim() });
      toast.success('Thanks for your review!');
      setTrips((prev) => prev.map((t) => (getScheduleId(t) === scheduleId ? { ...t, alreadyRated: true, rating, comment: comment.trim() } : t)));
      setModal(null);
    } catch (e) {
      toast.error(e.message || 'Failed to submit your review');
    } finally {
      setSubmitting(false);
    }
  };

  const stats = [
    { label: 'Completed trips', value: trips.length, icon: 'directions_bus', tone: 'text-slate-600 bg-slate-100' },
    { label: 'Waiting for review', value: pending.length, icon: 'rate_review', tone: 'text-orange-600 bg-[#FDBA74]/20' },
    { label: 'Your average rating', value: avgRating ? `${avgRating.toFixed(1)} ★` : '—', icon: 'star', tone: 'text-[#FF8A65] bg-[#FFF7F2]' },
  ];

  return (
    <UserLayout activeItem="ratings" title="Ratings" showHeaderTitle={false} showHeaderSearch={false}>
      <div className="space-y-6">

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Ratings &amp; reviews</h1>
          <p className="text-sm text-slate-500 mt-1">Rate your completed trips — your reviews help other travellers pick the right bus.</p>
        </div>

        {/* Prompt */}
        {!loadingTrips && pending.length > 0 && (
          <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white">
            <div className="absolute -top-20 -right-10 w-64 h-64 rounded-full bg-[#FF8A65]/20 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#FDBA74]">
                  {pending.length} trip{pending.length !== 1 ? 's' : ''} waiting for your review
                </p>
                <h2 className="text-xl font-black mt-0.5">How was {pending[0].from} → {pending[0].to}?</h2>
                <p className="text-sm text-slate-300">{pending[0].busName} · {formatTripDate(pending[0])}</p>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-3 py-2">
                <Stars value={0} size="text-3xl" onPick={(n) => setModal({ trip: pending[0], initialRating: n })} />
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
        <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-3 p-5">
              <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center ${s.tone}`}>
                <span className="material-symbols-outlined text-[20px]" style={s.icon === 'star' ? { fontVariationSettings: "'FILL' 1" } : undefined}>{s.icon}</span>
              </span>
              <div>
                <p className="text-xl font-black text-slate-900 leading-none">{loadingTrips ? '–' : s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Tabs */}
        <div className="flex rounded-xl border border-slate-200 bg-white p-1 w-fit" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={activeTab === t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === t.id ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary'
              }`}>
              {t.label}
              <span className={`text-[11px] font-bold ${activeTab === t.id ? 'text-[#FDBA74]' : 'text-slate-400'}`}>{loadingTrips ? '' : counts[t.id]}</span>
            </button>
          ))}
        </div>

        {/* List */}
        {loadingTrips ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-2xl bg-white border border-slate-200/70 animate-pulse" />)}
          </div>
        ) : listed.length === 0 ? (
          <section className="rounded-2xl bg-white border border-slate-200/70 p-12 text-center">
            <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[#FDBA74]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-orange-600">reviews</span>
            </span>
            <h2 className="text-lg font-black text-slate-900">
              {trips.length === 0 ? 'No completed trips yet' : activeTab === 'rated' ? 'You haven’t rated any trips yet' : 'All caught up!'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {trips.length === 0 ? 'After you travel, your trips appear here so you can rate them.' : 'Thanks for helping other travellers.'}
            </p>
            {trips.length === 0 && (
              <button onClick={() => navigate(ROUTES.DASHBOARD)} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors">
                Plan a trip
              </button>
            )}
          </section>
        ) : (
          <div className="space-y-3">
            {paginated.map((trip) => {
              const done = isRated(trip);
              return (
                <article key={getScheduleId(trip) || trip.bookingId} className="rounded-2xl bg-white border border-slate-200/80 shadow-sm p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="w-11 h-11 flex-shrink-0 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[22px]">directions_bus</span>
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-black text-slate-900 truncate">{trip.from} <span className="text-[#FF8A65]">→</span> {trip.to}</h3>
                        <p className="text-xs text-slate-500 truncate">
                          {[trip.busName, formatTripDate(trip), toDisplayBookingId(trip)].filter(Boolean).join(' · ')}
                        </p>
                        {done && trip.comment && (
                          <p className="mt-2 text-sm text-slate-600 italic line-clamp-2">“{trip.comment}”</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 md:justify-end">
                      {done ? (
                        <div className="text-left md:text-right">
                          {Number(trip.rating) > 0 ? (
                            <>
                              <Stars value={Number(trip.rating)} size="text-lg" />
                              <p className="text-xs font-semibold text-slate-500">{RATING_LABELS[trip.rating]}</p>
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700">
                              <span className="material-symbols-outlined text-[14px]">check</span>Reviewed
                            </span>
                          )}
                        </div>
                      ) : (
                        <>
                          <Stars value={0} size="text-2xl" onPick={(n) => setModal({ trip, initialRating: n })} />
                          <button onClick={() => setModal({ trip, initialRating: 0 })} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-[#102A4C] transition-colors whitespace-nowrap">
                            Write review
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => navigate(ROUTES.SEARCH_RESULTS, { state: { from: trip.from, to: trip.to, date: localDateString(1) } })}
                        title="Book this route again"
                        aria-label={`Book ${trip.from} to ${trip.to} again`}
                        className="w-9 h-9 flex-shrink-0 rounded-xl border border-slate-200 text-slate-500 hover:border-[#FF8A65] hover:text-primary flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">replay</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
            <PaginationControls page={page} pageSize={PAGE_SIZE} totalItems={listed.length} onPageChange={setPage} itemLabel="trips" />
          </div>
        )}
      </div>

      {modal && (
        <RatingModal
          trip={modal.trip}
          initialRating={modal.initialRating}
          submitting={submitting}
          onClose={() => setModal(null)}
          onSubmit={handleSubmit}
        />
      )}
    </UserLayout>
  );
};

export default UserProfile;
