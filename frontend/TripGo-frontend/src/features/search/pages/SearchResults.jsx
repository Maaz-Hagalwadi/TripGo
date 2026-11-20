import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { searchBuses } from '../../../api/busService';
import { getScheduleFeatures, getBusRatingSummary } from '../../../api/bookingService';
import { getPublicSchedulePoints } from '../../../api/travellerFeaturesService';
import { getSavedRoutes, saveRoute, unsaveRoute } from '../../../api/savedRoutesService';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import UserLayout from '../../../shared/components/UserLayout';
import Header from '../../../shared/components/layout/Header';
import Footer from '../../../shared/components/layout/Footer';
import SearchBar from '../../../shared/components/ui/SearchBar';
import { localDateString } from '../../../shared/utils/date';
import PaginationControls from '../../../shared/components/ui/PaginationControls';
import {
  formatIstTime,
  getIstHours,
  istDayDiff,
  getAvailableSeatCount,
  getDelayMinutes,
  projectScheduleToSearchDate,
  getTripStatusValue,
  isSeatAvailableForBooking,
  shouldShowBusForSearch,
} from '../../../shared/utils/scheduleSearchUtils';

const DEPARTURE_SLOTS = [
  { label: 'Morning', range: '6am – 12pm', icon: 'wb_twilight', start: 6, end: 12 },
  { label: 'Afternoon', range: '12pm – 6pm', icon: 'light_mode', start: 12, end: 18 },
  { label: 'Night', range: '6pm – 12am', icon: 'dark_mode', start: 18, end: 24 },
];

const ARRIVAL_SLOTS = DEPARTURE_SLOTS;

const MIN_SEATS_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '1+', value: 1 },
  { label: '3+', value: 3 },
  { label: '5+', value: 5 },
];

const SORT_OPTIONS = [
  { value: 'cheapest', label: 'Cheapest' },
  { value: 'earliest', label: 'Earliest' },
  { value: 'latest', label: 'Latest' },
];

const AMENITY_OPTIONS = ['WiFi', 'USB Port', 'Meal', 'Blanket', 'AC'];
const PAGE_SIZE = 10;

const formatTime = (instant) => formatIstTime(instant);

const formatDuration = (dep, arr) => {
  if (!dep || !arr) return '--';
  const mins = Math.max(0, Math.round((new Date(arr) - new Date(dep)) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
};

/** Times are shown in IST, so day changes are counted in IST too. */
const daysLater = (dep, arr) => istDayDiff(dep, arr);

const minFare = (faresByType) => {
  if (!faresByType) return 0;
  const vals = Object.values(faresByType).map(f => f.totalFare);
  return vals.length ? Math.min(...vals) : 0;
};

/** "VOLVO_SLEEPER" → "Volvo Sleeper", "AC" stays "AC" */
const prettyLabel = (value) => String(value || '')
  .split(/[_\s]+/)
  .filter(Boolean)
  .map((w) => (w.length <= 3 && w === w.toUpperCase() ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
  .join(' ');

const AMENITY_ICONS = { wifi: 'wifi', ac: 'ac_unit', charger: 'power', usb: 'usb', water: 'water_drop', blanket: 'bed', meal: 'restaurant', snacks: 'cookie', tv: 'tv', light: 'light' };
const amenityIcon = (a) => {
  const key = Object.keys(AMENITY_ICONS).find((k) => a.toLowerCase().includes(k));
  return key ? AMENITY_ICONS[key] : 'check_circle';
};

const mergeTripStatus = (busStatus, featureStatus, busDelayMinutes, featureDelayMinutes) => {
  const busState = String(busStatus || '').toUpperCase();
  const featureState = String(featureStatus || '').toUpperCase();
  const busDelay = Number(busDelayMinutes || 0);
  const featureDelay = Number(featureDelayMinutes || 0);

  if (busState === 'COMPLETED' || featureState === 'COMPLETED') return 'COMPLETED';
  if (busState === 'DELAYED' || featureState === 'DELAYED' || busDelay > 0 || featureDelay > 0) return 'DELAYED';
  if (busState === 'STARTED' || featureState === 'STARTED') return 'STARTED';
  return featureState || busState || 'SCHEDULED';
};

const normalizeAmenityCodes = (amenities) => {
  if (!Array.isArray(amenities)) return [];
  return amenities
    .map((item) => {
      if (typeof item === 'string') return item;
      return item?.code || item?.name || item?.description || '';
    })
    .filter(Boolean);
};

const normalizeSearchBus = (item) => {
  const busInfo = item?.bus || {};
  const routeInfo = item?.route || {};
  return {
    ...item,
    id: item?.busId || busInfo?.id || item?.id || '',
    scheduleId: item?.scheduleId || item?.id || '',
    busId: item?.busId || busInfo?.id || '',
    busName: item?.busName || busInfo?.name || 'Bus',
    busCode: item?.busCode || busInfo?.busCode || '',
    busType: item?.busType || busInfo?.busType || '',
    operatorName: item?.operatorName || item?.operator?.name || item?.travelsName || '',
    amenities: normalizeAmenityCodes(item?.amenities?.length ? item.amenities : busInfo?.amenities),
    route: routeInfo,
    fromCity: item?.fromCity || routeInfo?.origin || '',
    toCity: item?.toCity || routeInfo?.destination || '',
  };
};

const normalizeCityLabel = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const SEARCH_DRAFT_STORAGE_KEY = 'tripgo_search_draft';

const isSoldOut = (bus) => {
  const totalSeats = Number(bus?.totalSeats ?? 0);
  const availableSeats = Number(bus?.availableSeats ?? bus?.availableSeatCount ?? 0);
  const seatAvailability = Array.isArray(bus?.seatAvailability) ? bus.seatAvailability : [];
  // Only truly sold out if totalSeats is known (>0) and available is 0
  if (totalSeats > 0 && availableSeats === 0) return true;
  // Or if seatAvailability is populated and none are available
  if (seatAvailability.length > 0 && seatAvailability.filter(isSeatAvailableForBooking).length === 0) return true;
  return false;
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const shiftDate = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00`);
  d.setDate(d.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDayChip = (ymd) => {
  const d = new Date(`${ymd}T00:00:00`);
  return {
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    day: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  };
};

// One request per bus, shared by every card for that bus (a bus can run several schedules a day)
const ratingCache = new Map();
const loadRating = (busId) => {
  if (!ratingCache.has(busId)) ratingCache.set(busId, getBusRatingSummary(busId).catch(() => null));
  return ratingCache.get(busId);
};

/** Needs `busId` in the search response (spec §1) — without it no rating is shown. */
const useBusRating = (busId) => {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    if (!busId) return undefined;
    let alive = true;
    loadRating(busId).then((data) => { if (alive) setSummary(data); });
    return () => { alive = false; };
  }, [busId]);
  return summary;
};

const RatingBadge = ({ busId }) => {
  const summary = useBusRating(busId);
  if (!summary) return null;
  const total = Number(summary.totalRatings ?? 0);
  if (total === 0) {
    return <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">New</span>;
  }
  const avg = Number(summary.averageRating ?? 0);
  const tone = avg >= 4 ? 'bg-green-600' : avg >= 3 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500" title={`${avg.toFixed(1)} out of 5 from ${total} rider review${total !== 1 ? 's' : ''}`}>
      <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold text-white ${tone}`}>
        <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
        {avg.toFixed(1)}
      </span>
      {total} review{total !== 1 ? 's' : ''}
    </span>
  );
};

const formatPointTime = (value) => {
  if (!value) return '';
  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const h = Number(match[1]);
  return `${String(h % 12 || 12).padStart(2, '0')}:${match[2]} ${h >= 12 ? 'PM' : 'AM'}`;
};

const PointList = ({ title, icon, points }) => (
  <div>
    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
      <span className="material-symbols-outlined text-[14px]">{icon}</span>{title}
    </p>
    {points.length === 0 ? (
      <p className="text-xs text-slate-400">Not listed by the operator</p>
    ) : (
      <ul className="space-y-1.5">
        {points.map((p) => (
          <li key={p.id} className="flex items-start gap-3 text-xs">
            <span className="w-16 flex-shrink-0 font-bold text-slate-900">{formatPointTime(p.arrivalTime)}</span>
            <span className="min-w-0 text-slate-600">
              <span className="font-semibold text-slate-800">{p.name}</span>
              {p.landmark && <span className="text-slate-400"> · {p.landmark}</span>}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

const PointsPanel = ({ scheduleId }) => {
  const [state, setState] = useState({ loading: true, data: null, error: false });
  useEffect(() => {
    let alive = true;
    getPublicSchedulePoints(scheduleId)
      .then((data) => alive && setState({ loading: false, data, error: false }))
      .catch(() => alive && setState({ loading: false, data: null, error: true }));
    return () => { alive = false; };
  }, [scheduleId]);

  if (state.loading) return <p className="text-xs text-slate-400">Loading points…</p>;
  if (state.error) return <p className="text-xs text-red-500">Couldn’t load boarding points. Try again.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <PointList title="Boarding points" icon="trip_origin" points={state.data.boardingPoints} />
      <PointList title="Drop points" icon="location_on" points={state.data.droppingPoints} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const BusCard = ({ bus, searchParams }) => {
  const navigate = useNavigate();
  const fareEntries = Object.entries(bus.faresByType || {}).sort((a, b) => a[1].totalFare - b[1].totalFare);
  const [selectedType, setSelectedType] = useState(fareEntries[0]?.[0] || null);
  const selectedFare = bus.faresByType?.[selectedType];
  const availableSeats = getAvailableSeatCount(bus);
  const soldOut = isSoldOut(bus);
  const delayMins = getDelayMinutes(bus);
  const delayed = String(getTripStatusValue(bus) || '').toUpperCase() === 'DELAYED' || delayMins > 0;
  const plusDays = daysLater(bus.departureTime, bus.arrivalTime);
  const fewSeats = availableSeats !== null && availableSeats > 0 && availableSeats < 6;
  const [showPoints, setShowPoints] = useState(false);

  const select = () => !soldOut && navigate(ROUTES.BOOKING, { state: { bus, selectedType, selectedFare, searchParams } });

  return (
    <article className={`rounded-2xl bg-white border transition-all ${
      soldOut ? 'border-slate-200 opacity-60' : 'border-slate-200/80 shadow-sm hover:shadow-lg hover:border-[#FDBA74]/60'
    }`}>
      <div className="p-5 grid gap-5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_auto] md:items-center">

        {/* Bus */}
        <div className="flex items-start gap-3 min-w-0">
          <span className={`w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center ${soldOut ? 'bg-slate-100 text-slate-400' : 'bg-primary text-white'}`}>
            <span className="material-symbols-outlined text-[22px]">directions_bus</span>
          </span>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 leading-snug truncate">{bus.busName}</h3>
            <p className="text-xs text-slate-500 truncate">
              {[prettyLabel(bus.busType), bus.operatorName].filter(Boolean).join(' · ')}
            </p>
            <div className="mt-1"><RatingBadge busId={bus.busId} /></div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {delayed && !soldOut && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  {delayMins > 0 ? `Delayed ${delayMins} min` : 'Delayed'}
                </span>
              )}
              {bus.amenities?.slice(0, 3).map((a) => (
                <span key={a} title={prettyLabel(a)} className="inline-flex items-center gap-1 rounded-full bg-slate-50 border border-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                  <span className="material-symbols-outlined text-[13px]">{amenityIcon(a)}</span>
                  {prettyLabel(a)}
                </span>
              ))}
              {bus.amenities?.length > 3 && (
                <span className="text-[11px] text-slate-400">+{bus.amenities.length - 3}</span>
              )}
            </div>
            {delayed && bus.delayReason && <p className="mt-1 text-[11px] text-slate-500">Reason: {bus.delayReason}</p>}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex items-center gap-3">
          <div className="text-left">
            <p className="text-xl font-black text-slate-900 leading-none">{formatTime(bus.departureTime)}</p>
            <p className="mt-1 text-xs font-medium text-slate-500 truncate">{searchParams.from}</p>
          </div>
          <div className="flex-1 min-w-[70px] flex flex-col items-center">
            <span className="text-[11px] font-bold text-slate-500">{formatDuration(bus.departureTime, bus.arrivalTime)}</span>
            <div className="w-full flex items-center gap-1 my-1" aria-hidden="true">
              <span className="w-1.5 h-1.5 rounded-full border border-slate-400" />
              <span className="flex-1 border-t border-dashed border-slate-300" />
              <span className="material-symbols-outlined text-[16px] text-[#FF8A65]">directions_bus</span>
              <span className="flex-1 border-t border-dashed border-slate-300" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black text-slate-900 leading-none">
              {formatTime(bus.arrivalTime)}
              {plusDays > 0 && <sup className="ml-0.5 text-[10px] font-bold text-orange-600">+{plusDays}</sup>}
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 truncate">{searchParams.to}</p>
          </div>
        </div>

        {/* Price + action */}
        <div className="flex md:flex-col items-center md:items-end justify-between gap-2 md:min-w-[150px] pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
          <div className="md:text-right">
            <p className="text-[11px] text-slate-400 leading-none">{fareEntries.length > 1 ? 'Starts from' : prettyLabel(selectedType) || 'Fare'}</p>
            <p className={`text-2xl font-black leading-tight ${soldOut ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
              ₹{selectedFare ? Math.round(selectedFare.totalFare).toLocaleString('en-IN') : '--'}
            </p>
            {!soldOut && availableSeats !== null && (
              <p className={`text-xs font-semibold ${fewSeats ? 'text-red-600' : 'text-green-700'}`}>
                {fewSeats ? `Only ${availableSeats} left` : `${availableSeats} seats left`}
              </p>
            )}
          </div>
          <button
            disabled={soldOut}
            onClick={select}
            className={`rounded-xl px-5 py-2.5 text-sm font-bold transition-colors whitespace-nowrap ${
              soldOut ? 'cursor-not-allowed bg-slate-100 text-slate-400' : 'bg-primary text-white hover:bg-[#102A4C]'
            }`}
          >
            {soldOut ? 'Sold out' : 'Select seats'}
          </button>
        </div>
      </div>

      {/* Seat types + boarding/drop points */}
      {!soldOut && (
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 rounded-b-2xl">
          <div className="flex flex-wrap items-center gap-2">
            {fareEntries.length > 1 && (
              <>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">Seat type</span>
                {fareEntries.map(([type, fare]) => (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    aria-pressed={selectedType === type}
                    className={`rounded-full px-3 py-1 text-xs font-bold border transition-colors ${
                      selectedType === type
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-[#FF8A65]'
                    }`}
                  >
                    {prettyLabel(type)} · ₹{Math.round(fare.totalFare).toLocaleString('en-IN')}
                  </button>
                ))}
              </>
            )}
            <button
              onClick={() => setShowPoints((v) => !v)}
              aria-expanded={showPoints}
              className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-[#FF8A65] transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">alt_route</span>
              Boarding &amp; drop points
              <span className="material-symbols-outlined text-[16px]">{showPoints ? 'expand_less' : 'expand_more'}</span>
            </button>
          </div>
          {showPoints && <div className="mt-3 pt-3 border-t border-slate-200/70"><PointsPanel scheduleId={bus.scheduleId} /></div>}
        </div>
      )}
    </article>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const FilterSection = ({ title, children, right }) => (
  <div className="px-5 py-4 border-b border-slate-100 last:border-0">
    <div className="flex items-center justify-between mb-3">
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{title}</h4>
      {right}
    </div>
    {children}
  </div>
);

const chipCls = (active) =>
  `rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${
    active ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-[#FF8A65]'
  }`;

const SlotGrid = ({ slots, selected, onToggle }) => (
  <div className="grid grid-cols-3 gap-2">
    {slots.map((s) => {
      const active = selected.includes(s.label);
      return (
        <button key={s.label} onClick={() => onToggle(s.label)} aria-pressed={active}
          className={`flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors ${
            active ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-[#FF8A65]'
          }`}>
          <span className={`material-symbols-outlined text-[18px] ${active ? 'text-[#FDBA74]' : 'text-slate-400'}`}>{s.icon}</span>
          <span className="text-xs font-bold">{s.label}</span>
          <span className={`text-[10px] ${active ? 'text-white/70' : 'text-slate-400'}`}>{s.range}</span>
        </button>
      );
    })}
  </div>
);

/** Shared by the desktop sidebar and the mobile sheet. */
const FilterPanel = ({ f, busTypes, allMaxPrice }) => {
  const toggle = (setter, value) => setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  const price = f.maxPrice ?? allMaxPrice;

  return (
    <>
      <FilterSection title="Departure">
        <SlotGrid slots={DEPARTURE_SLOTS} selected={f.selectedSlots} onToggle={(v) => toggle(f.setSelectedSlots, v)} />
      </FilterSection>

      <FilterSection title="Arrival">
        <SlotGrid slots={ARRIVAL_SLOTS} selected={f.selectedArrivalSlots} onToggle={(v) => toggle(f.setSelectedArrivalSlots, v)} />
      </FilterSection>

      {busTypes.length > 0 && (
        <FilterSection title="Bus type">
          <div className="flex flex-wrap gap-2">
            {busTypes.map((type) => (
              <button key={type} onClick={() => toggle(f.setSelectedBusTypes, type)} aria-pressed={f.selectedBusTypes.includes(type)} className={chipCls(f.selectedBusTypes.includes(type))}>
                {prettyLabel(type)}
              </button>
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Max price" right={<span className="text-xs font-bold text-slate-900">₹{price.toLocaleString('en-IN')}</span>}>
        <input
          type="range" min={0} max={allMaxPrice} step={10} value={price}
          onChange={(e) => f.setMaxPrice(Number(e.target.value) >= allMaxPrice ? null : Number(e.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#FF8A65]"
          aria-label="Maximum price"
        />
        <div className="mt-2 flex justify-between text-[11px] font-semibold text-slate-400">
          <span>₹0</span><span>₹{allMaxPrice.toLocaleString('en-IN')}</span>
        </div>
      </FilterSection>

      <FilterSection title="Seats available">
        <div className="grid grid-cols-4 gap-2">
          {MIN_SEATS_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => f.setMinSeats(opt.value)} aria-pressed={f.minSeats === opt.value} className={chipCls(f.minSeats === opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Amenities">
        <div className="flex flex-wrap gap-2">
          {AMENITY_OPTIONS.map((a) => (
            <button key={a} onClick={() => toggle(f.setSelectedAmenities, a)} aria-pressed={f.selectedAmenities.includes(a)} className={`${chipCls(f.selectedAmenities.includes(a))} inline-flex items-center gap-1`}>
              <span className="material-symbols-outlined text-[14px]">{amenityIcon(a)}</span>{a}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Running status">
        <div className="flex gap-2">
          {['On Time', 'Delayed'].map((s) => (
            <button key={s} onClick={() => toggle(f.setSelectedStatuses, s)} aria-pressed={f.selectedStatuses.includes(s)} className={chipCls(f.selectedStatuses.includes(s))}>
              {s}
            </button>
          ))}
        </div>
      </FilterSection>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const storedSearchDraft = (() => {
    try {
      const raw = localStorage.getItem(SEARCH_DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(Boolean(
    (location.state?.from && location.state?.to && location.state?.date)
    || (storedSearchDraft?.from && storedSearchDraft?.to && storedSearchDraft?.date)
  ));
  const [error, setError] = useState(null);
  const initialSearch = {
    from: normalizeCityLabel(location.state?.from || storedSearchDraft?.from || ''),
    to: normalizeCityLabel(location.state?.to || storedSearchDraft?.to || ''),
    date: location.state?.date || storedSearchDraft?.date || localDateString(),
  };
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);

  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedArrivalSlots, setSelectedArrivalSlots] = useState([]);
  const [selectedBusTypes, setSelectedBusTypes] = useState([]);
  const [maxPrice, setMaxPrice] = useState(null); // null = no limit
  const [minSeats, setMinSeats] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [sortBy, setSortBy] = useState('cheapest');
  const [page, setPage] = useState(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [savingRoute, setSavingRoute] = useState(false);

  const isGuest = !loading && !user;

  useEffect(() => {
    if (loading) return;
    // Block OPERATOR/ADMIN — guests (user=null) and USERs are allowed
    if (user && user.role && user.role !== 'USER') { navigate(ROUTES.HOME); return; }
  }, [user, loading, navigate]);

  useEffect(() => {
    // Saved routes are only available for authenticated users
    if (!user || user.role !== 'USER') return;
    getSavedRoutes().then(data => setSavedRoutes(Array.isArray(data) ? data : [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (user && user.role !== 'USER') return;
    if (appliedSearch.from && appliedSearch.to && appliedSearch.date) fetchBuses(appliedSearch);
  }, [appliedSearch, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentSaved = savedRoutes.find(
    r => r.fromCity?.toLowerCase() === appliedSearch.from?.toLowerCase() &&
         r.toCity?.toLowerCase()   === appliedSearch.to?.toLowerCase()
  );

  const handleToggleSave = async () => {
    if (!appliedSearch.from || !appliedSearch.to) return;
    setSavingRoute(true);
    try {
      if (currentSaved) {
        await unsaveRoute(currentSaved.id);
        setSavedRoutes(prev => prev.filter(r => r.id !== currentSaved.id));
      } else {
        const saved = await saveRoute(appliedSearch.from, appliedSearch.to);
        if (saved?.id) setSavedRoutes(prev => [...prev, saved]);
        toast.success('Route saved — find it on your dashboard.');
      }
    } catch {
      toast.error('Couldn’t update saved routes. Please try again.');
    } finally {
      setSavingRoute(false);
    }
  };

  const fetchBuses = async (params = appliedSearch) => {
    setLoadingBuses(true);
    setError(null);
    try {
      const data = await searchBuses(params.from, params.to, params.date);
      const rawBuses = Array.isArray(data) ? data.map(normalizeSearchBus) : [];
      const enrichedBuses = await Promise.all(
        rawBuses.map(async (bus) => {
          const scheduleId = bus?.scheduleId || bus?.id;
          if (!scheduleId) return bus;

          const featuresRes = await Promise.allSettled([getScheduleFeatures(scheduleId)]);

          const featurePayload = featuresRes[0].status === 'fulfilled' ? featuresRes[0].value : null;
          const busStatus = getTripStatusValue(bus);
          const featureStatus = getTripStatusValue(featurePayload);
          const busDelayMinutes = getDelayMinutes(bus);
          const featureDelayMinutes = getDelayMinutes(featurePayload);

          return {
            ...bus,
            scheduleId,
            availableSeatCount: getAvailableSeatCount(bus),
            availableSeats: getAvailableSeatCount(bus),
            tripStatus: mergeTripStatus(busStatus, featureStatus, busDelayMinutes, featureDelayMinutes),
            delayMinutes: Math.max(busDelayMinutes, featureDelayMinutes),
            delayReason: featurePayload?.delayReason || bus?.delayReason,
            actualDepartureTime: featurePayload?.actualDepartureTime || bus?.actualDepartureTime,
            actualArrivalTime: featurePayload?.actualArrivalTime || bus?.actualArrivalTime,
          };
        })
      );
      setBuses(enrichedBuses.map((bus) => projectScheduleToSearchDate(bus, params.date)));
    } catch {
      setError('We couldn’t load buses right now. Please try again.');
    } finally {
      setLoadingBuses(false);
    }
  };

  const busTypes = useMemo(() => [...new Set(buses.map(b => b.busType).filter(Boolean))], [buses]);

  const allMaxPrice = useMemo(() => {
    if (!buses.length) return 5000;
    return Math.ceil(Math.max(...buses.map(b => minFare(b.faresByType))) / 100) * 100;
  }, [buses]);

  const filteredBuses = useMemo(() => {
    let result = buses.filter((bus) => shouldShowBusForSearch(bus, appliedSearch.date));

    const inSlots = (iso, labels, slots) => {
      const hour = getIstHours(iso);
      return labels.some((label) => {
        const slot = slots.find((s) => s.label === label);
        return slot && hour >= slot.start && hour < slot.end;
      });
    };

    if (selectedSlots.length > 0) result = result.filter(bus => inSlots(bus.departureTime, selectedSlots, DEPARTURE_SLOTS));
    if (selectedArrivalSlots.length > 0) result = result.filter(bus => inSlots(bus.arrivalTime, selectedArrivalSlots, ARRIVAL_SLOTS));

    if (selectedBusTypes.length > 0) {
      result = result.filter(bus =>
        selectedBusTypes.some(t => bus.busType?.toLowerCase().includes(t.toLowerCase()))
      );
    }

    if (maxPrice !== null) result = result.filter(bus => minFare(bus.faresByType) <= maxPrice);

    if (selectedAmenities.length > 0) {
      result = result.filter(bus =>
        selectedAmenities.every(a =>
          bus.amenities?.some(ba => ba.toLowerCase().includes(a.toLowerCase()))
        )
      );
    }

    if (minSeats > 0) {
      result = result.filter(bus => {
        const avail = getAvailableSeatCount(bus);
        return avail === null || avail >= minSeats;
      });
    }

    if (selectedStatuses.length > 0) {
      result = result.filter(bus => {
        const s = String(bus.tripStatus || 'SCHEDULED').toUpperCase();
        return selectedStatuses.some(sel => {
          if (sel === 'On Time') return s === 'SCHEDULED' || s === 'ON_TIME';
          if (sel === 'Delayed') return s === 'DELAYED';
          return true;
        });
      });
    }

    if (sortBy === 'cheapest') result.sort((a, b) => minFare(a.faresByType) - minFare(b.faresByType));
    else if (sortBy === 'earliest') result.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
    else if (sortBy === 'latest') result.sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime));

    return result;
  }, [buses, appliedSearch.date, selectedSlots, selectedArrivalSlots, selectedBusTypes, maxPrice, minSeats, selectedAmenities, selectedStatuses, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredBuses.length / PAGE_SIZE));
  const paginatedBuses = useMemo(
    () => filteredBuses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filteredBuses, page]
  );

  const activeFilterCount = (
    selectedSlots.length + selectedArrivalSlots.length + selectedBusTypes.length +
    selectedAmenities.length + selectedStatuses.length +
    (minSeats > 0 ? 1 : 0) + (maxPrice !== null ? 1 : 0)
  );

  const resetFilters = () => {
    setSelectedSlots([]); setSelectedArrivalSlots([]); setSelectedBusTypes([]);
    setSelectedAmenities([]); setSelectedStatuses([]); setMinSeats(0); setMaxPrice(null);
  };

  const hasSearched = Boolean(appliedSearch.from && appliedSearch.to && appliedSearch.date);

  useEffect(() => {
    setPage(0);
  }, [appliedSearch, selectedSlots, selectedArrivalSlots, selectedBusTypes, maxPrice, minSeats, selectedAmenities, selectedStatuses, sortBy]);

  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(totalPages - 1, 0));
  }, [page, totalPages]);

  const filterState = {
    selectedSlots, setSelectedSlots, selectedArrivalSlots, setSelectedArrivalSlots,
    selectedBusTypes, setSelectedBusTypes, maxPrice, setMaxPrice, minSeats, setMinSeats,
    selectedAmenities, setSelectedAmenities, selectedStatuses, setSelectedStatuses,
  };

  const today = localDateString();
  const goToDate = (date) => setAppliedSearch((s) => ({ ...s, date }));
  const dayStrip = [-1, 0, 1, 2].map((offset) => shiftDate(appliedSearch.date, offset)).filter((d) => d >= today);

  const signInForMore = () => navigate(ROUTES.LOGIN, { state: { returnTo: { pathname: location.pathname, state: appliedSearch } } });

  const content = (
    <div className="space-y-6">

      {/* ── Search strip ── */}
      <section className="relative z-20 rounded-2xl bg-primary px-4 sm:px-6 pt-5 pb-5 shadow-sm">
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none" aria-hidden="true">
          <div className="absolute -top-24 -right-10 w-72 h-72 rounded-full bg-[#FF8A65]/15 blur-3xl" />
        </div>
        <div className="relative">
          {hasSearched ? (
            <p className="mb-3 text-sm font-semibold text-white/80">
              <span className="text-white font-black text-lg">{appliedSearch.from}</span>
              <span className="mx-2 text-[#FDBA74]">→</span>
              <span className="text-white font-black text-lg">{appliedSearch.to}</span>
            </p>
          ) : (
            <div className="mb-4">
              {user?.firstName && (
                <p className="text-sm font-semibold text-[#FDBA74] mb-1">{getGreeting()}, {user.firstName}</p>
              )}
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Where to next?</h1>
            </div>
          )}
          <div className="rounded-2xl shadow-[0_18px_40px_rgba(0,0,0,0.3)]">
            <SearchBar
              variant="hero"
              showQuickDates
              persistDraft={false}
              initialValues={appliedSearch}
              submitLabel={hasSearched ? 'Modify' : 'Search Buses'}
              submitIcon={hasSearched ? 'tune' : 'search'}
              onSubmit={(nextSearch) => setAppliedSearch(nextSearch)}
            />
          </div>
        </div>
      </section>

      {hasSearched && (
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ── Filters (desktop) ── */}
          <aside className="hidden lg:block w-[300px] flex-shrink-0">
            <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl bg-white border border-slate-200/80 shadow-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <h2 className="flex items-center gap-2 text-sm font-black text-slate-900">
                  <span className="material-symbols-outlined text-[18px] text-[#FF8A65]">tune</span>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-[#FDBA74]/25 text-orange-700 text-[11px] font-bold px-2 py-0.5">{activeFilterCount}</span>
                  )}
                </h2>
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs font-bold text-primary hover:text-[#FF8A65] transition-colors">Clear all</button>
                )}
              </div>
              <FilterPanel f={filterState} busTypes={busTypes} allMaxPrice={allMaxPrice} />
            </div>
          </aside>

          {/* ── Results ── */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Date strip */}
            <div className="flex items-stretch gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {dayStrip.map((d) => {
                const { weekday, day } = formatDayChip(d);
                const active = d === appliedSearch.date;
                return (
                  <button key={d} onClick={() => !active && goToDate(d)} aria-pressed={active}
                    className={`flex-1 min-w-[96px] rounded-xl border px-3 py-2 text-center transition-colors ${
                      active ? 'bg-primary border-primary text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-[#FF8A65]'
                    }`}>
                    <span className={`block text-[11px] font-semibold ${active ? 'text-[#FDBA74]' : 'text-slate-400'}`}>{d === today ? 'Today' : weekday}</span>
                    <span className="block text-sm font-black">{day}</span>
                  </button>
                );
              })}
            </div>

            {/* Results header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-black text-slate-900">
                  {loadingBuses ? 'Searching buses…' : `${filteredBuses.length} bus${filteredBuses.length !== 1 ? 'es' : ''} found`}
                </h1>
                {!loadingBuses && activeFilterCount > 0 && (
                  <p className="text-xs text-slate-500">{activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileFilterOpen(true)}
                  className="lg:hidden inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                >
                  <span className="material-symbols-outlined text-[16px]">tune</span>
                  Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                </button>
                <div className="flex rounded-xl border border-slate-200 bg-white p-1" role="group" aria-label="Sort results">
                  {SORT_OPTIONS.map((o) => (
                    <button key={o.value} onClick={() => setSortBy(o.value)} aria-pressed={sortBy === o.value}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                        sortBy === o.value ? 'bg-primary text-white' : 'text-slate-500 hover:text-primary'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
                {user?.role === 'USER' && (
                  <button
                    onClick={handleToggleSave}
                    disabled={savingRoute}
                    aria-label={currentSaved ? 'Remove from saved routes' : 'Save this route'}
                    title={currentSaved ? 'Remove from saved routes' : 'Save this route'}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors ${
                      currentSaved ? 'border-[#FF8A65]/40 bg-[#FDBA74]/15 text-[#FF8A65]' : 'border-slate-200 bg-white text-slate-400 hover:text-[#FF8A65]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: currentSaved ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                  </button>
                )}
              </div>
            </div>

            {isGuest && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-[#FFF7F2] border border-[#FDBA74]/40 px-5 py-3.5">
                <p className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="material-symbols-outlined text-[18px] text-orange-600">person</span>
                  <span>You can book as a guest. <span className="font-semibold">Sign in</span> to keep your tickets in one place and save routes.</span>
                </p>
                <button onClick={signInForMore} className="flex-shrink-0 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white hover:bg-[#102A4C] transition-colors">
                  Sign in
                </button>
              </div>
            )}

            {loadingBuses && (
              <div className="space-y-4" aria-busy="true">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-2xl bg-white border border-slate-200/80 p-5 animate-pulse grid gap-5 md:grid-cols-[1.1fr_1.4fr_auto] items-center">
                    <div className="flex gap-3"><div className="w-11 h-11 rounded-xl bg-slate-100" /><div className="space-y-2 flex-1"><div className="h-4 w-2/3 bg-slate-100 rounded" /><div className="h-3 w-1/2 bg-slate-100 rounded" /></div></div>
                    <div className="h-6 bg-slate-100 rounded" />
                    <div className="h-10 w-32 bg-slate-100 rounded-xl" />
                  </div>
                ))}
              </div>
            )}

            {error && !loadingBuses && (
              <div className="rounded-2xl bg-white border border-red-200 p-8 text-center">
                <span className="material-symbols-outlined text-red-400 text-4xl">cloud_off</span>
                <p className="mt-2 font-bold text-slate-900">{error}</p>
                <button onClick={() => fetchBuses(appliedSearch)} className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors">
                  Try again
                </button>
              </div>
            )}

            {!loadingBuses && !error && filteredBuses.length === 0 && (
              <div className="rounded-2xl bg-white border border-slate-200/80 p-10 text-center">
                <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[#FDBA74]/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-orange-600">search_off</span>
                </span>
                <h2 className="text-lg font-black text-slate-900">No buses found</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeFilterCount > 0 ? 'No buses match your filters.' : `There are no buses from ${appliedSearch.from} to ${appliedSearch.to} on this date.`}
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  {activeFilterCount > 0 && (
                    <button onClick={resetFilters} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors">Clear filters</button>
                  )}
                  <button onClick={() => goToDate(shiftDate(appliedSearch.date, 1))} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-700 hover:border-[#FF8A65] transition-colors">
                    Try the next day
                  </button>
                </div>
              </div>
            )}

            {!loadingBuses && !error && paginatedBuses.map((bus) => (
              <BusCard key={bus.scheduleId} bus={bus} searchParams={appliedSearch} />
            ))}

            {!loadingBuses && !error && filteredBuses.length > 0 && (
              <PaginationControls page={page} pageSize={PAGE_SIZE} totalItems={filteredBuses.length} onPageChange={setPage} itemLabel="buses" />
            )}
          </div>
        </div>
      )}

      {!hasSearched && (
        <div className="rounded-2xl bg-white border border-slate-200/80 p-12 text-center">
          <span className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[#FDBA74]/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl text-orange-600">directions_bus</span>
          </span>
          <h2 className="text-xl font-black text-slate-900">Where would you like to go?</h2>
          <p className="mt-1 text-slate-500">Choose your cities and travel date above to see available buses.</p>
        </div>
      )}

      {/* ── Filters (mobile sheet) ── */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileFilterOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h2 className="flex items-center gap-2 text-base font-black text-slate-900">
                <span className="material-symbols-outlined text-[#FF8A65]">tune</span>Filters
              </h2>
              <div className="flex items-center gap-2">
                {activeFilterCount > 0 && (
                  <button onClick={resetFilters} className="text-xs font-bold text-primary px-3 py-1.5">Clear all</button>
                )}
                <button onClick={() => setMobileFilterOpen(false)} aria-label="Close filters" className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-slate-600">close</span>
                </button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              <FilterPanel f={filterState} busTypes={busTypes} allMaxPrice={allMaxPrice} />
            </div>
            <div className="px-5 py-4 border-t border-slate-100">
              <button onClick={() => setMobileFilterOpen(false)} className="w-full rounded-xl bg-primary py-3.5 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors">
                Show {filteredBuses.length} bus{filteredBuses.length !== 1 ? 'es' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Signed-in travellers get the dashboard shell; guests get the public site header/footer
  if (user?.role === 'USER') {
    return (
      <UserLayout activeItem="search" title="Search Buses" showHeaderTitle={false} showHeaderSearch={false}>
        {content}
      </UserLayout>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">{content}</main>
      <Footer />
    </div>
  );
};

export default SearchResults;
