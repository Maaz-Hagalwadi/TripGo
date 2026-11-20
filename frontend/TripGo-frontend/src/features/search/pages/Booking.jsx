import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { ROUTES } from '../../../shared/constants/routes';
import { INDIA_STATES } from '../../../shared/constants/indiaStates';
import {
  getDelayMinutes,
  getTripStatusValue,
  isSeatAvailableForBooking,
} from '../../../shared/utils/scheduleSearchUtils';
import {
  applyPromoCode,
  getBusRatingSummary,
  getScheduleFeatures,
  getSchedulePointsForBooking,
  getSchedulePolicies,
  getScheduleRouteStops,
  getScheduleSeats,
  lockScheduleSeats,
  getSavedPassengerProfiles,
  createSavedPassengerProfile,
} from '../../../api/bookingService';
import CheckoutHeader from '../components/CheckoutHeader';
import SeatMap from '../components/SeatMap';
import { getWomenOnlySeats } from '../utils/seatLayout';

const CURRENT_BOOKING_STORAGE_KEY = 'tripgo_current_booking_state';
const BOOKING_DRAFT_PREFIX = 'tripgo_booking_draft_';
const SAVED_TRAVELERS_KEY = 'tripgo_saved_travelers';
const SAVED_CONTACT_KEY = 'tripgo_saved_contact';
const RECENT_TRAVELERS_LIMIT = 6;
const MAX_SEATS = 6;
const STEPS = ['seats', 'points', 'details'];
const seatComparator = (a, b) => String(a.seatNumber || '').localeCompare(String(b.seatNumber || ''), undefined, { numeric: true, sensitivity: 'base' });

const stopLabel = (stop) => stop?.name || stop?.stopName || stop?.city || stop?.location || stop?.address || stop?.landmark || '';
const amenityLabel = (item) => {
  if (typeof item === 'string') return item;
  return item?.code || item?.name || item?.description || '';
};
const prettyLabel = (value) => String(value || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** "21:30:00" → "09:30 PM" (boarding points store a local time of day) */
const formatPointTime = (value) => {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  const h = Number(match[1]);
  return `${String(h % 12 || 12).padStart(2, '0')}:${match[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

const formatCancellationLines = (policy) => {
  if (!Array.isArray(policy?.cancellation)) return [];
  return policy.cancellation.map((item) => `${item?.label || `Before ${item?.hoursBeforeDeparture ?? 0} hrs`}: ${item?.refundPercent ?? 0}% refund`);
};

const formatDateChangeLines = (policy) => {
  const dateChange = policy?.dateChange;
  if (!dateChange || typeof dateChange !== 'object') return [];
  if (!dateChange.allowed) return ['Date change is not allowed for this trip.'];
  return [`Date change allowed up to ${dateChange.minHoursBeforeDeparture ?? 0} hrs before departure with a ${dateChange.feePercent ?? 0}% fee.`];
};

const formatRuleLines = (policy) => {
  const rules = policy?.rules;
  if (!rules || typeof rules !== 'object') return [];
  return [
    rules.children ? `Children: ${rules.children}` : null,
    rules.luggage ? `Luggage: ${rules.luggage}` : null,
    rules.pets ? `Pets: ${rules.pets}` : null,
    rules.liquor ? `Liquor: ${rules.liquor}` : null,
    rules.smoking ? `Smoking: ${rules.smoking}` : null,
    rules.pickup ? `Pickup: ${rules.pickup}` : null,
  ].filter(Boolean);
};

const formatRestStops = (featuresInfo, policiesInfo, bus) => {
  const stops = (Array.isArray(featuresInfo?.restStops) && featuresInfo.restStops.length ? featuresInfo.restStops : policiesInfo?.restStops) || [];
  if (stops.length) {
    return stops.map((stop) => `${stop.name}${stop.location ? `, ${stop.location}` : ''}${stop.durationMinutes ? ` · ${stop.durationMinutes} min` : ''}`).join(' | ');
  }
  return featuresInfo?.restStopName || bus?.restStopName || '';
};

const INPUT_CLASS = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all';
const LABEL_CLASS = 'mb-1.5 block text-xs font-bold text-slate-600';
const createEmptyPassenger = (seatNumber = '') => ({ seatNumber, name: '', age: '', gender: '', phone: '', email: '' });

const readStorage = (key, storage = localStorage) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeStorage = (key, value, storage = localStorage) => {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
};

const removeStorage = (key, storage = localStorage) => {
  try {
    storage.removeItem(key);
  } catch {
    // ignore storage errors
  }
};

const toDraftKeyPart = (value) => String(value || '')
  .trim()
  .replace(/[^a-zA-Z0-9_-]+/g, '-');

const normalizeTraveler = (traveler = {}) => ({
  seatNumber: traveler?.seatNumber || '',
  name: traveler?.name || [traveler?.firstName, traveler?.lastName].filter(Boolean).join(' '),
  age: traveler?.age ?? '',
  gender: traveler?.gender || '',
  phone: traveler?.phone || '',
  email: traveler?.email || '',
});

const dedupeTravelers = (travelers = []) => {
  const unique = new Map();
  travelers.forEach((traveler) => {
    const normalized = normalizeTraveler(traveler);
    const key = [
      normalized.name.trim().toLowerCase(),
      normalized.phone.trim(),
      normalized.email.trim().toLowerCase(),
    ].join('|');
    if (!normalized.name.trim() || !key.replace(/\|/g, '')) return;
    if (!unique.has(key)) unique.set(key, normalized);
  });
  return [...unique.values()].slice(0, RECENT_TRAVELERS_LIMIT);
};

const InlineLoader = ({ label }) => (
  <div className="flex items-center gap-3 py-6 text-sm text-slate-500">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
    <span>{label}</span>
  </div>
);

const Card = ({ title, subtitle, icon, action, children, className = '' }) => (
  <section className={`rounded-2xl bg-white border border-slate-200/80 shadow-sm ${className}`}>
    {title && (
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <span className="w-9 h-9 flex-shrink-0 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-orange-600">{icon}</span>
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-black text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

/** Selectable boarding / dropping point */
const PointOption = ({ point, name, checked, onChange }) => (
  <label className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-[#FF8A65]/40 ${
    checked ? 'border-primary bg-primary/[0.04] ring-1 ring-primary' : 'border-slate-200 hover:border-[#FF8A65]'
  }`}>
    <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
    <span className={`mt-0.5 w-4 h-4 flex-shrink-0 rounded-full border-2 ${checked ? 'border-primary bg-primary shadow-[inset_0_0_0_3px_white]' : 'border-slate-300'}`} aria-hidden="true" />
    <span className="min-w-0 flex-1">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-bold text-slate-900">{point.name}</span>
        {point.arrivalTime && <span className="flex-shrink-0 text-sm font-black text-slate-900">{formatPointTime(point.arrivalTime)}</span>}
      </span>
      {(point.landmark || point.address) && (
        <span className="mt-0.5 block text-xs text-slate-500">{[point.landmark, point.address].filter(Boolean).join(' · ')}</span>
      )}
    </span>
  </label>
);

const GENDERS = [['MALE', 'Male'], ['FEMALE', 'Female'], ['OTHER', 'Other']];

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingState = useMemo(
    () => (location.state?.bus ? location.state : (readStorage(CURRENT_BOOKING_STORAGE_KEY) || {})),
    [location.state],
  );
  const { bus, selectedType, selectedFare, searchParams } = bookingState;
  const scheduleId = bus?.scheduleId || bus?.id;
  const travelDate = searchParams?.date || bookingState?.travelDate || '';
  const draftKey = scheduleId ? `${BOOKING_DRAFT_PREFIX}${toDraftKeyPart(scheduleId)}_${toDraftKeyPart(travelDate || 'unscheduled')}` : '';
  // Read once: re-parsing it every render gave the passengers effect a new dependency each time
  const [savedDraft] = useState(() => (draftKey ? readStorage(draftKey) : null));
  const savedLockExpiresAt = Number(savedDraft?.lockExpiresAt || 0);
  const hasActiveSavedLock = savedLockExpiresAt > Date.now();

  const [step, setStep] = useState(hasActiveSavedLock && STEPS.includes(savedDraft?.step) ? savedDraft.step : 'seats');
  const [selectedSeats, setSelectedSeats] = useState(Array.isArray(savedDraft?.selectedSeats) ? savedDraft.selectedSeats : []);
  const [seatsResponse, setSeatsResponse] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [loadingSeatsError, setLoadingSeatsError] = useState('');
  const [lockInfo, setLockInfo] = useState(hasActiveSavedLock ? (savedDraft?.lockInfo || null) : null);
  const [lockingSeats, setLockingSeats] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState(hasActiveSavedLock ? savedLockExpiresAt : null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(hasActiveSavedLock ? Math.max(0, Math.floor((savedLockExpiresAt - Date.now()) / 1000)) : 0);
  const [points, setPoints] = useState({ boardingPoints: [], droppingPoints: [] });
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [selection, setSelection] = useState(savedDraft?.selection || { boardingPointId: '', droppingPointId: '' });
  const [contact, setContact] = useState(() => savedDraft?.contact || {
    countryCode: '+91', phone: '', email: '', stateOfResidence: '', whatsappOptIn: false,
    ...(readStorage(SAVED_CONTACT_KEY) || {}),
  });
  const [passengers, setPassengers] = useState([]);
  const [savePassengerFlags, setSavePassengerFlags] = useState({});
  const [routeInfo, setRouteInfo] = useState(null);
  const [policiesInfo, setPoliciesInfo] = useState(null);
  const [featuresInfo, setFeaturesInfo] = useState(null);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [recentTravelers] = useState(() => dedupeTravelers(readStorage(SAVED_TRAVELERS_KEY) || []));
  const [savedProfilesList, setSavedProfilesList] = useState([]);
  const [promoInput, setPromoInput] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  const refreshSeats = async () => {
    if (!scheduleId) return;
    setLoadingSeats(true);
    setLoadingSeatsError('');
    try {
      setSeatsResponse(await getScheduleSeats(scheduleId, travelDate, searchParams?.from || '', searchParams?.to || ''));
    } catch (e) {
      setLoadingSeatsError(e.message || 'Failed to load seats');
    } finally {
      setLoadingSeats(false);
    }
  };

  useEffect(() => {
    if (!bus) return;
    writeStorage(CURRENT_BOOKING_STORAGE_KEY, bookingState);
  }, [bookingState, bus]);

  useEffect(() => {
    if (!draftKey || !bus) return;
    writeStorage(draftKey, {
      step,
      selectedSeats,
      selection,
      contact,
      passengers,
      lockInfo,
      lockExpiresAt,
      updatedAt: new Date().toISOString(),
    });
  }, [draftKey, bus, step, selectedSeats, selection, contact, passengers, lockInfo, lockExpiresAt]);

  useEffect(() => {
    if (!scheduleId) return;
    refreshSeats();
  }, [scheduleId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (step === 'seats' || !scheduleId) return;
    const fetchPoints = async () => {
      setLoadingPoints(true);
      try {
        const data = await getSchedulePointsForBooking(scheduleId);
        setPoints({
          boardingPoints: Array.isArray(data?.boardingPoints) ? data.boardingPoints : [],
          droppingPoints: Array.isArray(data?.droppingPoints) ? data.droppingPoints : [],
        });
      } finally {
        setLoadingPoints(false);
      }
    };
    fetchPoints();
  }, [step, scheduleId]);

  useEffect(() => {
    if (!lockExpiresAt) return;
    const tick = () => {
      const left = Math.max(0, Math.floor((lockExpiresAt - Date.now()) / 1000));
      setLockSecondsLeft(left);
      if (left <= 0) {
        setStep('seats');
        setLockInfo(null);
        setLockExpiresAt(null);
        if (draftKey) removeStorage(draftKey);
        toast.error('Your seat hold expired. Pick your seats again.');
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [draftKey, lockExpiresAt]);

  useEffect(() => {
    setPassengers((prev) => {
      const draftPassengers = Array.isArray(savedDraft?.passengers) ? savedDraft.passengers : [];
      const bySeat = new Map(prev.map((item) => [item.seatNumber, item]));
      const draftBySeat = new Map(draftPassengers.map((item) => [item.seatNumber, normalizeTraveler(item)]));
      return selectedSeats.map((seatNumber) => {
        const existing = bySeat.get(seatNumber);
        if (existing) return existing;
        const fromDraft = draftBySeat.get(seatNumber);
        if (fromDraft) return { ...createEmptyPassenger(seatNumber), ...fromDraft, seatNumber };
        return createEmptyPassenger(seatNumber);
      });
    });
  }, [selectedSeats, savedDraft?.passengers]);

  useEffect(() => {
    if (!scheduleId) return;
    let isMounted = true;
    Promise.allSettled([
      getScheduleRouteStops(scheduleId),
      getSchedulePolicies(scheduleId),
      getScheduleFeatures(scheduleId),
      bus?.id ? getBusRatingSummary(bus.id) : Promise.resolve(null),
    ]).then(([routeRes, policyRes, featureRes, ratingRes]) => {
      if (!isMounted) return;
      if (routeRes.status === 'fulfilled') setRouteInfo(routeRes.value);
      if (policyRes.status === 'fulfilled') setPoliciesInfo(policyRes.value);
      if (featureRes.status === 'fulfilled') setFeaturesInfo(featureRes.value);
      if (ratingRes.status === 'fulfilled') setRatingSummary(ratingRes.value);
    });
    return () => { isMounted = false; };
  }, [scheduleId, bus?.id]);

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return;
    getSavedPassengerProfiles().then(setSavedProfilesList).catch(() => {});
  }, []);

  const seats = useMemo(() => {
    if (Array.isArray(seatsResponse?.upperDeck) || Array.isArray(seatsResponse?.lowerDeck)) {
      const lower = (seatsResponse?.lowerDeck || []).map((seat) => ({ ...seat, deck: 'lower' }));
      const upper = (seatsResponse?.upperDeck || []).map((seat) => ({ ...seat, deck: 'upper' }));
      return [...lower, ...upper].sort(seatComparator);
    }
    if (Array.isArray(seatsResponse?.seats)) {
      return seatsResponse.seats.map((seat) => ({ ...seat, deck: seatsResponse.deck || 'lower' })).sort(seatComparator);
    }
    if (Array.isArray(bus?.seatAvailability)) return [...bus.seatAvailability].sort(seatComparator);
    return [];
  }, [seatsResponse, bus]);

  // Each seat is priced by its own type (seater / lower / upper berth); the type picked in search is the fallback
  const fareOf = useCallback((seat) => bus?.faresByType?.[seat?.seatType] || selectedFare || null, [bus, selectedFare]);
  const priceOf = useCallback((seat) => {
    const fare = fareOf(seat);
    return fare ? Math.round(Number(fare.totalFare)) : null;
  }, [fareOf]);
  const seatByNumber = useMemo(() => new Map(seats.map((seat) => [seat.seatNumber, seat])), [seats]);
  const seatFares = useMemo(
    () => selectedSeats.map((seatNumber) => ({ seatNumber, ...(fareOf(seatByNumber.get(seatNumber)) || {}) })),
    [selectedSeats, seatByNumber, fareOf],
  );
  const seatsTotal = seatFares.reduce((sum, fare) => sum + Math.round(Number(fare.totalFare || 0)), 0);
  const discount = promoResult ? Math.round(Number(promoResult.discountAmount || 0)) : 0;
  const payable = Math.max(0, seatsTotal - discount);
  const availableCount = useMemo(() => seats.filter(isSeatAvailableForBooking).length, [seats]);
  const womenOnlySeats = useMemo(() => getWomenOnlySeats(seats), [seats]);

  const boardingPoints = points.boardingPoints || [];
  const droppingPoints = points.droppingPoints || [];
  const boardingPoint = boardingPoints.find((p) => String(p.id) === String(selection.boardingPointId));
  const droppingPoint = droppingPoints.find((p) => String(p.id) === String(selection.droppingPointId));

  const routeStops = useMemo(() => {
    if (Array.isArray(routeInfo?.stops) && routeInfo.stops.length) return routeInfo.stops.map(stopLabel).filter(Boolean);
    if (Array.isArray(routeInfo?.routeStops) && routeInfo.routeStops.length) return routeInfo.routeStops.map(stopLabel).filter(Boolean);
    if (Array.isArray(routeInfo) && routeInfo.length) return routeInfo.map(stopLabel).filter(Boolean);
    if (Array.isArray(bus?.routeStops) && bus.routeStops.length) return bus.routeStops;
    return [searchParams?.from, searchParams?.to].filter(Boolean);
  }, [routeInfo, bus, searchParams]);

  const busFeatures = useMemo(() => {
    const source = (Array.isArray(featuresInfo?.amenities) && featuresInfo.amenities.length && featuresInfo.amenities)
      || (Array.isArray(featuresInfo?.features) && featuresInfo.features.length && featuresInfo.features)
      || (Array.isArray(bus?.amenities) ? bus.amenities : []);
    return source.map(amenityLabel).filter(Boolean);
  }, [featuresInfo, bus]);

  const restStops = formatRestStops(featuresInfo, policiesInfo, bus);
  const delayMinutes = getDelayMinutes(featuresInfo) || getDelayMinutes(bus);
  const isDelayed = (getTripStatusValue(featuresInfo) || getTripStatusValue(bus)) === 'DELAYED' || delayMinutes > 0;
  const averageRating = Number(ratingSummary?.averageRating ?? ratingSummary?.avgRating ?? 0);
  const totalRatings = Number(ratingSummary?.totalRatings ?? ratingSummary?.count ?? 0);
  const cancellationLines = formatCancellationLines(policiesInfo);
  const dateChangeLines = formatDateChangeLines(policiesInfo);
  const ruleLines = formatRuleLines(policiesInfo);

  const onToggleSeat = (seatNumber) => {
    if (!selectedSeats.includes(seatNumber) && selectedSeats.length >= MAX_SEATS) {
      toast.error(`You can book up to ${MAX_SEATS} seats at a time`);
      return;
    }
    setSelectedSeats((prev) => (prev.includes(seatNumber) ? prev.filter((seat) => seat !== seatNumber) : [...prev, seatNumber]));
    setLockInfo(null);
    setLockExpiresAt(null);
    setLockSecondsLeft(0);
    setPromoResult(null);
  };

  const updatePassenger = (seatNumber, field, value) => {
    setPassengers((prev) => prev.map((item) => (item.seatNumber === seatNumber ? { ...item, [field]: value } : item)));
  };

  const applyTravelerToSeat = (seatNumber, traveler) => {
    const normalized = normalizeTraveler(traveler);
    setPassengers((prev) => prev.map((item) => (item.seatNumber === seatNumber ? { ...item, ...normalized, seatNumber } : item)));
  };

  const resetTravelerForSeat = (seatNumber) => {
    setPassengers((prev) => prev.map((item) => (item.seatNumber === seatNumber ? createEmptyPassenger(seatNumber) : item)));
  };

  const lockAndContinue = async () => {
    if (!selectedSeats.length) return toast.error('Pick at least one seat');
    if (!scheduleId) return toast.error('This trip is missing its schedule. Please search again.');
    if (lockInfo && lockSecondsLeft > 0) { setStep('points'); return; }
    try {
      setLockingSeats(true);
      const result = await lockScheduleSeats(scheduleId, selectedSeats, travelDate, searchParams?.from || '', searchParams?.to || '');
      setLockInfo(result || null);
      const expiresInMinutes = Number(result?.expiresInMinutes || 15);
      setLockExpiresAt(Date.now() + expiresInMinutes * 60 * 1000);
      setLockSecondsLeft(expiresInMinutes * 60);
      toast.success(`Seats held for ${expiresInMinutes} minutes`);
      setStep('points');
    } catch (e) {
      await refreshSeats();
      setSelectedSeats([]);
      toast.error(e.message || 'Those seats were just taken. Please pick again.');
    } finally {
      setLockingSeats(false);
    }
  };

  const continueFromPoints = () => {
    if (boardingPoints.length > 0 && !selection.boardingPointId) return toast.error('Choose where you’ll board');
    if (droppingPoints.length > 0 && !selection.droppingPointId) return toast.error('Choose where you’ll get off');
    setStep('details');
  };

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const result = await applyPromoCode(promoInput.trim(), seatsTotal);
      setPromoResult(result);
      toast.success(result.message);
    } catch (e) {
      setPromoError(e.message || 'Invalid promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const proceedToPayment = () => {
    const phoneValid = /^[6-9]\d{9}$/.test(contact.phone.trim());
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim());
    if (!passengers.length || passengers.length !== selectedSeats.length) return toast.error('Add traveller details for every seat');
    const incomplete = passengers.find((p) => !p.name.trim() || !p.age || !p.gender);
    if (incomplete) return toast.error(`Fill in the name, age and gender for seat ${incomplete.seatNumber}`);
    const badAge = passengers.find((p) => Number(p.age) < 1 || Number(p.age) > 120);
    if (badAge) return toast.error(`Enter a valid age for seat ${badAge.seatNumber}`);
    const womenOnlyClash = passengers.find((p) => womenOnlySeats.has(p.seatNumber) && p.gender !== 'FEMALE');
    if (womenOnlyClash) {
      return toast.error(womenOnlySeats.get(womenOnlyClash.seatNumber) === 'beside-woman'
        ? `Seat ${womenOnlyClash.seatNumber} is next to a woman traveller, so it can only be booked for a woman. Choose another seat or change the traveller.`
        : `Seat ${womenOnlyClash.seatNumber} is reserved for women`);
    }
    if (!phoneValid) return toast.error('Enter a valid 10-digit mobile number');
    if (!emailValid) return toast.error('Enter a valid email address');
    if (!contact.stateOfResidence.trim()) return toast.error('Select your state of residence');
    if (lockSecondsLeft <= 0) return toast.error('Your seat hold expired. Pick your seats again.');

    // Ticket and trip updates go to the contact details unless a traveller has their own
    const finalPassengers = passengers.map((p) => ({ ...p, phone: p.phone || contact.phone, email: p.email || contact.email }));
    writeStorage(SAVED_CONTACT_KEY, contact, localStorage);
    writeStorage(SAVED_TRAVELERS_KEY, dedupeTravelers([...finalPassengers.map(normalizeTraveler), ...recentTravelers]), localStorage);
    if (localStorage.getItem('accessToken')) {
      finalPassengers.forEach((passenger) => {
        if (!savePassengerFlags[passenger.seatNumber]) return;
        const nameParts = (passenger.name || '').trim().split(' ');
        createSavedPassengerProfile({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          age: passenger.age ? Number(passenger.age) : null,
          gender: passenger.gender || '',
          phone: passenger.phone || '',
        }).catch(() => {});
      });
    }
    navigate(ROUTES.PAYMENT, {
      state: {
        bus, scheduleId, selectedSeats, selectedFare, selectedType, seatFares, searchParams,
        travelDate: searchParams?.date || '', contact, passengers: finalPassengers, selection,
        boardingPoint: boardingPoint || null, droppingPoint: droppingPoint || null,
        lockSecondsLeft, lockExpiresAt, lockToken: lockInfo?.lockToken || '', lockInfo, promoResult,
      },
    });
  };

  if (!bus) {
    return (
      <UserLayout activeItem="search" title="Select seats" showHeaderSearch={false}>
        <section className="rounded-2xl bg-white border border-slate-200/80 p-10 text-center">
          <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[#FDBA74]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-orange-600">directions_bus</span>
          </span>
          <h2 className="text-lg font-black text-slate-900">No bus selected</h2>
          <p className="mt-1 text-sm text-slate-500">Search for a route and pick a bus to choose your seats.</p>
          <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors">
            Search buses
          </button>
        </section>
      </UserLayout>
    );
  }

  const stepIndex = STEPS.indexOf(step);
  const goBack = () => (step === 'seats' ? navigate(-1) : setStep(STEPS[stepIndex - 1]));
  const primaryAction = {
    seats: { label: lockingSeats ? 'Holding seats…' : 'Continue', onClick: lockAndContinue, disabled: lockingSeats || loadingSeats || !selectedSeats.length },
    points: { label: 'Continue', onClick: continueFromPoints, disabled: loadingPoints },
    details: { label: `Proceed to pay ₹${payable.toLocaleString('en-IN')}`, onClick: proceedToPayment, disabled: false },
  }[step];

  const summary = (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-black text-slate-900 truncate">{bus.busName}</p>
              <p className="text-xs text-slate-500 truncate">{[prettyLabel(bus.busType), bus.busNumber].filter(Boolean).join(' · ')}</p>
            </div>
            {totalRatings > 0 && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 rounded-lg bg-green-600 px-2 py-1 text-xs font-black text-white">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                {averageRating.toFixed(1)}
              </span>
            )}
          </div>
          {isDelayed && (
            <p className="mt-3 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              Running late{delayMinutes > 0 ? ` · ${delayMinutes} min` : ''}
            </p>
          )}
        </div>

        <div className="p-5 space-y-4">
          {(boardingPoint || droppingPoint) && (
            <div className="space-y-3">
              {[['Boarding', boardingPoint, 'trip_origin'], ['Dropping', droppingPoint, 'location_on']].filter(([, p]) => p).map(([label, p, icon]) => (
                <div key={label} className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-[#FF8A65] mt-0.5">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                    <p className="text-sm font-bold text-slate-900 truncate">{p.name}</p>
                  </div>
                  {p.arrivalTime && <span className="text-sm font-black text-slate-900">{formatPointTime(p.arrivalTime)}</span>}
                </div>
              ))}
            </div>
          )}

          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              {selectedSeats.length ? `${selectedSeats.length} seat${selectedSeats.length > 1 ? 's' : ''} selected` : 'Your seats'}
            </p>
            {selectedSeats.length === 0 ? (
              <p className="text-sm text-slate-500">Tap a seat on the map to select it.</p>
            ) : (
              <div className="space-y-1.5">
                {seatFares.map((fare) => (
                  <div key={fare.seatNumber} className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-black text-white">{fare.seatNumber}</span>
                      <span className="text-slate-500 truncate">{prettyLabel(seatByNumber.get(fare.seatNumber)?.seatType) || 'Seat'}</span>
                      {womenOnlySeats.has(fare.seatNumber) && <span className="rounded bg-pink-50 px-1.5 py-0.5 text-[10px] font-bold text-pink-600">Women only</span>}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900">₹{Math.round(Number(fare.totalFare || 0)).toLocaleString('en-IN')}</span>
                      {step === 'seats' && (
                        <button onClick={() => onToggleSeat(fare.seatNumber)} aria-label={`Remove seat ${fare.seatNumber}`} className="text-slate-300 hover:text-red-500 transition-colors">
                          <span className="material-symbols-outlined text-[18px]">close</span>
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {step === 'details' && (
            <div className="border-t border-slate-100 pt-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Offers</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                  placeholder="Enter promo code"
                  className={`${INPUT_CLASS} py-2`}
                  disabled={!!promoResult}
                />
                {promoResult ? (
                  <button onClick={() => { setPromoResult(null); setPromoInput(''); setPromoError(''); }} className="rounded-xl border border-slate-200 px-3.5 text-sm font-bold text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors">
                    Remove
                  </button>
                ) : (
                  <button onClick={applyPromo} disabled={promoLoading || !promoInput.trim()} className="rounded-xl border border-primary px-3.5 text-sm font-bold text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-primary">
                    {promoLoading ? '…' : 'Apply'}
                  </button>
                )}
              </div>
              {promoError && <p className="mt-1.5 text-xs text-red-600">{promoError}</p>}
              {promoResult && <p className="mt-1.5 text-xs font-semibold text-green-700">{promoResult.message}</p>}
            </div>
          )}

          {selectedSeats.length > 0 && (
            <div className="border-t border-slate-100 pt-4 space-y-1.5">
              {discount > 0 && (
                <>
                  <div className="flex justify-between text-sm text-slate-500"><span>Seat fare</span><span>₹{seatsTotal.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between text-sm text-green-700"><span>Promo ({promoResult.code})</span><span>−₹{discount.toLocaleString('en-IN')}</span></div>
                </>
              )}
              <div className="flex items-end justify-between">
                <span className="text-sm font-bold text-slate-900">Total</span>
                <span className="text-2xl font-black text-slate-900">₹{payable.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-[11px] text-slate-400">Taxes included</p>
            </div>
          )}

          <button
            onClick={primaryAction.onClick}
            disabled={primaryAction.disabled}
            className="hidden md:flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {primaryAction.label}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </section>

      {step !== 'seats' && (
        <p className="flex items-start gap-2 px-1 text-xs text-slate-500">
          <span className="material-symbols-outlined text-[16px] text-[#FF8A65]">lock_clock</span>
          Your seats are held while the timer runs. Complete payment before it ends.
        </p>
      )}
    </div>
  );

  return (
    <UserLayout activeItem="search" title="Book your seats" showHeaderSearch={false}>
      <div className="space-y-5 pb-20 md:pb-0">
        <CheckoutHeader
          from={searchParams?.from}
          to={searchParams?.to}
          departure={bus.departureTime}
          arrival={bus.arrivalTime}
          busName={bus.busName}
          step={stepIndex}
          onStepClick={(i) => setStep(STEPS[i])}
          onBack={goBack}
          secondsLeft={lockInfo ? lockSecondsLeft : 0}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-5 min-w-0">
            {step === 'seats' && (
              <>
                <Card
                  title="Select your seats"
                  subtitle={seats.length ? `${availableCount} of ${seats.length} available · up to ${MAX_SEATS} per booking` : undefined}
                  icon="event_seat"
                  action={!loadingSeats && (
                    <button onClick={refreshSeats} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-[#FF8A65] transition-colors">
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      Refresh
                    </button>
                  )}
                >
                  {loadingSeatsError && (
                    <p className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{loadingSeatsError}</p>
                  )}
                  {loadingSeats && !seats.length ? (
                    <InlineLoader label="Loading the seat map…" />
                  ) : seats.length === 0 ? (
                    <p className="py-6 text-sm text-slate-500">The seat map for this bus isn’t available yet.</p>
                  ) : (
                    <SeatMap seats={seats} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} priceOf={priceOf} />
                  )}
                </Card>

                <div className="grid gap-5 md:grid-cols-2">
                  <Card title="Amenities & route" icon="directions_bus">
                    {busFeatures.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {busFeatures.map((feature, idx) => (
                          <span key={`${feature}-${idx}`} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                            <span className="material-symbols-outlined text-[14px] text-green-600">check</span>
                            {prettyLabel(feature)}
                          </span>
                        ))}
                      </div>
                    )}
                    <ol className="space-y-0">
                      {routeStops.map((stop, idx) => (
                        <li key={`${stop}-${idx}`} className="flex gap-3">
                          <span className="flex flex-col items-center">
                            <span className={`mt-1 w-2.5 h-2.5 rounded-full ${idx === 0 || idx === routeStops.length - 1 ? 'bg-[#FF8A65]' : 'bg-slate-300'}`} />
                            {idx < routeStops.length - 1 && <span className="w-px flex-1 min-h-[18px] bg-slate-200" />}
                          </span>
                          <span className="pb-3 text-sm font-semibold text-slate-800">{stop}</span>
                        </li>
                      ))}
                    </ol>
                    {restStops && <p className="text-xs text-slate-500"><span className="font-bold text-slate-700">Rest stop:</span> {restStops}</p>}
                  </Card>

                  <Card title="Policies" icon="verified_user">
                    <div className="space-y-4 text-sm text-slate-600">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Cancellation</p>
                        {(cancellationLines.length ? cancellationLines : ['Refunds depend on how early you cancel, as per the TripGo refund policy.']).map((line, idx) => <p key={idx} className="mb-1">{line}</p>)}
                      </div>
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Date change</p>
                        {(dateChangeLines.length ? dateChangeLines : ['Subject to seat availability and the operator’s policy.']).map((line, idx) => <p key={idx} className="mb-1">{line}</p>)}
                      </div>
                      {ruleLines.length > 0 && (
                        <details className="group">
                          <summary className="cursor-pointer list-none text-xs font-bold text-primary hover:text-[#FF8A65]">
                            Other rules <span className="inline-block transition-transform group-open:rotate-180">▾</span>
                          </summary>
                          <div className="mt-2 space-y-1">{ruleLines.map((line, idx) => <p key={idx}>{line}</p>)}</div>
                        </details>
                      )}
                    </div>
                  </Card>
                </div>
              </>
            )}

            {step === 'points' && (
              loadingPoints ? (
                <Card><InlineLoader label="Loading boarding and dropping points…" /></Card>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  {[
                    ['Boarding point', 'Where you’ll get on', 'trip_origin', boardingPoints, 'boardingPointId', searchParams?.from],
                    ['Dropping point', 'Where you’ll get off', 'location_on', droppingPoints, 'droppingPointId', searchParams?.to],
                  ].map(([title, subtitle, icon, list, key, city]) => (
                    <Card key={key} title={title} subtitle={subtitle} icon={icon}>
                      {list.length === 0 ? (
                        <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          No fixed points for this bus — it stops at the main bus stand in <span className="font-bold">{city}</span>.
                        </p>
                      ) : (
                        <div className="space-y-2.5">
                          {list.map((point) => (
                            <PointOption
                              key={point.id}
                              point={point}
                              name={key}
                              checked={String(selection[key]) === String(point.id)}
                              onChange={() => setSelection((prev) => ({ ...prev, [key]: point.id }))}
                            />
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )
            )}

            {step === 'details' && (
              <>
                <Card title="Traveller details" subtitle="Names as on a government ID" icon="group">
                  <div className="space-y-4">
                    {passengers.map((passenger, index) => {
                      const womenOnly = womenOnlySeats.get(passenger.seatNumber);
                      return (
                        <div key={passenger.seatNumber || index} className="rounded-xl border border-slate-200 p-4">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                            <p className="flex items-center gap-2 text-sm font-black text-slate-900">
                              Traveller {index + 1}
                              <span className="rounded-md bg-primary px-2 py-0.5 text-xs text-white">Seat {passenger.seatNumber}</span>
                              {womenOnly && <span className="rounded-md bg-pink-50 px-2 py-0.5 text-[11px] font-bold text-pink-600">Women only</span>}
                            </p>
                            {(recentTravelers.length > 0 || savedProfilesList.length > 0) && (
                              <select
                                value=""
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '__clear__') { resetTravelerForSeat(passenger.seatNumber); return; }
                                  if (val.startsWith('profile:')) {
                                    const profile = savedProfilesList.find((p) => String(p.id) === val.replace('profile:', ''));
                                    if (profile) applyTravelerToSeat(passenger.seatNumber, { name: `${profile.firstName} ${profile.lastName || ''}`.trim(), age: profile.age, gender: profile.gender, phone: profile.phone, email: '' });
                                    return;
                                  }
                                  if (val.startsWith('recent:')) applyTravelerToSeat(passenger.seatNumber, recentTravelers[Number(val.replace('recent:', ''))]);
                                }}
                                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-bold text-primary outline-none focus:border-primary"
                                aria-label={`Fill traveller ${index + 1} from saved travellers`}
                              >
                                <option value="" disabled>Fill from saved…</option>
                                {savedProfilesList.length > 0 && (
                                  <optgroup label="Saved travellers">
                                    {savedProfilesList.map((profile) => (
                                      <option key={`profile-${profile.id}`} value={`profile:${profile.id}`}>{profile.firstName} {profile.lastName || ''}</option>
                                    ))}
                                  </optgroup>
                                )}
                                {recentTravelers.length > 0 && (
                                  <optgroup label="Recent">
                                    {recentTravelers.map((traveler, i) => (
                                      <option key={`recent-${i}`} value={`recent:${i}`}>{normalizeTraveler(traveler).name}</option>
                                    ))}
                                  </optgroup>
                                )}
                                <option value="__clear__">Clear details</option>
                              </select>
                            )}
                          </div>
                          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_110px]">
                            <div>
                              <label className={LABEL_CLASS} htmlFor={`name-${passenger.seatNumber}`}>Full name</label>
                              <input id={`name-${passenger.seatNumber}`} value={passenger.name} autoComplete="name" onChange={(e) => updatePassenger(passenger.seatNumber, 'name', e.target.value)} placeholder="e.g. Priya Sharma" className={INPUT_CLASS} />
                            </div>
                            <div>
                              <label className={LABEL_CLASS} htmlFor={`age-${passenger.seatNumber}`}>Age</label>
                              <input id={`age-${passenger.seatNumber}`} type="number" inputMode="numeric" min="1" max="120" value={passenger.age} onChange={(e) => updatePassenger(passenger.seatNumber, 'age', e.target.value.slice(0, 3))} placeholder="Age" className={INPUT_CLASS} />
                            </div>
                          </div>
                          <div className="mt-4">
                            <p className={LABEL_CLASS}>Gender</p>
                            <div className="inline-flex rounded-xl border border-slate-200 p-1" role="radiogroup" aria-label={`Gender of traveller ${index + 1}`}>
                              {GENDERS.map(([value, label]) => (
                                <button
                                  key={value}
                                  type="button"
                                  role="radio"
                                  aria-checked={passenger.gender === value}
                                  disabled={womenOnly && value !== 'FEMALE'}
                                  onClick={() => updatePassenger(passenger.seatNumber, 'gender', value)}
                                  className={`rounded-lg px-4 py-1.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:text-slate-300 ${
                                    passenger.gender === value ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary'
                                  }`}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                            {womenOnly && (
                              <p className="mt-2 flex items-start gap-1.5 text-xs text-pink-700">
                                <span className="material-symbols-outlined text-[16px]">info</span>
                                {womenOnly === 'beside-woman'
                                  ? 'This seat is next to a woman traveller, so it can only be booked for a woman.'
                                  : 'The operator has reserved this seat for women.'}
                              </p>
                            )}
                          </div>
                          {localStorage.getItem('accessToken') && (
                            <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={!!savePassengerFlags[passenger.seatNumber]}
                                onChange={(e) => setSavePassengerFlags((prev) => ({ ...prev, [passenger.seatNumber]: e.target.checked }))}
                                className="w-4 h-4 rounded accent-[#0B1F3A] cursor-pointer"
                              />
                              <span className="text-xs text-slate-500">Save this traveller for next time</span>
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card title="Contact details" subtitle="Your ticket and trip updates are sent here" icon="contact_mail">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL_CLASS} htmlFor="contact-phone">Mobile number</label>
                      <div className="flex rounded-xl border border-slate-200 bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 transition-all">
                        <span className="flex items-center border-r border-slate-200 px-3 text-sm font-semibold text-slate-500">{contact.countryCode}</span>
                        <input id="contact-phone" value={contact.phone} inputMode="numeric" autoComplete="tel-national" onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) }))} placeholder="10-digit mobile" className="w-full rounded-r-xl border-0 bg-transparent px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:ring-0" />
                      </div>
                    </div>
                    <div>
                      <label className={LABEL_CLASS} htmlFor="contact-email">Email</label>
                      <input id="contact-email" type="email" autoComplete="email" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" className={INPUT_CLASS} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS} htmlFor="contact-state">State of residence <span className="font-normal text-slate-400">(for GST)</span></label>
                      <select id="contact-state" value={contact.stateOfResidence} onChange={(e) => setContact((p) => ({ ...p, stateOfResidence: e.target.value }))} className={INPUT_CLASS}>
                        <option value="">Select state</option>
                        {INDIA_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                      </select>
                    </div>
                  </div>
                  <label className="mt-4 flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 cursor-pointer">
                    <span>
                      <span className="block text-sm font-bold text-slate-900">Trip updates on WhatsApp</span>
                      <span className="block text-xs text-slate-500">Ticket, bus location and delay alerts</span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={contact.whatsappOptIn}
                      onClick={() => setContact((p) => ({ ...p, whatsappOptIn: !p.whatsappOptIn }))}
                      className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${contact.whatsappOptIn ? 'bg-green-600' : 'bg-slate-300'}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${contact.whatsappOptIn ? 'left-[22px]' : 'left-0.5'}`} />
                    </button>
                  </label>
                </Card>
              </>
            )}
          </div>

          <aside className="lg:sticky lg:top-4">{summary}</aside>
        </div>
      </div>

      {/* Phone: total + next step pinned above the tab bar */}
      <div className="md:hidden fixed inset-x-0 bottom-[calc(65px+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-slate-500 truncate">
            {selectedSeats.length ? `Seats ${selectedSeats.join(', ')}` : 'No seats selected'}
          </p>
          <p className="text-lg font-black text-slate-900">₹{payable.toLocaleString('en-IN')}</p>
        </div>
        <button
          onClick={primaryAction.onClick}
          disabled={primaryAction.disabled}
          className="rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {step === 'details' ? 'Proceed to pay' : primaryAction.label}
        </button>
      </div>
    </UserLayout>
  );
};

export default Booking;
