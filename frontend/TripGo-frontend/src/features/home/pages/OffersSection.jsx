import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../api/apiClient';
import Reveal from '../../../shared/components/ui/Reveal';

const CLONE_COUNT = 3;
const ENDING_SOON_DAYS = 3;

const getVisibleCount = () => (window.innerWidth < 640 ? 1 : window.innerWidth < 1024 ? 2 : 3);

const mapPromoToOffer = (promo) => {
  const isPercent = promo.type === 'PERCENT';
  const amount = isPercent ? `${promo.value}%` : `₹${promo.value}`;
  const validTo = promo.validTo ? new Date(promo.validTo + 'T00:00:00') : null;
  const daysLeft = validTo ? Math.ceil((validTo - new Date()) / 86400000) : null;
  return {
    code: promo.code,
    amount,
    isPercent,
    condition: promo.minOrderAmount ? `On fares above ₹${promo.minOrderAmount}` : 'On any fare',
    description: promo.description || `Save ${amount} on your next bus booking.`,
    expiry: validTo
      ? `Valid till ${validTo.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : 'No expiry',
    daysLeft: daysLeft !== null && daysLeft >= 0 && daysLeft <= ENDING_SOON_DAYS ? daysLeft : null,
  };
};

const endingSoonLabel = (days) => (days === 0 ? 'Ends today' : days === 1 ? 'Ends tomorrow' : `Ends in ${days} days`);

// navigator.clipboard only exists on HTTPS/localhost — fall back to execCommand elsewhere
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
};

const SkeletonCard = () => (
  <div className="flex h-40 bg-white rounded-2xl border border-slate-200/70 overflow-hidden animate-pulse">
    <div className="w-28 bg-slate-200" />
    <div className="flex-1 p-4 space-y-3">
      <div className="h-4 w-full bg-slate-100 rounded" />
      <div className="h-3 w-1/2 bg-slate-100 rounded" />
      <div className="h-9 w-full bg-slate-100 rounded-lg mt-4" />
    </div>
  </div>
);

const CouponCard = ({ offer }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (await copyText(offer.code)) {
      setCopied(true);
      toast.success(`Code "${offer.code}" copied! Apply it at checkout.`);
      setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(`Couldn't copy automatically — your code is ${offer.code}`);
    }
  };

  return (
    <div className="relative flex h-full bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow">

      {/* Stub */}
      <div className="w-28 flex-shrink-0 bg-primary rounded-l-2xl flex flex-col items-center justify-center text-center px-2 py-5">
        <span className="material-symbols-outlined text-lg text-[#FDBA74]/80 mb-1">
          {offer.isPercent ? 'percent' : 'currency_rupee'}
        </span>
        <span className="text-3xl font-black leading-none bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] bg-clip-text text-transparent">
          {offer.amount}
        </span>
        <span className="text-[11px] font-bold tracking-[0.2em] text-white/70 mt-1.5">OFF</span>
      </div>

      {/* Perforation */}
      <div className="relative border-l-2 border-dashed border-slate-200">
        <span className="absolute -top-2 -left-[9px] w-4 h-4 rounded-full bg-slate-50 border-b border-slate-200/70" />
        <span className="absolute -bottom-2 -left-[9px] w-4 h-4 rounded-full bg-slate-50 border-t border-slate-200/70" />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 p-4 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{offer.description}</p>
          {offer.daysLeft !== null && (
            <span className="flex-shrink-0 rounded-full bg-[#FF8A65]/15 text-orange-700 text-[10px] font-bold px-2 py-0.5 whitespace-nowrap">
              {endingSoonLabel(offer.daysLeft)}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">{offer.condition}</p>

        <div className="mt-auto pt-1 flex items-center gap-2">
          <span className="flex-1 min-w-0 truncate font-mono font-black text-sm tracking-[0.15em] text-center text-primary py-2 rounded-lg border-2 border-dashed border-primary/25 bg-primary/5 select-all">
            {offer.code}
          </span>
          <button
            onClick={handleCopy}
            className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold text-white transition-all active:scale-95 ${
              copied ? 'bg-green-600' : 'bg-primary hover:bg-brand-dark'
            }`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <p className="flex items-center gap-1 text-xs font-medium text-slate-500">
          <span className="material-symbols-outlined text-sm">schedule</span>
          {offer.expiry}
        </p>
      </div>
    </div>
  );
};

const OffersSection = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pos, setPos] = useState(0);
  const [animating, setAnimating] = useState(true);
  const [paused, setPaused] = useState(false);
  const [cardWidth, setCardWidth] = useState(0);
  const [visibleCount, setVisibleCount] = useState(getVisibleCount);
  const containerRef = useRef(null);
  const posRef = useRef(0);
  const visibleRef = useRef(visibleCount);

  const moveTo = useCallback((newPos, animated = true) => {
    setAnimating(animated);
    setPos(newPos);
    posRef.current = newPos;
  }, []);

  useEffect(() => {
    // Don't leave the skeleton up forever if the API is slow to wake (e.g. cold start)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let cancelled = false; // unmounted / effect re-run — ignore this request's result
    fetch(`${API_BASE_URL}/discounts/active`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (cancelled) return;
        const mapped = Array.isArray(data) ? data.map(mapPromoToOffer) : [];
        setOffers(mapped);
        moveTo(mapped.length > visibleRef.current ? CLONE_COUNT : 0, false);
      })
      .catch(() => { if (!cancelled) setOffers([]); })
      .finally(() => { clearTimeout(timeout); if (!cancelled) setLoading(false); });
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [moveTo]);

  // Only scroll (and loop via clones) when there are more offers than fit on screen
  const canScroll = offers.length > visibleCount;
  const cloneCount = canScroll ? CLONE_COUNT : 0;

  const slides = useMemo(() => {
    if (!canScroll) return offers;
    return [...offers.slice(-cloneCount), ...offers, ...offers.slice(0, cloneCount)];
  }, [offers, canScroll, cloneCount]);

  useEffect(() => {
    if (loading || offers.length === 0) return;
    const update = () => {
      if (!containerRef.current) return;
      const vc = getVisibleCount();
      setCardWidth(containerRef.current.offsetWidth / vc);
      if (vc !== visibleRef.current) {
        visibleRef.current = vc;
        setVisibleCount(vc);
        moveTo(offers.length > vc ? CLONE_COUNT : 0, false);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [loading, offers.length, moveTo]);

  const next = useCallback(() => moveTo(posRef.current + 1), [moveTo]);
  const prev = useCallback(() => moveTo(posRef.current - 1), [moveTo]);

  useEffect(() => {
    if (!canScroll || paused || !cardWidth) return;
    const id = setInterval(next, 3500);
    return () => clearInterval(id);
  }, [canScroll, paused, cardWidth, next]);

  const handleTransitionEnd = useCallback(() => {
    if (!canScroll) return;
    const p = posRef.current;
    if (p >= offers.length + cloneCount) moveTo(p - offers.length, false);
    else if (p < cloneCount) moveTo(p + offers.length, false);
  }, [moveTo, offers.length, canScroll, cloneCount]);

  const realIndex = offers.length > 0
    ? ((pos - cloneCount) % offers.length + offers.length) % offers.length
    : 0;

  const arrowCls = 'w-9 h-9 rounded-full bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-primary hover:text-white hover:border-primary transition-all';

  return (
    <section
      id="offers"
      className="bg-slate-50 py-10 sm:py-12 px-4 sm:px-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="max-w-screen-xl mx-auto">

        {/* Only the heading animates — coupons and their loading skeleton stay visible */}
        <Reveal className="flex items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900">Offers for you</h2>
              {offers.length > 0 && (
                <span className="rounded-full bg-[#FF8A65]/15 text-orange-700 text-xs font-bold px-2.5 py-1">
                  {offers.length} active
                </span>
              )}
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Copy a code and apply it at the payment step &middot; One code per booking
            </p>
          </div>
          {canScroll && (
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={prev} className={arrowCls} aria-label="Previous offer">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button onClick={next} className={arrowCls} aria-label="Next offer">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}
        </Reveal>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : offers.length === 0 ? (
          <div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8">
            <span className="w-12 h-12 flex-shrink-0 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-orange-600">local_offer</span>
            </span>
            <div>
              <p className="font-bold text-slate-900">No offers right now</p>
              <p className="text-sm text-slate-500 mt-0.5">New deals drop often — check back soon. Every booking is still free of booking fees.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Extra 8px each side so card padding lines up with the heading */}
            <div ref={containerRef} className="overflow-hidden -mx-2 pt-2 pb-2">
              <div
                className="flex"
                style={{
                  transform: canScroll && cardWidth ? `translateX(${-pos * cardWidth}px)` : undefined,
                  transition: animating ? 'transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)' : 'none',
                  willChange: canScroll ? 'transform' : undefined,
                }}
                onTransitionEnd={handleTransitionEnd}
              >
                {slides.map((offer, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 px-2"
                    style={{ width: cardWidth || `calc(100% / ${visibleCount})` }}
                  >
                    <CouponCard offer={offer} />
                  </div>
                ))}
              </div>
            </div>

            {canScroll && (
              <div className="flex items-center justify-center gap-2 mt-6">
                {offers.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => moveTo(i + cloneCount)}
                    aria-label={`Go to offer ${i + 1}`}
                    className={`rounded-full h-2 transition-all duration-300 ${
                      i === realIndex ? 'w-6 bg-gradient-to-r from-[#FDBA74] to-[#FF8A65]' : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default OffersSection;
