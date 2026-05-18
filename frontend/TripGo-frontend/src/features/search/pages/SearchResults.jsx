import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { searchBuses } from '../../../api/busService';
import { getScheduleFeatures, getScheduleSeats } from '../../../api/bookingService';
import { getSavedRoutes, saveRoute, unsaveRoute } from '../../../api/savedRoutesService';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import UserLayout from '../../../shared/components/UserLayout';
import SearchBar from '../../../shared/components/ui/SearchBar';
import PaginationControls from '../../../shared/components/ui/PaginationControls';
import {
  formatUtcTime,
  getAvailableSeatCount,
  getDelayMinutes,
  projectScheduleToSearchDate,
  getTripStatusValue,
  isSeatAvailableForBooking,
  shouldShowBusForSearch,
} from '../../../shared/utils/scheduleSearchUtils';

const DEPARTURE_SLOTS = [
  { label: 'Early Morning (6am – 12pm)', start: 6, end: 12 },
  { label: 'Afternoon (12pm – 6pm)', start: 12, end: 18 },
  { label: 'Night (6pm – 12am)', start: 18, end: 24 },
];

const ARRIVAL_SLOTS = [
  { label: 'Morning arrival (6am – 12pm)', start: 6, end: 12 },
  { label: 'Afternoon arrival (12pm – 6pm)', start: 12, end: 18 },
  { label: 'Night arrival (6pm – 12am)', start: 18, end: 24 },
];

const MIN_SEATS_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '1+ seat', value: 1 },
  { label: '3+ seats', value: 3 },
  { label: '5+ seats', value: 5 },
];

const AMENITY_OPTIONS = ['WiFi', 'USB Port', 'Meal', 'Blanket', 'AC'];
const PAGE_SIZE = 10;

const formatTime = (instant) => {
  return formatUtcTime(instant);
};

const formatDuration = (dep, arr) => {
  if (!dep || !arr) return '--';
  const mins = Math.round((new Date(arr) - new Date(dep)) / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const minFare = (faresByType) => {
  if (!faresByType) return 0;
  const vals = Object.values(faresByType).map(f => f.totalFare);
  return vals.length ? Math.min(...vals) : 0;
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

const hasNumericSeatCount = (bus) => (
  Number.isFinite(Number(bus?.availableSeatCount)) ||
  Number.isFinite(Number(bus?.availableSeats))
);

const getTripStatusMeta = (tripStatus, delayMinutes) => {
  const status = String(tripStatus || '').toUpperCase();
  const delay = Number(delayMinutes || 0);

  if (status === 'DELAYED' || delay > 0) {
    return {
      label: 'Delayed',
      textClass: 'text-amber-500',
      chipClass: 'bg-amber-50 text-amber-700',
    };
  }

  if (status === 'STARTED') {
    return {
      label: 'Started',
      textClass: 'text-sky-500',
      chipClass: 'bg-sky-50 text-sky-700',
    };
  }

  if (status === 'COMPLETED') {
    return {
      label: 'Completed',
      textClass: 'text-emerald-500',
      chipClass: 'bg-emerald-50 text-emerald-700',
    };
  }

  return {
    label: 'On Time',
    textClass: 'text-emerald-500',
    chipClass: 'bg-emerald-50 text-emerald-700',
  };
};

const normalizeCityLabel = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const SEARCH_DRAFT_STORAGE_KEY = 'tripgo_search_draft';

const InlineLoader = ({ label }) => (
  <div className="flex items-center gap-3 text-sm text-slate-600">
    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/40 border-t-primary" />
    <span>{label}</span>
  </div>
);

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

const BusCard = ({ bus, searchParams }) => {
  const navigate = useNavigate();
  const fareEntries = Object.entries(bus.faresByType || {});
  const [selectedType, setSelectedType] = useState(fareEntries[0]?.[0] || null);
  const selectedFare = bus.faresByType?.[selectedType];
  const availableSeats = getAvailableSeatCount(bus);
  const soldOut = isSoldOut(bus);
  const tripStatus = getTripStatusValue(bus);
  const delayMins = getDelayMinutes(bus);
  const tripStatusMeta = getTripStatusMeta(tripStatus, delayMins);

  return (
    <div className={`rounded-[28px] bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 transition-all ${
      soldOut
        ? 'opacity-60 ring-slate-200/40 cursor-not-allowed'
        : 'ring-slate-200/70 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]'
    }`}>
      {/* Mobile layout */}
      <div className="md:hidden p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0 ${soldOut ? 'bg-slate-100' : 'bg-primary/10'}`}>
              <span className={`material-symbols-outlined text-lg ${soldOut ? 'text-slate-400' : 'text-primary'}`}>directions_bus</span>
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 leading-tight">{bus.busName}</h4>
              <p className="text-[11px] text-slate-500">{bus.busType}{bus.operatorName ? ` · ${bus.operatorName}` : ''}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-xl font-black ${soldOut ? 'text-slate-400 line-through' : 'text-primary'}`}>
              ₹{selectedFare ? Math.round(selectedFare.totalFare) : '--'}
            </p>
            {!soldOut && fareEntries.length === 1 && (
              <p className="text-[10px] text-slate-500">{fareEntries[0][0]}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 items-center text-center mb-3">
          <div className="text-left">
            <p className="text-base font-extrabold text-slate-900">{formatTime(bus.departureTime)}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{searchParams.from}</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
              {formatDuration(bus.departureTime, bus.arrivalTime)}
            </p>
            <div className="relative h-px w-full bg-slate-200">
              <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/40 ring-2 ring-primary/80"></div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-base font-extrabold text-slate-900">{formatTime(bus.arrivalTime)}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">{searchParams.to}</p>
          </div>
        </div>

        {!soldOut && fareEntries.length > 1 && (
          <div className="flex gap-1.5 flex-wrap mb-3">
            {fareEntries.map(([type, fare]) => (
              <button key={type} onClick={() => setSelectedType(type)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                  selectedType === type ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'bg-slate-100 text-slate-500'
                }`}>
                {type} · ₹{Math.round(fare.totalFare)}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {soldOut ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-600">Sold Out</span>
            ) : (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tripStatusMeta.chipClass}`}>{tripStatusMeta.label}</span>
            )}
            {!soldOut && availableSeats !== null && (
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${availableSeats < 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {availableSeats < 5 ? `${availableSeats} left` : `${availableSeats} seats`}
              </span>
            )}
            {bus.amenities?.slice(0, 2).map(a => (
              <span key={a} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{a}</span>
            ))}
          </div>
          <button
            disabled={soldOut}
            onClick={() => !soldOut && navigate(ROUTES.BOOKING, { state: { bus, selectedType, selectedFare, searchParams } })}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all flex-shrink-0 ${
              soldOut ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                : 'bg-slate-900 text-white hover:bg-primary hover:text-black'
            }`}>
            {soldOut ? 'Sold Out' : 'Select'}
          </button>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden md:block p-6">
        <div className="flex flex-row items-center gap-6">
          <div className="flex items-center gap-4 w-48 flex-shrink-0">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${soldOut ? 'bg-slate-100' : 'bg-primary/10'}`}>
              <span className={`material-symbols-outlined text-2xl ${soldOut ? 'text-slate-400' : 'text-primary'}`}>directions_bus</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900">{bus.busName}</h4>
              <p className="text-xs text-slate-500">{bus.busType}</p>
              <p className="text-xs text-slate-400">{bus.operatorName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {soldOut ? (
                  <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-600">Sold Out</span>
                ) : (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tripStatusMeta.chipClass}`}>{tripStatusMeta.label}</span>
                )}
              </div>
              {!soldOut && (
                <p className={`mt-2 text-[11px] font-semibold ${tripStatusMeta.textClass}`}>
                  {delayMins > 0 ? `Delay Time: ${delayMins} min` : 'Delay Time: 0 min'}
                </p>
              )}
              {!soldOut && bus.delayReason ? (
                <p className="mt-1 text-[11px] text-slate-500">Reason: {bus.delayReason}</p>
              ) : null}
            </div>
          </div>

          <div className="flex-1 grid grid-cols-3 items-center text-center">
            <div>
              <p className="text-xl font-extrabold text-slate-900">{formatTime(bus.departureTime)}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{searchParams.from}</p>
            </div>
            <div className="flex flex-col items-center">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{formatDuration(bus.departureTime, bus.arrivalTime)}</p>
              <div className="relative h-px w-full bg-slate-200">
                <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/40 ring-2 ring-primary/80"></div>
              </div>
            </div>
            <div>
              <p className="text-xl font-extrabold text-slate-900">{formatTime(bus.arrivalTime)}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider mt-1">{searchParams.to}</p>
            </div>
          </div>

          <div className="flex min-w-[180px] flex-col items-end gap-3 pl-2">
            {!soldOut && fareEntries.length > 1 && (
              <div className="flex gap-2 flex-wrap justify-end">
                {fareEntries.map(([type, fare]) => (
                  <button key={type} onClick={() => setSelectedType(type)}
                    className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                      selectedType === type ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}>
                    {type} · ₹{Math.round(fare.totalFare)}
                  </button>
                ))}
              </div>
            )}
            {!soldOut && fareEntries.length === 1 && (
              <p className="text-xs font-medium text-slate-500">{fareEntries[0][0]}</p>
            )}
            <p className={`text-2xl font-black ${soldOut ? 'text-slate-400 line-through' : 'text-primary'}`}>
              ₹{selectedFare ? Math.round(selectedFare.totalFare) : '--'}
            </p>
            {bus.amenities?.length > 0 && (
              <div className="flex gap-1 flex-wrap justify-end">
                {bus.amenities.slice(0, 4).map(a => (
                  <span key={a} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-500">{a}</span>
                ))}
              </div>
            )}
            {soldOut ? (
              <p className="rounded-full bg-rose-100 px-4 py-1.5 text-[11px] font-bold text-rose-600">No seats available</p>
            ) : availableSeats !== null ? (
              <p className={`rounded-full px-3 py-1 text-[11px] font-semibold ${availableSeats < 5 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {availableSeats < 5 ? `Only ${availableSeats} seats left!` : `${availableSeats} seats available`}
              </p>
            ) : null}
            <button
              disabled={soldOut}
              onClick={() => !soldOut && navigate(ROUTES.BOOKING, { state: { bus, selectedType, selectedFare, searchParams } })}
              className={`w-full rounded-2xl px-6 py-3 text-sm font-bold transition-all ${
                soldOut ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                  : 'bg-slate-900 text-white hover:bg-primary hover:text-black'
              }`}>
              {soldOut ? 'Sold Out' : 'Select Seat'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileFilterSheet = ({
  open, onClose,
  selectedSlots, setSelectedSlots,
  selectedArrivalSlots, setSelectedArrivalSlots,
  selectedBusTypes, setSelectedBusTypes,
  maxPrice, setMaxPrice, allMaxPrice,
  minSeats, setMinSeats,
  selectedAmenities, setSelectedAmenities,
  selectedStatuses, setSelectedStatuses,
  onReset,
  buses,
}) => {
  if (!open) return null;
  const toggleItem = (setter, value) =>
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-[28px] max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-lg text-[#002046]">tune</span>
            <h3 className="text-base font-bold text-slate-900">Filters</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onReset} className="text-xs font-semibold text-rose-500 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 transition-colors">Reset all</button>
            <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-sm text-slate-600">close</span>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Departure Time</h4>
            <div className="space-y-2.5">
              {DEPARTURE_SLOTS.map(({ label }) => (
                <label key={label} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={selectedSlots.includes(label)} onChange={() => toggleItem(setSelectedSlots, label)} className="h-4 w-4 rounded border-slate-300 accent-[#002046]" />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Arrival Time</h4>
            <div className="space-y-2.5">
              {ARRIVAL_SLOTS.map(({ label }) => (
                <label key={label} className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={selectedArrivalSlots.includes(label)} onChange={() => toggleItem(setSelectedArrivalSlots, label)} className="h-4 w-4 rounded border-slate-300 accent-[#002046]" />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {[...new Set(buses.map(b => b.busType).filter(Boolean))].length > 0 && (
            <div className="px-5 py-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Bus Type</h4>
              <div className="space-y-2.5">
                {[...new Set(buses.map(b => b.busType).filter(Boolean))].map(type => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={selectedBusTypes.includes(type)} onChange={() => toggleItem(setSelectedBusTypes, type)} className="h-4 w-4 rounded border-slate-300 accent-[#002046]" />
                    <span className="text-sm text-slate-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Max Price</h4>
              <span className="text-xs font-bold text-[#002046]">₹{maxPrice}</span>
            </div>
            <input type="range" min={0} max={allMaxPrice} value={maxPrice} onChange={e => setMaxPrice(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-[#002046]" />
            <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400"><span>₹0</span><span>₹{allMaxPrice}</span></div>
          </div>

          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Min Seats Available</h4>
            <div className="grid grid-cols-2 gap-2">
              {MIN_SEATS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setMinSeats(opt.value)}
                  className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-all ${minSeats === opt.value ? 'bg-[#002046]/10 text-[#002046] ring-1 ring-[#002046]/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Trip Status</h4>
            <div className="flex flex-wrap gap-2">
              {['On Time', 'Delayed', 'Started'].map(s => (
                <button key={s} onClick={() => toggleItem(setSelectedStatuses, s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${selectedStatuses.includes(s)
                    ? s === 'On Time' ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                      : s === 'Delayed' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                      : 'bg-sky-100 text-sky-700 ring-1 ring-sky-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Amenities</h4>
            <div className="flex flex-wrap gap-2">
              {AMENITY_OPTIONS.map(a => (
                <button key={a} onClick={() => toggleItem(setSelectedAmenities, a)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${selectedAmenities.includes(a) ? 'bg-[#002046]/10 text-[#002046] ring-1 ring-[#002046]/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="w-full rounded-2xl bg-[#002046] py-3.5 text-sm font-bold text-white hover:bg-[#001533] transition-colors">
            Show Results
          </button>
        </div>
      </div>
    </div>
  );
};

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
    date: location.state?.date || storedSearchDraft?.date || new Date().toISOString().split('T')[0],
  };
  const [searchParams, setSearchParams] = useState(initialSearch);
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);

  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedArrivalSlots, setSelectedArrivalSlots] = useState([]);
  const [selectedBusTypes, setSelectedBusTypes] = useState([]);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [minSeats, setMinSeats] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [sortBy, setSortBy] = useState('cheapest');
  const [page, setPage] = useState(0);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [savingRoute, setSavingRoute] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(ROUTES.HOME); return; }
    if (user.role && user.role !== 'USER') { navigate(ROUTES.HOME); return; }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'USER') return;
    getSavedRoutes().then(data => setSavedRoutes(Array.isArray(data) ? data : [])).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== 'USER') return;
    if (appliedSearch.from && appliedSearch.to && appliedSearch.date) fetchBuses(appliedSearch);
  }, [appliedSearch, user]);

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
      }
    } catch {
      // silently ignore
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

          const [featuresRes, seatsRes] = await Promise.allSettled([
            getScheduleFeatures(scheduleId),
            hasNumericSeatCount(bus) ? Promise.resolve(null) : getScheduleSeats(scheduleId, params.date, params.from, params.to),
          ]);

          const featurePayload = featuresRes.status === 'fulfilled' ? featuresRes.value : null;
          const seatsPayload = seatsRes.status === 'fulfilled' ? seatsRes.value : null;
          const busStatus = getTripStatusValue(bus);
          const featureStatus = getTripStatusValue(featurePayload);
          const busDelayMinutes = getDelayMinutes(bus);
          const featureDelayMinutes = getDelayMinutes(featurePayload);
          const fallbackSeatAvailability = Array.isArray(seatsPayload?.seatAvailability)
            ? seatsPayload.seatAvailability
            : Array.isArray(seatsPayload?.seats)
              ? seatsPayload.seats
              : Array.isArray(seatsPayload?.upperDeck) || Array.isArray(seatsPayload?.lowerDeck)
                ? [...(seatsPayload?.lowerDeck || []), ...(seatsPayload?.upperDeck || [])]
                : [];
          const fallbackAvailableCount = fallbackSeatAvailability.length
            ? fallbackSeatAvailability.filter(isSeatAvailableForBooking).length
            : null;

          return {
            ...bus,
            scheduleId,
            seatAvailability: Array.isArray(bus?.seatAvailability) && bus.seatAvailability.length
              ? bus.seatAvailability
              : fallbackSeatAvailability,
            availableSeatCount: hasNumericSeatCount(bus)
              ? getAvailableSeatCount(bus)
              : fallbackAvailableCount,
            availableSeats: hasNumericSeatCount(bus)
              ? getAvailableSeatCount(bus)
              : fallbackAvailableCount,
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
      setError('Failed to fetch buses. Please try again.');
    } finally {
      setLoadingBuses(false);
    }
  };

  const toggleItem = (setter, value) =>
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  const filteredBuses = useMemo(() => {
    let result = buses.filter((bus) => shouldShowBusForSearch(bus, appliedSearch.date));

    if (selectedSlots.length > 0) {
      result = result.filter(bus => {
        const hour = new Date(bus.departureTime).getUTCHours();
        return selectedSlots.some(label => {
          const slot = DEPARTURE_SLOTS.find(s => s.label === label);
          return slot && hour >= slot.start && hour < slot.end;
        });
      });
    }

    if (selectedBusTypes.length > 0) {
      result = result.filter(bus =>
        selectedBusTypes.some(t => bus.busType?.toLowerCase().includes(t.toLowerCase()))
      );
    }

    result = result.filter(bus => minFare(bus.faresByType) <= maxPrice);

    if (selectedArrivalSlots.length > 0) {
      result = result.filter(bus => {
        const hour = new Date(bus.arrivalTime).getUTCHours();
        return selectedArrivalSlots.some(label => {
          const slot = ARRIVAL_SLOTS.find(s => s.label === label);
          return slot && hour >= slot.start && hour < slot.end;
        });
      });
    }

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
          if (sel === 'Started') return s === 'STARTED';
          return true;
        });
      });
    }

    if (sortBy === 'cheapest') result.sort((a, b) => minFare(a.faresByType) - minFare(b.faresByType));
    else if (sortBy === 'earliest') result.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));
    else if (sortBy === 'latest') result.sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime));

    return result;
  }, [buses, selectedSlots, selectedArrivalSlots, selectedBusTypes, maxPrice, minSeats, selectedAmenities, selectedStatuses, sortBy]);

  const availableBuses = useMemo(
    () => filteredBuses,
    [filteredBuses]
  );
  const totalPages = Math.max(1, Math.ceil(availableBuses.length / PAGE_SIZE));
  const paginatedBuses = useMemo(
    () => availableBuses.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [availableBuses, page]
  );

  const allMaxPrice = useMemo(() => {
    if (!buses.length) return 5000;
    return Math.ceil(Math.max(...buses.map(b => minFare(b.faresByType))) / 100) * 100;
  }, [buses]);

  const activeFilterCount = (
    selectedSlots.length + selectedArrivalSlots.length + selectedBusTypes.length +
    selectedAmenities.length + selectedStatuses.length +
    (minSeats > 0 ? 1 : 0) + (maxPrice < allMaxPrice ? 1 : 0)
  );

  const hasSearched = Boolean(appliedSearch.from && appliedSearch.to && appliedSearch.date);

  useEffect(() => {
    setPage(0);
  }, [appliedSearch, selectedSlots, selectedArrivalSlots, selectedBusTypes, maxPrice, minSeats, selectedAmenities, selectedStatuses, sortBy]);

  useEffect(() => {
    if (page >= totalPages) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

  return (
    <UserLayout activeItem="search" title="Search Results" showHeaderSearch={false}>
      <div className="flex flex-col gap-6 lg:flex-row">

          <aside className="hidden lg:block flex-shrink-0" style={{width: '320px'}}>
            <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-0.5">
              <div className="rounded-[24px] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 overflow-hidden">
                {/* Filter header */}
                <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-[#002046] to-[#003a80] text-white">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">tune</span>
                    <h3 className="text-sm font-bold">Filters</h3>
                  </div>
                  {(selectedSlots.length > 0 || selectedArrivalSlots.length > 0 || selectedBusTypes.length > 0 || selectedAmenities.length > 0 || selectedStatuses.length > 0 || minSeats > 0) && (
                    <button onClick={() => {
                      setSelectedSlots([]); setSelectedArrivalSlots([]); setSelectedBusTypes([]);
                      setSelectedAmenities([]); setSelectedStatuses([]); setMinSeats(0); setMaxPrice(allMaxPrice);
                    }} className="text-[11px] font-semibold opacity-80 hover:opacity-100 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded-full transition-all">
                      Reset all
                    </button>
                  )}
                </div>

                {/* Sort By */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Sort By</h4>
                  <div className="space-y-2">
                    {[
                      { value: 'cheapest', label: 'Cheapest First', icon: 'currency_rupee' },
                      { value: 'earliest', label: 'Earliest Departure', icon: 'schedule' },
                      { value: 'latest',   label: 'Latest Departure', icon: 'nights_stay' },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                        <input type="radio" name="sortBy" value={opt.value} checked={sortBy === opt.value}
                          onChange={() => setSortBy(opt.value)}
                          className="h-4 w-4 border-slate-300 text-primary focus:ring-primary" />
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-base">{opt.icon}</span>
                          <span className="text-sm text-slate-600 group-hover:text-slate-900">{opt.label}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Departure Time */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Departure Time</h4>
                  <div className="space-y-2.5">
                    {DEPARTURE_SLOTS.map(({ label }) => (
                      <label key={label} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={selectedSlots.includes(label)}
                          onChange={() => toggleItem(setSelectedSlots, label)}
                          className="h-4 w-4 rounded border-slate-300 bg-white text-primary focus:ring-primary" />
                        <span className="text-sm text-slate-600 group-hover:text-slate-900">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Arrival Time */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Arrival Time</h4>
                  <div className="space-y-2.5">
                    {ARRIVAL_SLOTS.map(({ label }) => (
                      <label key={label} className="flex items-center gap-3 cursor-pointer group">
                        <input type="checkbox" checked={selectedArrivalSlots.includes(label)}
                          onChange={() => toggleItem(setSelectedArrivalSlots, label)}
                          className="h-4 w-4 rounded border-slate-300 bg-white text-primary focus:ring-primary" />
                        <span className="text-sm text-slate-600 group-hover:text-slate-900">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Bus Type */}
                {[...new Set(buses.map(b => b.busType).filter(Boolean))].length > 0 && (
                  <div className="px-5 py-4 border-b border-slate-100">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Bus Type</h4>
                    <div className="space-y-2.5">
                      {[...new Set(buses.map(b => b.busType).filter(Boolean))].map(type => (
                        <label key={type} className="flex items-center gap-3 cursor-pointer group">
                          <input type="checkbox" checked={selectedBusTypes.includes(type)}
                            onChange={() => toggleItem(setSelectedBusTypes, type)}
                            className="h-4 w-4 rounded border-slate-300 bg-white text-primary focus:ring-primary" />
                          <span className="text-sm text-slate-600 group-hover:text-slate-900">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Max Price */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Max Price</h4>
                    <span className="text-xs font-bold text-primary">₹{maxPrice}</span>
                  </div>
                  <input type="range" min={0} max={allMaxPrice} value={maxPrice}
                    onChange={e => setMaxPrice(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-primary" />
                  <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400">
                    <span>₹0</span>
                    <span>₹{allMaxPrice}</span>
                  </div>
                </div>

                {/* Min Seats */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Min Seats Available</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {MIN_SEATS_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setMinSeats(opt.value)}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                          minSeats === opt.value
                            ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Trip Status */}
                <div className="px-5 py-4 border-b border-slate-100">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Trip Status</h4>
                  <div className="flex flex-wrap gap-2">
                    {['On Time', 'Delayed', 'Started'].map(s => (
                      <button key={s} onClick={() => toggleItem(setSelectedStatuses, s)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                          selectedStatuses.includes(s)
                            ? s === 'On Time' ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
                              : s === 'Delayed' ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-300'
                              : 'bg-sky-100 text-sky-700 ring-1 ring-sky-300'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div className="px-5 py-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {AMENITY_OPTIONS.map(a => (
                      <button key={a} onClick={() => toggleItem(setSelectedAmenities, a)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                          selectedAmenities.includes(a)
                            ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="flex-1 space-y-4">
            {/* Mobile filter row */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={() => setMobileFilterOpen(true)}
                className={`relative flex items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all ring-1 shadow-sm flex-shrink-0 ${activeFilterCount > 0 ? 'bg-[#002046] text-white ring-[#002046]' : 'bg-white text-slate-600 ring-slate-200'}`}
              >
                <span className="material-symbols-outlined text-base">tune</span>
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#002046]">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <div className="flex-1 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 pb-0.5">
                  {[...selectedSlots, ...selectedBusTypes, ...selectedAmenities, ...selectedStatuses,
                    ...(minSeats > 0 ? [`${minSeats}+ seats`] : []),
                    ...(maxPrice < allMaxPrice ? [`≤₹${maxPrice}`] : [])
                  ].map((chip) => (
                    <span key={chip} className="flex-shrink-0 rounded-full bg-[#002046]/10 text-[#002046] px-3 py-1 text-xs font-semibold whitespace-nowrap">
                      {chip}
                    </span>
                  ))}
                  {activeFilterCount > 0 && (
                    <button onClick={() => { setSelectedSlots([]); setSelectedArrivalSlots([]); setSelectedBusTypes([]); setSelectedAmenities([]); setSelectedStatuses([]); setMinSeats(0); setMaxPrice(allMaxPrice); }}
                      className="flex-shrink-0 rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-200 px-3 py-1 text-xs font-semibold whitespace-nowrap">
                      Clear all
                    </button>
                  )}
                </div>
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="flex-shrink-0 cursor-pointer rounded-xl bg-white ring-1 ring-slate-200 shadow-sm px-3 py-2.5 text-xs font-bold text-slate-700 outline-none">
                <option value="cheapest">Cheapest</option>
                <option value="earliest">Earliest</option>
                <option value="latest">Latest</option>
              </select>
            </div>

            <div className="rounded-[28px] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
              <SearchBar
                showQuickDates={false}
                initialValues={appliedSearch}
                submitLabel="Modify"
                submitIcon="edit"
                variant="light"
                onSubmit={(nextSearch) => {
                  setSearchParams(nextSearch);
                  setAppliedSearch(nextSearch);
                }}
              />
            </div>
            <div className="rounded-[28px] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary text-lg">directions_bus</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      {loadingBuses ? 'Searching buses...' : `${availableBuses.length} bus${availableBuses.length !== 1 ? 'es' : ''} found`}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {appliedSearch.from} → {appliedSearch.to} · {appliedSearch.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {appliedSearch.from && appliedSearch.to && (
                    <button
                      onClick={handleToggleSave}
                      disabled={savingRoute}
                      title={currentSaved ? 'Remove from saved routes' : 'Save this route'}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${currentSaved ? 'bg-rose-50 text-rose-500 hover:bg-rose-100' : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-400'}`}
                    >
                      <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: currentSaved ? "'FILL' 1" : "'FILL' 0" }}>favorite</span>
                    </button>
                  )}
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="cursor-pointer rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 outline-none border border-slate-200">
                    <option value="cheapest">Cheapest</option>
                    <option value="earliest">Earliest</option>
                    <option value="latest">Latest</option>
                  </select>
                </div>
              </div>
            </div>

            {loadingBuses && (
              <div className="flex items-center justify-center py-20">
                <InlineLoader label="Searching for buses..." />
              </div>
            )}

            {error && (
              <div className="rounded-[28px] bg-red-500/10 p-6 text-center ring-1 ring-red-500/20">
                <span className="material-symbols-outlined text-red-400 text-4xl mb-2">error</span>
                <p className="text-red-400 font-medium">{error}</p>
              </div>
            )}

            {!loadingBuses && !error && !hasSearched && (
              <div className="rounded-[28px] bg-white p-12 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
                <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">directions_bus</span>
                <h3 className="mb-2 text-xl font-bold text-slate-900">Where would you like to go?</h3>
                <p className="text-slate-500">Enter a departure city, destination and travel date above to find available buses.</p>
              </div>
            )}
            {!loadingBuses && !error && hasSearched && availableBuses.length === 0 && (
              <div className="rounded-[28px] bg-white p-12 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70">
                <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">search_off</span>
                <h3 className="mb-2 text-xl font-bold text-slate-900">No buses found</h3>
                <p className="text-slate-500">
                  {activeFilterCount > 0 ? 'Try removing some filters or ' : 'Try '}searching for a different date or route.
                </p>
                {activeFilterCount > 0 && (
                  <button onClick={() => { setSelectedSlots([]); setSelectedArrivalSlots([]); setSelectedBusTypes([]); setSelectedAmenities([]); setSelectedStatuses([]); setMinSeats(0); setMaxPrice(allMaxPrice); }}
                    className="mt-5 rounded-2xl bg-[#002046] px-6 py-3 text-sm font-bold text-white hover:bg-[#001533] transition-colors">
                    Clear all filters
                  </button>
                )}
              </div>
            )}

            {!loadingBuses && !error && paginatedBuses.map((bus) => (
              <BusCard key={bus.scheduleId} bus={bus} searchParams={appliedSearch} />
            ))}

            {!loadingBuses && !error && availableBuses.length > 0 ? (
              <PaginationControls
                page={page}
                pageSize={PAGE_SIZE}
                totalItems={availableBuses.length}
                onPageChange={setPage}
                itemLabel="buses"
              />
            ) : null}
          </div>
      </div>

      <MobileFilterSheet
        open={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        selectedSlots={selectedSlots} setSelectedSlots={setSelectedSlots}
        selectedArrivalSlots={selectedArrivalSlots} setSelectedArrivalSlots={setSelectedArrivalSlots}
        selectedBusTypes={selectedBusTypes} setSelectedBusTypes={setSelectedBusTypes}
        maxPrice={maxPrice} setMaxPrice={setMaxPrice} allMaxPrice={allMaxPrice}
        minSeats={minSeats} setMinSeats={setMinSeats}
        selectedAmenities={selectedAmenities} setSelectedAmenities={setSelectedAmenities}
        selectedStatuses={selectedStatuses} setSelectedStatuses={setSelectedStatuses}
        buses={buses}
        onReset={() => {
          setSelectedSlots([]); setSelectedArrivalSlots([]); setSelectedBusTypes([]);
          setSelectedAmenities([]); setSelectedStatuses([]); setMinSeats(0); setMaxPrice(allMaxPrice);
        }}
      />
    </UserLayout>
  );
};

export default SearchResults;
