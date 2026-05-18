import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../api/apiClient';

const CARD_STYLES = [
  { badge: 'New User',     badgeColor: 'bg-emerald-100 text-emerald-700', accent: '#0B1F3A' },
  { badge: 'Weekend Deal', badgeColor: 'bg-blue-100 text-blue-700',       accent: '#1a3a6b' },
  { badge: 'Exclusive',    badgeColor: 'bg-violet-100 text-violet-700',   accent: '#3730a3' },
  { badge: 'Early Bird',   badgeColor: 'bg-amber-100 text-amber-700',     accent: '#92400e' },
  { badge: 'Group Deal',   badgeColor: 'bg-teal-100 text-teal-700',       accent: '#0f766e' },
  { badge: 'Special Offer',badgeColor: 'bg-rose-100 text-rose-700',       accent: '#9f1239' },
];

const mapPromoToOffer = (promo, index) => {
  const style = CARD_STYLES[index % CARD_STYLES.length];
  const discountLabel = promo.type === 'PERCENT' ? `${promo.value}% OFF` : `₹${promo.value} OFF`;
  const subtitle = promo.minOrderAmount
    ? `Min. order ₹${promo.minOrderAmount}`
    : 'All bookings';
  const expiry = promo.validTo
    ? `Valid till ${new Date(promo.validTo + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : 'No expiry';
  return {
    code: promo.code,
    title: discountLabel,
    subtitle,
    description: promo.description || `Use code ${promo.code} and save ${discountLabel} on your next booking.`,
    badge: style.badge,
    badgeColor: style.badgeColor,
    accent: style.accent,
    expiry,
  };
};

const CLONE_COUNT = 3;

const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse h-56">
    <div className="h-1.5 w-full bg-slate-200" />
    <div className="p-5 space-y-3">
      <div className="flex justify-between">
        <div className="h-5 w-20 bg-slate-100 rounded-full" />
        <div className="h-8 w-24 bg-slate-100 rounded-lg" />
      </div>
      <div className="h-4 w-full bg-slate-100 rounded" />
      <div className="h-4 w-3/4 bg-slate-100 rounded" />
      <div className="h-10 w-full bg-slate-100 rounded-xl mt-2" />
    </div>
  </div>
);

const CouponCard = ({ offer }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(offer.code).then(() => {
      setCopied(true);
      toast.success(`Code "${offer.code}" copied! Apply it at checkout.`);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative bg-white rounded-2xl shadow-[0_4px_24px_rgba(11,31,58,0.08)] border border-slate-100 overflow-hidden flex flex-col h-full">
      <div className="h-1.5 w-full" style={{ background: offer.accent }} />
      <div className="p-4 sm:p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${offer.badgeColor}`}>
            {offer.badge}
          </span>
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-black leading-none" style={{ color: offer.accent }}>
              {offer.title}
            </div>
            <div className="text-xs font-semibold text-slate-500 mt-0.5">{offer.subtitle}</div>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed flex-1 line-clamp-2">{offer.description}</p>

        <div className="relative flex items-center -mx-4 sm:-mx-5 my-1">
          <div className="w-4 h-4 rounded-full bg-slate-100 -ml-2 shrink-0" />
          <div className="flex-1 border-t-2 border-dashed border-slate-200" />
          <div className="w-4 h-4 rounded-full bg-slate-100 -mr-2 shrink-0" />
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex-1 font-mono font-extrabold text-sm tracking-[0.18em] text-center py-2 rounded-xl border-2 border-dashed select-all"
            style={{ borderColor: offer.accent, color: offer.accent, background: `${offer.accent}08` }}
          >
            {offer.code}
          </div>
          <button
            onClick={handleCopy}
            className="shrink-0 px-3 py-2 rounded-xl text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: copied ? '#16a34a' : offer.accent }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="material-symbols-outlined text-[13px]">schedule</span>
          {offer.expiry}
        </div>
      </div>
    </div>
  );
};

const OffersSection = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState(CLONE_COUNT);
  const [animating, setAnimating] = useState(true);
  const [paused, setPaused] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const containerRef = useRef(null);
  const posRef = useRef(CLONE_COUNT);

  useEffect(() => {
    fetch(`${API_BASE_URL}/discounts/active`)
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        const mapped = Array.isArray(data) ? data.map(mapPromoToOffer) : [];
        setOffers(mapped);
        setPos(CLONE_COUNT);
        posRef.current = CLONE_COUNT;
      })
      .catch(() => setOffers([]))
      .finally(() => setLoading(false));
  }, []);

  // For ≤3 offers there are no "hidden" slides, so disable cloning
  const useClones = offers.length > 3;
  const cloneCount = useClones ? CLONE_COUNT : 0;

  const slides = useMemo(() => {
    if (offers.length === 0) return [];
    if (!useClones) return offers;
    return [...offers.slice(-cloneCount), ...offers, ...offers.slice(0, cloneCount)];
  }, [offers, useClones, cloneCount]);

  useEffect(() => {
    setPos(cloneCount);
    posRef.current = cloneCount;
  }, [cloneCount]);

  useEffect(() => {
    if (loading || offers.length === 0) return;
    const update = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      const vc = window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3;
      setCardWidth(w / vc);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [loading, offers.length]);

  const moveTo = useCallback((newPos, animated = true) => {
    setAnimating(animated);
    setPos(newPos);
    posRef.current = newPos;
  }, []);

  const next = useCallback(() => moveTo(posRef.current + 1), [moveTo]);
  const prev = useCallback(() => moveTo(posRef.current - 1), [moveTo]);

  useEffect(() => {
    if (paused || !cardWidth || offers.length === 0) return;
    const id = setInterval(next, 3500);
    return () => clearInterval(id);
  }, [paused, cardWidth, next, offers.length]);

  const handleTransitionEnd = useCallback(() => {
    if (!useClones) return;
    const p = posRef.current;
    if (p >= offers.length + cloneCount) moveTo(p - offers.length, false);
    else if (p < cloneCount) moveTo(p + offers.length, false);
  }, [moveTo, offers.length, useClones, cloneCount]);

  const realIndex = offers.length > 0
    ? ((pos - cloneCount) % offers.length + offers.length) % offers.length
    : 0;

  // Visible cards count
  const visibleCount = typeof window !== 'undefined'
    ? (window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3)
    : 3;

  // Max position before we hit cloned tail
  const maxPos = cloneCount + offers.length - visibleCount;

  const handlePrev = () => {
    if (!useClones && pos <= cloneCount) return;
    prev();
  };

  const handleNext = () => {
    if (!useClones && pos >= maxPos) return;
    next();
  };

  return (
    <section
      className="bg-slate-50 py-10 sm:py-16 px-4 sm:px-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#0B1F3A]/8 rounded-full px-3 py-1 mb-3">
              <span className="material-symbols-outlined text-[#0B1F3A] text-[16px]">local_offer</span>
              <span className="text-[#0B1F3A] text-xs font-bold uppercase tracking-widest">Exclusive Deals</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 leading-tight">
              Save More on Every Trip
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              Apply these codes at checkout — no catch, no fine print.
            </p>
          </div>
          <span className="material-symbols-outlined text-5xl text-slate-200 hidden sm:block select-none">
            confirmation_number
          </span>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : offers.length === 0 ? null : (
          <>
            {/* Carousel */}
            <div className="relative">
              <button
                onClick={handlePrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 sm:-translate-x-5 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-[#0B1F3A] hover:text-white hover:border-[#0B1F3A] transition-all"
                aria-label="Previous"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              <div ref={containerRef} className="overflow-hidden mx-5 sm:mx-6">
                <div
                  className="flex"
                  style={{
                    transform: cardWidth ? `translateX(${-pos * cardWidth}px)` : undefined,
                    transition: animating ? 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
                    willChange: 'transform',
                  }}
                  onTransitionEnd={handleTransitionEnd}
                >
                  {slides.map((offer, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 px-2"
                      style={cardWidth ? { width: cardWidth } : { width: 'calc(100% / 3)' }}
                    >
                      <CouponCard offer={offer} />
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 sm:translate-x-5 z-10 w-9 h-9 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-[#0B1F3A] hover:text-white hover:border-[#0B1F3A] transition-all"
                aria-label="Next"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center justify-center gap-2 mt-6">
              {offers.map((_, i) => (
                <button
                  key={i}
                  onClick={() => moveTo(i + cloneCount)}
                  aria-label={`Go to offer ${i + 1}`}
                  className={`rounded-full h-2 transition-all duration-300 ${
                    i === realIndex ? 'w-6 bg-[#0B1F3A]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {!loading && offers.length > 0 && (
          <p className="text-center text-xs text-slate-400 mt-6">
            Codes apply at the payment step &middot; One code per booking &middot; Subject to availability
          </p>
        )}
      </div>
    </section>
  );
};

export default OffersSection;
