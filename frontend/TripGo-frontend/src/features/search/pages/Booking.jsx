import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { ROUTES } from '../../../shared/constants/routes';
import { INDIA_STATES } from '../../../shared/constants/indiaStates';
import {
  getBusRatingSummary,
  getScheduleFeatures,
  getSchedulePointsForBooking,
  getSchedulePolicies,
  getScheduleRouteStops,
  getScheduleSeats,
  lockScheduleSeats,
} from '../../../api/bookingService';

const seatComparator = (a, b) => String(a.seatNumber || '').localeCompare(String(b.seatNumber || ''), undefined, { numeric: true, sensitivity: 'base' });
const SEATER_COL_MAP = { A: 0, B: 1, C: 2, D: 3 };

const formatDuration = (dep, arr) => {
  if (!dep || !arr) return '--';
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} hr ${m} min`;
};

const formatCountdown = (seconds) => {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, '0');
  const ss = String(safe % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

const formatInstant = (instant) => {
  if (!instant) return '--';
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getTripStatusMeta = (tripStatus, delayMinutes) => {
  const status = String(tripStatus || '').toUpperCase();
  const delay = Number(delayMinutes || 0);
  if (status === 'DELAYED' || delay > 0) return { label: `Delayed${delay > 0 ? ` by ${delay} min` : ''}`, className: 'bg-amber-500/12 text-amber-700 dark:text-amber-200' };
  if (status === 'STARTED') return { label: 'Started', className: 'bg-sky-500/12 text-sky-700 dark:text-sky-200' };
  if (status === 'COMPLETED') return { label: 'Completed', className: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200' };
  return { label: 'On Time', className: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-200' };
};

const stopLabel = (stop) => stop?.name || stop?.stopName || stop?.city || stop?.location || stop?.address || stop?.landmark || '';

const isSeatAvailableForBooking = (seat) => Boolean(seat?.available) && !seat?.isBlocked;

const parseSleeperSeat = (seat) => {
  const match = String(seat.seatNumber || '').trim().toUpperCase().match(/^([LU])(\d+)$/);
  if (!match) return null;
  const deck = match[1] === 'L' ? 'lower' : 'upper';
  const position = Number(match[2]) - 1;
  if (Number.isNaN(position) || position < 0) return null;
  return { ...seat, deck, row: Math.floor(position / 3), col: position % 3 };
};

const parseSeaterSeat = (seat) => {
  const match = String(seat.seatNumber || '').trim().toUpperCase().match(/^(\d+)([A-Z])$/);
  if (!match) return null;
  const row = Number(match[1]) - 1;
  const col = SEATER_COL_MAP[match[2]];
  if (Number.isNaN(row) || row < 0 || col === undefined) return null;
  return { ...seat, row, col };
};

const SeatMarks = ({ seat }) => {
  const marks = [];
  if (seat.isLadiesOnly) marks.push({ text: 'F', className: 'bg-pink-500 text-white' });
  if (seat.isWindow) marks.push({ text: 'W', className: 'bg-blue-500 text-white' });
  if (seat.isAisle) marks.push({ text: 'A', className: 'bg-emerald-500 text-white' });
  if (seat.isBlocked) marks.push({ text: 'X', className: 'bg-red-500 text-white' });
  if (!marks.length) return null;
  return (
    <div className="absolute -top-1 -right-1 flex gap-0.5">
      {marks.map((mark, idx) => (
        <span key={`${mark.text}-${idx}`} className={`h-3 w-3 rounded text-center text-[8px] font-bold leading-3 ${mark.className}`}>{mark.text}</span>
      ))}
    </div>
  );
};

const UserSeaterSeat = ({ seat, selectedSeats, onToggleSeat }) => {
  const isSelected = selectedSeats.includes(seat.seatNumber);
  const isAvailable = isSeatAvailableForBooking(seat);
  return (
    <button
      onClick={() => isAvailable && onToggleSeat(seat.seatNumber)}
      disabled={!isAvailable}
      className="group relative flex flex-col items-center transition-all disabled:cursor-not-allowed"
      style={{ width: 36, height: 44 }}
      title={seat.seatNumber}
    >
      <SeatMarks seat={seat} />
      <div className={`h-2.5 w-6 rounded-t-md border-t-2 border-x-2 ${
        isAvailable ? (isSelected ? 'border-primary bg-primary/30' : 'border-emerald-400/80 bg-emerald-400/20') : 'border-slate-400 bg-slate-300/40 dark:border-slate-500 dark:bg-slate-700/40'
      }`} />
      <div className={`flex h-7 w-8 items-end justify-center rounded-b-lg border-2 border-t-0 pb-0.5 ${
        isAvailable ? (isSelected ? 'border-primary bg-primary/15' : 'border-emerald-400/80 bg-emerald-400/10') : 'border-slate-400 bg-slate-300/30 dark:border-slate-500 dark:bg-slate-700/30'
      }`}>
        <span className={`text-[9px] font-bold ${isAvailable ? (isSelected ? 'text-primary' : 'text-emerald-700 dark:text-emerald-200') : 'text-slate-500 dark:text-slate-300'}`}>{seat.seatNumber}</span>
      </div>
    </button>
  );
};

const UserSleeperSeat = ({ seat, selectedSeats, onToggleSeat }) => {
  const isSelected = selectedSeats.includes(seat.seatNumber);
  const isAvailable = isSeatAvailableForBooking(seat);
  return (
    <button
      onClick={() => isAvailable && onToggleSeat(seat.seatNumber)}
      disabled={!isAvailable}
      className={`group relative flex flex-col items-center justify-between rounded border-2 transition-all disabled:cursor-not-allowed ${
        isAvailable ? (isSelected ? 'border-primary bg-primary/15' : 'border-emerald-400/70 bg-emerald-400/10') : 'border-slate-400 bg-slate-300/30 dark:border-slate-500 dark:bg-slate-700/30'
      }`}
      style={{ width: 30, height: 58, padding: '4px 2px' }}
      title={seat.seatNumber}
    >
      <SeatMarks seat={seat} />
      <div className="h-4 w-5 rounded-sm border border-slate-300 bg-slate-100 dark:border-slate-500 dark:bg-slate-600" />
      <span className={`text-[8px] font-bold leading-none ${isAvailable ? (isSelected ? 'text-primary' : 'text-emerald-700 dark:text-emerald-200') : 'text-slate-500 dark:text-slate-300'}`}>{seat.seatNumber}</span>
    </button>
  );
};

const UserSleeperDeck = ({ deck, seats, selectedSeats, onToggleSeat }) => {
  const deckSeats = seats.filter((seat) => seat.deck === deck);
  const rows = [...new Set(deckSeats.map((seat) => seat.row))].sort((a, b) => a - b);
  return (
    <div className="flex gap-1">
      <div className="flex flex-col gap-1">
        {rows.map((row) => {
          const seat = deckSeats.find((item) => item.row === row && item.col === 0);
          return seat ? <UserSleeperSeat key={seat.seatNumber} seat={seat} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} /> : <div key={`${deck}-${row}-0`} style={{ width: 30, height: 58 }} />;
        })}
      </div>
      <div className="flex flex-col justify-center" style={{ width: 16 }}>
        <div className="w-px bg-slate-300 dark:bg-slate-500/50" style={{ height: rows.length * 58 + (rows.length - 1) * 4 }} />
      </div>
      {[1, 2].map((col) => (
        <div key={`${deck}-${col}`} className="flex flex-col gap-1">
          {rows.map((row) => {
            const seat = deckSeats.find((item) => item.row === row && item.col === col);
            return seat ? <UserSleeperSeat key={seat.seatNumber} seat={seat} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} /> : <div key={`${deck}-${row}-${col}`} style={{ width: 30, height: 58 }} />;
          })}
        </div>
      ))}
    </div>
  );
};

const UserSeaterLayout = ({ seats, selectedSeats, onToggleSeat }) => {
  const rows = [...new Set(seats.map((seat) => seat.row))].sort((a, b) => a - b);
  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const rowSeats = seats.filter((seat) => seat.row === row).sort((a, b) => a.col - b.col);
        const left = rowSeats.filter((seat) => seat.col < 2);
        const right = rowSeats.filter((seat) => seat.col >= 2);
        return (
          <div key={`row-${row}`} className="flex items-center gap-1">
            <div className="flex gap-1">{left.map((seat) => <UserSeaterSeat key={seat.seatNumber} seat={seat} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />)}</div>
            <div className="flex w-6 items-center justify-center"><div className="h-8 w-px bg-slate-300 dark:bg-slate-500/50" /></div>
            <div className="flex gap-1">{right.map((seat) => <UserSeaterSeat key={seat.seatNumber} seat={seat} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />)}</div>
          </div>
        );
      })}
    </div>
  );
};

const pointLabel = (point) => [point.arrivalTime, point.name, point.landmark, point.address].filter(Boolean).join(' • ');

const formatCancellationLines = (policy) => {
  if (!Array.isArray(policy?.cancellation)) return [];
  return policy.cancellation.map((item) => `${item?.label || `Before ${item?.hoursBeforeDeparture ?? 0} hrs`}: ${item?.refundPercent ?? 0}% refund`);
};

const formatDateChangeLines = (policy) => {
  const dateChange = policy?.dateChange;
  if (!dateChange || typeof dateChange !== 'object') return [];
  if (!dateChange.allowed) return ['Date change is not allowed for this schedule.'];
  return [`Date change allowed up to ${dateChange.minHoursBeforeDeparture ?? 0} hrs before departure with ${dateChange.feePercent ?? 0}% fee.`];
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

const formatRestStopText = (featuresInfo, policiesInfo, bus) => {
  if (Array.isArray(featuresInfo?.restStops) && featuresInfo.restStops.length) {
    return featuresInfo.restStops.map((stop) => `${stop.name}${stop.location ? `, ${stop.location}` : ''}${stop.durationMinutes ? ` · ${stop.durationMinutes} mins` : ''}`).join(' | ');
  }
  if (Array.isArray(policiesInfo?.restStops) && policiesInfo.restStops.length) {
    return policiesInfo.restStops.map((stop) => `${stop.name}${stop.location ? `, ${stop.location}` : ''}${stop.durationMinutes ? ` · ${stop.durationMinutes} mins` : ''}`).join(' | ');
  }
  return featuresInfo?.restStopName || (featuresInfo?.hasRestStop === false ? 'This bus has no rest stop' : bus?.restStopName || 'This bus has no rest stop');
};

const INPUT_SHELL_CLASS = 'w-full rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none ring-1 ring-slate-200/70 focus:ring-2 focus:ring-primary dark:bg-white/[0.04] dark:text-white dark:ring-white/10';
const SUBTLE_PANEL_CLASS = 'rounded-2xl bg-slate-50 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10';
const SOFT_BUTTON_CLASS = 'rounded-xl bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200 dark:bg-white/[0.05] dark:text-slate-200 dark:hover:bg-white/[0.09]';

const DetailCard = ({ icon, title, subtitle, children, className = '' }) => (
  <div className={`rounded-[30px] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(180deg,rgba(12,12,12,0.96)_0%,rgba(6,6,6,0.98)_100%)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.45)] dark:ring-white/10 ${className}`}>
    <div className="mb-4 flex items-start gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 dark:bg-white/[0.05]">
        <span className="material-symbols-outlined text-primary">{icon}</span>
      </div>
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
    </div>
    {children}
  </div>
);

const Booking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { bus, selectedType, selectedFare, searchParams } = location.state || {};
  const scheduleId = bus?.scheduleId;

  const [step, setStep] = useState('seats');
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [seatsResponse, setSeatsResponse] = useState(null);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [loadingSeatsError, setLoadingSeatsError] = useState('');
  const [lockInfo, setLockInfo] = useState(null);
  const [lockingSeats, setLockingSeats] = useState(false);
  const [lockExpiresAt, setLockExpiresAt] = useState(null);
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  const [points, setPoints] = useState({ boardingPoints: [], droppingPoints: [] });
  const [loadingPoints, setLoadingPoints] = useState(false);
  const [selection, setSelection] = useState({ boardingPointId: '', droppingPointId: '' });
  const [contact, setContact] = useState({ countryCode: '+91', phone: '', email: '', stateOfResidence: '', whatsappOptIn: false });
  const [passenger, setPassenger] = useState({ name: '', age: '', gender: '', phone: '', email: '' });
  const [routeInfo, setRouteInfo] = useState(null);
  const [policiesInfo, setPoliciesInfo] = useState(null);
  const [featuresInfo, setFeaturesInfo] = useState(null);
  const [ratingSummary, setRatingSummary] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  useEffect(() => {
    if (!scheduleId) return;
    const fetchSeats = async () => {
      setLoadingSeats(true);
      setLoadingSeatsError('');
      try {
        setSeatsResponse(await getScheduleSeats(scheduleId));
      } catch (e) {
        setLoadingSeatsError(e.message || 'Failed to load seats');
      } finally {
        setLoadingSeats(false);
      }
    };
    fetchSeats();
  }, [scheduleId]);

  useEffect(() => {
    if (step !== 'details' || !scheduleId) return;
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
      if (left <= 0) setStep('seats');
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [lockExpiresAt]);

  useEffect(() => {
    if (!scheduleId) return;
    let isMounted = true;
    const fetchScheduleMeta = async () => {
      setLoadingMeta(true);
      try {
        const [routeRes, policyRes, featureRes, ratingRes] = await Promise.allSettled([
          getScheduleRouteStops(scheduleId),
          getSchedulePolicies(scheduleId),
          getScheduleFeatures(scheduleId),
          bus?.id ? getBusRatingSummary(bus.id) : Promise.resolve(null),
        ]);
        if (!isMounted) return;
        if (routeRes.status === 'fulfilled') setRouteInfo(routeRes.value);
        if (policyRes.status === 'fulfilled') setPoliciesInfo(policyRes.value);
        if (featureRes.status === 'fulfilled') setFeaturesInfo(featureRes.value);
        if (ratingRes.status === 'fulfilled') setRatingSummary(ratingRes.value);
      } finally {
        if (isMounted) setLoadingMeta(false);
      }
    };
    fetchScheduleMeta();
    return () => { isMounted = false; };
  }, [scheduleId, bus?.id]);

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

  const isSleeper = useMemo(() => {
    if (seats.some((seat) => String(seat.seatType || '').toUpperCase().includes('SLEEPER'))) return true;
    return String(bus?.busType || '').includes('SLEEPER') && !String(bus?.busType || '').includes('SEMI');
  }, [seats, bus]);

  const parsedLayoutSeats = useMemo(() => {
    if (!seats.length) return [];
    const parser = isSleeper ? parseSleeperSeat : parseSeaterSeat;
    return seats.map(parser).filter(Boolean).sort((a, b) => (a.row - b.row) || (a.col - b.col) || String(a.seatNumber).localeCompare(String(b.seatNumber), undefined, { numeric: true }));
  }, [seats, isSleeper]);

  const boardingPoints = points.boardingPoints || [];
  const droppingPoints = points.droppingPoints || [];
  const selectedSeatSet = useMemo(() => new Set(selectedSeats), [selectedSeats]);
  const baseAvailableSeatCount = useMemo(() => seats.filter(isSeatAvailableForBooking).length, [seats]);
  const remainingAvailableSeatCount = Math.max(0, baseAvailableSeatCount - selectedSeats.length);
  const blockedSeatCount = useMemo(() => seats.filter((seat) => seat.isBlocked).length, [seats]);
  const bookedSeatCount = useMemo(() => seats.filter((seat) => !seat.isBlocked && !seat.available).length, [seats]);
  const hasLayoutData = parsedLayoutSeats.length === seats.length;

  const routeStops = useMemo(() => {
    if (Array.isArray(routeInfo?.stops) && routeInfo.stops.length) return routeInfo.stops.map(stopLabel).filter(Boolean);
    if (Array.isArray(routeInfo?.routeStops) && routeInfo.routeStops.length) return routeInfo.routeStops.map(stopLabel).filter(Boolean);
    if (Array.isArray(routeInfo) && routeInfo.length) return routeInfo.map(stopLabel).filter(Boolean);
    if (Array.isArray(bus?.routeStops) && bus.routeStops.length) return bus.routeStops;
    return [searchParams?.from, searchParams?.to].filter(Boolean);
  }, [routeInfo, bus, searchParams]);

  const busFeatures = useMemo(() => {
    if (Array.isArray(featuresInfo?.amenities) && featuresInfo.amenities.length) return featuresInfo.amenities;
    if (Array.isArray(featuresInfo?.features) && featuresInfo.features.length) return featuresInfo.features;
    const amenities = Array.isArray(bus?.amenities) ? bus.amenities : [];
    return amenities.length ? amenities : ['Charging Point', 'Reading Light'];
  }, [featuresInfo, bus]);

  const routeDistanceKm = routeInfo?.distanceKm || routeInfo?.distance || bus?.distanceKm || 487;
  const routeDuration = routeInfo?.duration || (routeInfo?.durationMinutes ? `${Math.floor(routeInfo.durationMinutes / 60)} hr ${routeInfo.durationMinutes % 60} min` : formatDuration(bus?.departureTime, bus?.arrivalTime));
  const restStopText = formatRestStopText(featuresInfo, policiesInfo, bus);
  const tripStatusMeta = getTripStatusMeta(featuresInfo?.tripStatus || bus?.tripStatus, featuresInfo?.delayMinutes ?? bus?.delayMinutes);
  const averageRating = Number(ratingSummary?.averageRating ?? ratingSummary?.avgRating ?? 0);
  const totalRatings = Number(ratingSummary?.totalRatings ?? ratingSummary?.count ?? 0);
  const cancellationLines = formatCancellationLines(policiesInfo);
  const dateChangeLines = formatDateChangeLines(policiesInfo);
  const otherPolicyLines = formatRuleLines(policiesInfo).length ? formatRuleLines(policiesInfo) : [
    'Children: Children above the age of 5 will need a ticket.',
    'Luggage: 2 pieces of luggage accepted free of charge per passenger. Excess baggage over 20 kgs is chargeable.',
    'Pets: Pets are not allowed.',
    'Liquor: Carrying or consuming liquor inside the bus is prohibited.',
    'Pickup: Operator is not obligated to wait beyond scheduled departure time.',
  ];

  const onToggleSeat = (seatNumber) => {
    setSelectedSeats((prev) => (prev.includes(seatNumber) ? prev.filter((seat) => seat !== seatNumber) : [...prev, seatNumber]));
    setLockInfo(null);
    setLockExpiresAt(null);
    setLockSecondsLeft(0);
  };

  if (!bus) {
    return (
      <UserLayout activeItem="search" title="Select Seat">
        <div className="rounded-3xl bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-black dark:text-slate-100 dark:ring-slate-900">
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">No bus selected. Please search and choose a bus first.</p>
          <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className="rounded-xl bg-primary px-4 py-2 font-semibold text-black">Back to Search</button>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout activeItem="search" title="Booking Flow">
      <div className="space-y-6 bg-[linear-gradient(180deg,#f7fbff_0%,#eef4ff_100%)] p-4 text-slate-900 dark:bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.14),transparent_0%,transparent_32%),linear-gradient(180deg,#040404_0%,#0b0b0b_100%)] dark:text-slate-100 md:rounded-[32px] md:p-6">
        <div className="grid gap-4 xl:grid-cols-[1.65fr_0.9fr]">
          <div className="rounded-[30px] bg-[linear-gradient(135deg,#ffffff,#f4f8ff)] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-[linear-gradient(135deg,rgba(9,9,9,0.96),rgba(17,17,17,0.92))] dark:shadow-[0_30px_70px_rgba(0,0,0,0.45)] dark:ring-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary/80">Trip Summary</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{bus.busName}</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{searchParams?.from} to {searchParams?.to} · {selectedType || 'Seat'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tripStatusMeta.className}`}>{tripStatusMeta.label}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{routeDuration}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">{routeDistanceKm} km</span>
                  {totalRatings > 0 ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">⭐ {averageRating.toFixed(1)} · {totalRatings} ratings</span> : null}
                </div>
              </div>
              <div className="rounded-3xl bg-slate-100 px-5 py-4 text-right dark:bg-white/[0.04] dark:ring-1 dark:ring-white/10">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Fare</p>
                <p className="mt-1 text-3xl font-black text-primary">₹{selectedFare ? Math.round(selectedFare.totalFare) : '--'}</p>
                {!!selectedSeats.length ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">{selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} selected</p> : null}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {[
                ['Departure', formatInstant(bus?.departureTime)],
                ['Arrival', formatInstant(bus?.arrivalTime)],
                ['Step', step === 'seats' ? '1. Select & lock seats' : '2. Passenger & points'],
              ].map(([label, value]) => (
                <div key={label} className={`${SUBTLE_PANEL_CLASS} p-4`}>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            {loadingMeta ? <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">Updating route and policy details...</p> : null}
          </div>

          <div className="rounded-[30px] bg-[linear-gradient(180deg,#eaf7ff,rgba(255,255,255,0.9))] p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-sky-100 dark:bg-[linear-gradient(180deg,rgba(12,18,30,0.95)_0%,rgba(7,7,7,0.98)_100%)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.45)] dark:ring-sky-500/20">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Seat Lock</p>
                <h3 className="mt-2 text-lg font-black text-slate-900 dark:text-white">Payment timer</h3>
              </div>
              <span className="material-symbols-outlined text-3xl text-primary">timer</span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {lockInfo && lockSecondsLeft > 0
                ? <>Make payment within <span className="font-black text-slate-900 dark:text-white">{formatCountdown(lockSecondsLeft)}</span> or the seat lock will expire.</>
                : 'Select your seats and lock them to start the payment countdown.'}
            </p>
            <div className="mt-5 rounded-2xl bg-white/80 p-4 ring-1 ring-slate-200/70 dark:bg-white/[0.04] dark:ring-white/10">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Available now</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-300">{remainingAvailableSeatCount}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-2 rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all" style={{ width: `${seats.length ? Math.max(10, (remainingAvailableSeatCount / seats.length) * 100) : 10}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] text-slate-600 dark:text-slate-300">
                <div className="rounded-xl bg-slate-100 px-2 py-2 dark:bg-white/[0.04]">{remainingAvailableSeatCount}<div className="text-slate-500">free</div></div>
                <div className="rounded-xl bg-slate-100 px-2 py-2 dark:bg-white/[0.04]">{bookedSeatCount}<div className="text-slate-500">booked</div></div>
                <div className="rounded-xl bg-slate-100 px-2 py-2 dark:bg-white/[0.04]">{blockedSeatCount}<div className="text-slate-500">blocked</div></div>
              </div>
            </div>
          </div>
        </div>

        {step === 'seats' && (
          <DetailCard icon="event_seat" title="Choose your seats" subtitle="Blocked and already booked seats are excluded from available count.">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Available</span>
                <span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">Selected</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600 dark:bg-slate-700/30 dark:text-slate-300">Booked</span>
                <span className="rounded-full bg-red-50 px-3 py-1.5 text-red-700 dark:bg-red-500/10 dark:text-red-300">Blocked</span>
              </div>
              <div className="text-right text-sm">
                <p className="text-slate-500 dark:text-slate-400">Available seats</p>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-300">{remainingAvailableSeatCount}<span className="ml-1 text-sm font-semibold text-slate-500">/ {seats.length}</span></p>
              </div>
            </div>
            {loadingSeatsError ? <p className="mb-3 text-sm text-red-500">{loadingSeatsError}</p> : null}
            {loadingSeats ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Loading seats...</p>
            ) : seats.length === 0 ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">Seat layout is not available for this bus yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:ring-white/10">
                {hasLayoutData ? (
                  isSleeper ? (
                    <div className="flex gap-8">
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Lower Deck</p>
                        <UserSleeperDeck deck="lower" seats={parsedLayoutSeats} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />
                      </div>
                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-500">Upper Deck</p>
                        <UserSleeperDeck deck="upper" seats={parsedLayoutSeats} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />
                      </div>
                    </div>
                  ) : (
                    <UserSeaterLayout seats={parsedLayoutSeats} selectedSeats={selectedSeats} onToggleSeat={onToggleSeat} />
                  )
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
                    {seats.map((seat) => {
                      const isSelected = selectedSeatSet.has(seat.seatNumber);
                      const isAvailable = isSeatAvailableForBooking(seat);
                      return (
                        <button
                          key={seat.seatNumber}
                          disabled={!isAvailable}
                          onClick={() => isAvailable && onToggleSeat(seat.seatNumber)}
                          className={`rounded-2xl px-2 py-3 text-xs font-semibold ring-1 transition-colors ${
                            isAvailable
                              ? isSelected
                                ? 'bg-primary/15 text-primary ring-primary/30'
                                : 'bg-emerald-50 text-emerald-700 ring-emerald-200 hover:ring-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20'
                              : seat.isBlocked
                                ? 'cursor-not-allowed bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-200 dark:ring-red-500/20'
                                : 'cursor-not-allowed bg-slate-100 text-slate-500 ring-slate-200 dark:bg-slate-700/30 dark:text-slate-300 dark:ring-slate-700'
                          }`}
                        >
                          <div className="leading-tight">
                            <div>{seat.seatNumber}</div>
                            <div className="text-[9px]">{isAvailable ? 'Available' : seat.isBlocked ? 'Blocked' : 'Booked'}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <button onClick={() => navigate(-1)} className={SOFT_BUTTON_CLASS}>Back</button>
              <button
                onClick={async () => {
                  if (!selectedSeats.length) return toast.error('Please select seat(s)');
                  if (!scheduleId) return toast.error('Schedule ID missing for this bus');
                  try {
                    setLockingSeats(true);
                    const result = await lockScheduleSeats(scheduleId, selectedSeats);
                    setLockInfo(result || null);
                    const expiresInMinutes = Number(result?.expiresInMinutes || 15);
                    setLockExpiresAt(Date.now() + expiresInMinutes * 60 * 1000);
                    setLockSecondsLeft(expiresInMinutes * 60);
                    toast.success(`Seats locked. Complete payment within ${result?.expiresInMinutes || 15} minutes to confirm booking.`);
                    setStep('details');
                  } catch (e) {
                    toast.error(e.message || 'Failed to lock seats');
                  } finally {
                    setLockingSeats(false);
                  }
                }}
                disabled={lockingSeats || loadingSeats}
                className="rounded-xl bg-primary px-4 py-2 font-semibold text-black hover:bg-primary/90 disabled:opacity-60"
              >
                {lockingSeats ? 'Locking...' : 'Continue'}
              </button>
            </div>
          </DetailCard>
        )}

        {step === 'details' && (
          <div className="grid gap-6 xl:grid-cols-[1.5fr_0.85fr]">
            <div className="space-y-6">
              <DetailCard icon="contact_mail" title="Passenger & contact details" subtitle="This is the same info used for tickets, GST details, and trip updates.">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Country Code</label>
                    <div className={`flex items-center gap-2 px-3 py-2 text-sm text-slate-500 dark:text-slate-300 ${SUBTLE_PANEL_CLASS}`}>
                      <span className="material-symbols-outlined text-base text-slate-400 dark:text-slate-500">lock</span>
                      <input value={contact.countryCode} readOnly className="w-full bg-transparent outline-none" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Phone *</label>
                    <input value={contact.phone} onChange={(e) => setContact((p) => ({ ...p, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) }))} placeholder="10-digit mobile number" className={INPUT_SHELL_CLASS} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Email ID *</label>
                    <input type="email" value={contact.email} onChange={(e) => setContact((p) => ({ ...p, email: e.target.value }))} placeholder="Enter email id" className={INPUT_SHELL_CLASS} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">State of Residence *</label>
                    <select value={contact.stateOfResidence} onChange={(e) => setContact((p) => ({ ...p, stateOfResidence: e.target.value }))} className={INPUT_SHELL_CLASS}>
                      <option value="">Select state</option>
                      {INDIA_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                    </select>
                  </div>
                </div>

                <div className={`mt-5 flex items-center justify-between px-4 py-3 ${SUBTLE_PANEL_CLASS}`}>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Send booking details and trip updates on WhatsApp</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Disabled by default. Turn it on only if the traveler wants WhatsApp alerts.</p>
                  </div>
                  <button type="button" onClick={() => setContact((p) => ({ ...p, whatsappOptIn: !p.whatsappOptIn }))} className={`relative h-7 w-14 rounded-full transition ${contact.whatsappOptIn ? 'bg-primary' : 'bg-slate-400 dark:bg-slate-600'}`} aria-pressed={contact.whatsappOptIn}>
                    <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${contact.whatsappOptIn ? 'left-8' : 'left-1'}`} />
                  </button>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div><label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Passenger Name *</label><input value={passenger.name} onChange={(e) => setPassenger((p) => ({ ...p, name: e.target.value }))} placeholder="Enter passenger name" className={INPUT_SHELL_CLASS} /></div>
                  <div><label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Age *</label><input type="number" min="1" value={passenger.age} onChange={(e) => setPassenger((p) => ({ ...p, age: e.target.value }))} placeholder="Enter age" className={INPUT_SHELL_CLASS} /></div>
                  <div><label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Gender *</label><select value={passenger.gender} onChange={(e) => setPassenger((p) => ({ ...p, gender: e.target.value }))} className={INPUT_SHELL_CLASS}><option value="">Select gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></div>
                  <div><label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Phone *</label><input value={passenger.phone} onChange={(e) => setPassenger((p) => ({ ...p, phone: e.target.value.replace(/[^\d]/g, '').slice(0, 10) }))} placeholder="Enter phone number" className={INPUT_SHELL_CLASS} /></div>
                  <div className="md:col-span-2"><label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Email *</label><input type="email" value={passenger.email} onChange={(e) => setPassenger((p) => ({ ...p, email: e.target.value }))} placeholder="Enter email" className={INPUT_SHELL_CLASS} /></div>
                </div>
              </DetailCard>

              <DetailCard icon="alt_route" title="Boarding & dropping" subtitle="Pickup and drop points fetched for this schedule.">
                {loadingPoints ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">Loading boarding/dropping points...</p>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div><label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Boarding Point *</label><select value={selection.boardingPointId} onChange={(e) => setSelection((p) => ({ ...p, boardingPointId: e.target.value }))} className={INPUT_SHELL_CLASS}><option value="">Select boarding point</option>{boardingPoints.map((point) => <option key={point.id} value={point.id}>{pointLabel(point)}</option>)}</select></div>
                      <div><label className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Dropping Point *</label><select value={selection.droppingPointId} onChange={(e) => setSelection((p) => ({ ...p, droppingPointId: e.target.value }))} className={INPUT_SHELL_CLASS}><option value="">Select dropping point</option>{droppingPoints.map((point) => <option key={point.id} value={point.id}>{pointLabel(point)}</option>)}</select></div>
                    </div>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className={`${SUBTLE_PANEL_CLASS} p-4`}><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Boarding points</p>{boardingPoints.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">No boarding points available</p> : boardingPoints.map((point) => <p key={point.id} className="mb-2 text-xs text-slate-600 dark:text-slate-300">{pointLabel(point)}</p>)}</div>
                      <div className={`${SUBTLE_PANEL_CLASS} p-4`}><p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Dropping points</p>{droppingPoints.length === 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">No dropping points available</p> : droppingPoints.map((point) => <p key={point.id} className="mb-2 text-xs text-slate-600 dark:text-slate-300">{pointLabel(point)}</p>)}</div>
                    </div>
                  </>
                )}
              </DetailCard>
            </div>

            <div className="space-y-6">
              <DetailCard icon="confirmation_number" title="Review before payment" subtitle="A quick final check before moving to the payment screen.">
                <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <div className={`${SUBTLE_PANEL_CLASS} flex items-center justify-between px-4 py-3`}><span>Selected seats</span><span className="font-bold text-slate-900 dark:text-white">{selectedSeats.join(', ') || '--'}</span></div>
                  <div className={`${SUBTLE_PANEL_CLASS} flex items-center justify-between px-4 py-3`}><span>Seat fare</span><span className="font-bold text-slate-900 dark:text-white">₹{selectedFare ? Math.round(selectedFare.totalFare) : '--'}</span></div>
                  <div className="rounded-2xl bg-primary/10 px-4 py-4 dark:bg-primary/12 dark:ring-1 dark:ring-primary/20">
                    <p className="text-xs uppercase tracking-[0.2em] text-primary/90">Payment timer</p>
                    <p className="mt-2 text-xl font-black text-slate-900 dark:text-white">{lockSecondsLeft > 0 ? formatCountdown(lockSecondsLeft) : 'Expired'}</p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Make payment within the timer window or the seat lock will expire.</p>
                  </div>
                </div>
                <div className="mt-5 flex gap-3">
                  <button onClick={() => setStep('seats')} className={`flex-1 ${SOFT_BUTTON_CLASS}`}>Back to Seats</button>
                  <button
                    onClick={() => {
                      const phoneValid = /^[6-9]\d{9}$/.test(contact.phone.trim());
                      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email.trim());
                      if (!phoneValid) return toast.error('Enter a valid 10-digit phone number');
                      if (!emailValid) return toast.error('Enter a valid email address');
                      if (!contact.stateOfResidence.trim()) return toast.error('State of residence is required');
                      if (!passenger.name.trim() || !passenger.age || !passenger.gender || !passenger.phone.trim() || !passenger.email.trim()) return toast.error('Please fill passenger details');
                      if (lockSecondsLeft <= 0) return toast.error('Seat lock expired. Please select and lock seats again.');
                      if (boardingPoints.length + droppingPoints.length > 0 && (!selection.boardingPointId || !selection.droppingPointId)) return toast.error('Please select boarding and dropping points');
                      navigate(ROUTES.PAYMENT, { state: { bus, scheduleId, selectedSeats, selectedFare, selectedType, searchParams, contact, passenger, selection, lockSecondsLeft, lockToken: lockInfo?.lockToken || '', lockInfo } });
                    }}
                    className="flex-1 rounded-xl bg-primary px-4 py-2 font-semibold text-black hover:bg-primary/90"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </DetailCard>
            </div>
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-3">
          <DetailCard icon="route" title="Bus route" subtitle={`${routeDistanceKm} km · ${routeDuration}`} className="xl:col-span-1">
            <div className="space-y-3">
              {routeStops.map((stop, idx) => (
                <div key={`${stop}-${idx}`} className="flex items-start gap-3">
                  <div className="mt-0.5 flex flex-col items-center">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    {idx < routeStops.length - 1 ? <div className="mt-1 h-10 w-px bg-slate-300 dark:bg-white/15" /> : null}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{stop}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{idx === 0 ? 'Boarding origin' : idx === routeStops.length - 1 ? 'Final stop' : `Stop ${idx + 1}`}</p>
                  </div>
                </div>
              ))}
            </div>
          </DetailCard>

          <DetailCard icon="verified_user" title="Cancellation & date change" subtitle="Rules visible to travelers before they pay." className="xl:col-span-1">
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Cancellation</p>
                {(cancellationLines.length ? cancellationLines : ['Cancellation charges may vary based on cancellation time and operator rules. Refund, if eligible, will be processed as per platform T&C.']).map((line, idx) => <p key={`cancel-${idx}`} className="mb-2 text-sm text-slate-600 dark:text-slate-300">{line}</p>)}
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Date change</p>
                {(dateChangeLines.length ? dateChangeLines : ['Date change is subject to seat availability and operator policy. Fare difference and applicable reschedule charges may apply.']).map((line, idx) => <p key={`date-${idx}`} className="mb-2 text-sm text-slate-600 dark:text-slate-300">{line}</p>)}
              </div>
            </div>
          </DetailCard>

          <div className="space-y-6 xl:col-span-1">
            <DetailCard icon="star" title="Bus features" subtitle={restStopText}>
              <div className="grid grid-cols-1 gap-2">
                {busFeatures.map((feature, idx) => (
                  <div key={`${feature}-${idx}`} className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-200/70 dark:bg-white/[0.03] dark:text-slate-300 dark:ring-white/10">
                    <span className="material-symbols-outlined text-base text-primary">check_circle</span>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </DetailCard>
            <DetailCard icon="policy" title="Other policies" subtitle="Additional rider instructions and restrictions.">
              {otherPolicyLines.map((line, idx) => <p key={`other-policy-${idx}`} className="mb-2 text-sm text-slate-600 dark:text-slate-300">{line}</p>)}
            </DetailCard>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default Booking;
