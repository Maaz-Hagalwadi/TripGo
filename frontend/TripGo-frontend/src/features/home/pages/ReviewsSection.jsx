import { useEffect, useState } from 'react';
import { getRecentReviews } from '../../../api/reviewService';
import Reveal from '../../../shared/components/ui/Reveal';

const Stars = ({ value, size = 'text-base' }) => (
  <div className="flex" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span
        key={n}
        className={`material-symbols-outlined ${size} ${n <= Math.round(value) ? 'text-[#FF8A65]' : 'text-slate-200'}`}
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        star
      </span>
    ))}
  </div>
);

const formatTravelDate = (date) =>
  date ? new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : null;

const ReviewCard = ({ review }) => {
  const travelled = formatTravelDate(review.travelDate);
  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm">
      <Stars value={review.rating} />
      {review.title && <p className="mt-3 text-sm font-bold text-slate-900">{review.title}</p>}
      <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-4 flex-1">“{review.comment}”</p>
      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
        <span className="w-9 h-9 flex-shrink-0 rounded-full bg-primary text-white text-sm font-black flex items-center justify-center">
          {review.name.charAt(0)}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{review.name}</p>
          <p className="text-xs text-slate-400 truncate">
            {[review.from && review.to ? `${review.from} → ${review.to}` : null, travelled].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
    </div>
  );
};

const ReviewsSection = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    getRecentReviews(6).then(setData);
  }, []);

  // Only real reviews — hide the section until riders have left some
  if (!data || data.reviews.length === 0) return null;

  return (
    <section id="reviews" className="py-12 md:py-16 bg-slate-50 border-t border-slate-100">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">

        <Reveal className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-900">What riders say</h2>
            <p className="text-slate-500 text-sm mt-1">Reviews from passengers who completed their trip</p>
          </div>
          {data.averageRating != null && (
            <div className="flex items-center gap-3 rounded-xl bg-white border border-slate-200/70 px-4 py-2.5 self-start sm:self-auto">
              <span className="text-2xl font-black text-slate-900">{data.averageRating.toFixed(1)}</span>
              <div>
                <Stars value={data.averageRating} size="text-sm" />
                <p className="text-xs text-slate-400">
                  {data.totalReviews} {data.totalReviews === 1 ? 'review' : 'reviews'}
                </p>
              </div>
            </div>
          )}
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.reviews.map((review, i) => (
            <Reveal key={`${review.name}-${i}`} delay={i * 90}>
              <ReviewCard review={review} />
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
};

export default ReviewsSection;
