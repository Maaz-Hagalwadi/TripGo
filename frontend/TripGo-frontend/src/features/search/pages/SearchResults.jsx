import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { searchBuses } from '../../../api/busService';
import { getScheduleFeatures, getScheduleSeats } from '../../../api/bookingService';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { ROUTES } from '../../../shared/constants/routes';
import UserLayout from '../../../shared/components/UserLayout';
import {
  getAvailableSeatCount,
  getDelayMinutes,
  getTripStatusValue,
  isSeatAvailableForBooking,
  shouldShowBusForSearch,
} from '../../../shared/utils/scheduleSearchUtils';

const DEPARTURE_SLOTS = [
  { label: 'Early Morning (6am – 12pm)', start: 6, end: 12 },
  { label: 'Afternoon (12pm – 6pm)', start: 12, end: 18 },
  { label: 'Night (6pm – 12am)', start: 18, end: 24 },
];

const AMENITY_OPTIONS = ['WiFi', 'USB Port', 'Meal', 'Blanket', 'AC'];
const CITY_OPTIONS = [
  'Mumbai',
  'Pune',
  'Goa',
  'Madgao',
  'Bengaluru',
  'Hyderabad',
  'Chennai',
  'Delhi',
  'Kochi',
];

const formatTime = (instant) => {
  if (!instant) return '--';
  return new Date(instant).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
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
    id: item?.id || item?.scheduleId || '',
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

const getTripStatusMeta = (tripStatus, delayMinutes) => {
  const status = String(tripStatus || '').toUpperCase();
  const delay = Number(delayMinutes || 0);

  if (status === 'DELAYED' || delay > 0) {
    return {
      label: `Delayed${delay > 0 ? ` by ${delay} min` : ''}`,
      textClass: 'text-amber-500 dark:text-amber-300',
      chipClass: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200',
    };
  }

  if (status === 'STARTED') {
    return {
      label: 'Started',
      textClass: 'text-sky-500 dark:text-sky-300',
      chipClass: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-200',
    };
  }

  if (status === 'COMPLETED') {
    return {
      label: 'Completed',
      textClass: 'text-emerald-500 dark:text-emerald-300',
      chipClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
    };
  }

  return {
    label: 'On Time',
    textClass: 'text-emerald-500 dark:text-emerald-300',
    chipClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200',
  };
};

const toYmd = (date) => date.toISOString().split('T')[0];
const TODAY_YMD = toYmd(new Date());
const TOMORROW_YMD = toYmd(new Date(Date.now() + 24 * 60 * 60 * 1000));

const BusCard = ({ bus, searchParams }) => {
  const navigate = useNavigate();
  const fareEntries = Object.entries(bus.faresByType || {});
  const [selectedType, setSelectedType] = useState(fareEntries[0]?.[0] || null);
  const selectedFare = bus.faresByType?.[selectedType];
  const availableSeats = getAvailableSeatCount(bus);
  const tripStatus = getTripStatusValue(bus);
  const delayMins = getDelayMinutes(bus);
  const tripStatusMeta = getTripStatusMeta(tripStatus, delayMins);

  return (
    <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:bg-charcoal dark:ring-white/5 dark:hover:ring-primary/20">
      <div className="flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex items-center gap-4 md:w-48 flex-shrink-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <span className="material-symbols-outlined text-2xl text-primary">directions_bus</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">{bus.busName}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{bus.busType}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{bus.operatorName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${tripStatusMeta.chipClass}`}>
                {tripStatusMeta.label}
              </span>
            </div>
            <p className={`mt-2 text-[11px] font-semibold ${tripStatusMeta.textClass}`}>
              {delayMins > 0 ? `Delay Time: ${delayMins} min` : 'Delay Time: 0 min'}
            </p>
            {bus.delayReason ? (
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                Reason: {bus.delayReason}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 items-center text-center">
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{formatTime(bus.departureTime)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{searchParams.from}</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
              {formatDuration(bus.departureTime, bus.arrivalTime)}
            </p>
            <div className="relative h-px w-full bg-slate-200 dark:bg-white/10">
              <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/40 ring-2 ring-primary/80"></div>
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{formatTime(bus.arrivalTime)}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">{searchParams.to}</p>
          </div>
        </div>

        <div className="flex min-w-[180px] flex-col items-end gap-3 md:pl-2">
          {fareEntries.length > 1 && (
            <div className="flex gap-2 flex-wrap justify-end">
              {fareEntries.map(([type, fare]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition-all ${
                    selectedType === type
                      ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10'
                  }`}
                >
                  {type} · ₹{Math.round(fare.totalFare)}
                </button>
              ))}
            </div>
          )}
          {fareEntries.length === 1 && (
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{fareEntries[0][0]}</p>
          )}
          <p className="text-2xl font-black text-primary">
            ₹{selectedFare ? Math.round(selectedFare.totalFare) : '--'}
          </p>
          {bus.amenities?.length > 0 && (
            <div className="flex gap-1 flex-wrap justify-end">
              {bus.amenities.slice(0, 4).map(a => (
                <span key={a} className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] text-slate-500 dark:bg-white/5 dark:text-slate-400">{a}</span>
              ))}
            </div>
          )}
          {availableSeats !== null && (
            <p className={`rounded-full px-3 py-1 text-[11px] font-semibold ${availableSeats > 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'}`}>
              {availableSeats > 0 ? `${availableSeats} seats available` : 'Sold out'}
            </p>
          )}
          <button
            onClick={() => navigate(ROUTES.BOOKING, { state: { bus, selectedType, selectedFare, searchParams } })}
            className="w-full rounded-2xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-primary hover:text-black dark:bg-white/10 dark:hover:bg-primary dark:hover:text-black">
            Select Seat
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
  const { isDark } = useTheme();

  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(Boolean(location.state?.from && location.state?.to && location.state?.date));
  const [error, setError] = useState(null);
  const initialSearch = {
    from: location.state?.from || '',
    to: location.state?.to || '',
    date: location.state?.date || new Date().toISOString().split('T')[0],
  };
  const [searchParams, setSearchParams] = useState(initialSearch);
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);

  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedBusTypes, setSelectedBusTypes] = useState([]);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sortBy, setSortBy] = useState('cheapest');

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(ROUTES.HOME); return; }
    if (user.role && user.role !== 'USER') { navigate(ROUTES.HOME); return; }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'USER') return;
    if (appliedSearch.from && appliedSearch.to && appliedSearch.date) fetchBuses(appliedSearch);
  }, [appliedSearch, user]);

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

          const [seatsRes, featuresRes] = await Promise.allSettled([
            getScheduleSeats(scheduleId),
            getScheduleFeatures(scheduleId),
          ]);

          const seatsPayload = seatsRes.status === 'fulfilled' ? seatsRes.value : null;
          const featurePayload = featuresRes.status === 'fulfilled' ? featuresRes.value : null;
          const busStatus = getTripStatusValue(bus);
          const featureStatus = getTripStatusValue(featurePayload);
          const busDelayMinutes = getDelayMinutes(bus);
          const featureDelayMinutes = getDelayMinutes(featurePayload);

          const resolvedSeatAvailability = Array.isArray(seatsPayload?.seatAvailability)
            ? seatsPayload.seatAvailability
            : Array.isArray(seatsPayload?.seats)
              ? seatsPayload.seats
              : Array.isArray(seatsPayload?.upperDeck) || Array.isArray(seatsPayload?.lowerDeck)
                ? [...(seatsPayload?.lowerDeck || []), ...(seatsPayload?.upperDeck || [])]
              : Array.isArray(bus?.seatAvailability)
                ? bus.seatAvailability
                : [];

          const derivedAvailableCount = resolvedSeatAvailability.length
            ? resolvedSeatAvailability.filter(isSeatAvailableForBooking).length
            : getAvailableSeatCount(bus);

          return {
            ...bus,
            scheduleId,
            seatAvailability: resolvedSeatAvailability,
            availableSeats: derivedAvailableCount,
            availableSeatCount: derivedAvailableCount,
            tripStatus: mergeTripStatus(busStatus, featureStatus, busDelayMinutes, featureDelayMinutes),
            delayMinutes: Math.max(busDelayMinutes, featureDelayMinutes),
            delayReason: featurePayload?.delayReason || bus?.delayReason,
            actualDepartureTime: featurePayload?.actualDepartureTime || bus?.actualDepartureTime,
            actualArrivalTime: featurePayload?.actualArrivalTime || bus?.actualArrivalTime,
          };
        })
      );
      setBuses(enrichedBuses);
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
        const hour = new Date(bus.departureTime).getHours();
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

    if (selectedAmenities.length > 0) {
      result = result.filter(bus =>
        selectedAmenities.every(a =>
          bus.amenities?.some(ba => ba.toLowerCase().includes(a.toLowerCase()))
        )
      );
    }

    if (sortBy === 'cheapest') result.sort((a, b) => minFare(a.faresByType) - minFare(b.faresByType));
    else if (sortBy === 'earliest') result.sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime));

    return result;
  }, [buses, selectedSlots, selectedBusTypes, maxPrice, selectedAmenities, sortBy]);

  const availableBuses = useMemo(
    () => filteredBuses.filter((bus) => getAvailableSeatCount(bus) !== 0),
    [filteredBuses]
  );

  const handleModifySearch = () => {
    const trimmedSearch = {
      from: searchParams.from.trim(),
      to: searchParams.to.trim(),
      date: searchParams.date,
    };
    if (trimmedSearch.from && trimmedSearch.to && trimmedSearch.date) {
      setAppliedSearch(trimmedSearch);
    }
  };

  const cityOptions = useMemo(
    () => [...new Set([...CITY_OPTIONS, searchParams.from, searchParams.to, appliedSearch.from, appliedSearch.to].filter(Boolean))],
    [searchParams.from, searchParams.to, appliedSearch.from, appliedSearch.to]
  );

  const allMaxPrice = useMemo(() => {
    if (!buses.length) return 5000;
    return Math.ceil(Math.max(...buses.map(b => minFare(b.faresByType))) / 100) * 100;
  }, [buses]);

  return (
    <UserLayout activeItem="search" title="Search Buses">
      <div className={`overflow-hidden rounded-[32px] ${isDark ? 'bg-deep-black text-slate-100' : 'bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_100%)] text-slate-900'}`}>

      <div className={`sticky top-0 z-40 py-5 backdrop-blur-xl ${isDark ? 'bg-charcoal/90' : 'bg-white/85 shadow-[0_12px_30px_rgba(15,23,42,0.06)]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4 items-center">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 z-10 text-xl text-slate-400">location_on</span>
              <input value={searchParams.from} onChange={e => setSearchParams(p => ({ ...p, from: e.target.value }))}
                list="from-city-options"
                className="w-full rounded-2xl bg-slate-100/90 px-10 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/80 focus:ring-2 focus:ring-primary dark:bg-input-gray dark:text-white dark:ring-white/10"
                placeholder="Departure City" type="text" />
              <datalist id="from-city-options">
                {cityOptions.map((city) => (
                  <option key={`from-${city}`} value={city} />
                ))}
              </datalist>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 z-10 text-xl text-slate-400">directions_bus</span>
              <input value={searchParams.to} onChange={e => setSearchParams(p => ({ ...p, to: e.target.value }))}
                list="to-city-options"
                className="w-full rounded-2xl bg-slate-100/90 px-10 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/80 focus:ring-2 focus:ring-primary dark:bg-input-gray dark:text-white dark:ring-white/10"
                placeholder="Destination City" type="text" />
              <datalist id="to-city-options">
                {cityOptions.map((city) => (
                  <option key={`to-${city}`} value={city} />
                ))}
              </datalist>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 z-10 text-xl text-slate-400">calendar_today</span>
              <input value={searchParams.date} onChange={e => setSearchParams(p => ({ ...p, date: e.target.value }))}
                className="w-full rounded-2xl bg-slate-100/90 px-10 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200/80 focus:ring-2 focus:ring-primary dark:bg-input-gray dark:text-white dark:ring-white/10"
                type="date" />
            </div>
            <button onClick={handleModifySearch}
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-black transition-all hover:bg-primary/90">
              <span className="material-symbols-outlined text-lg">edit</span> Modify
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => {
                setSearchParams((p) => ({ ...p, date: TODAY_YMD }));
                setAppliedSearch((p) => ({ ...p, date: TODAY_YMD }));
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${searchParams.date === TODAY_YMD ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setSearchParams((p) => ({ ...p, date: TOMORROW_YMD }));
                setAppliedSearch((p) => ({ ...p, date: TOMORROW_YMD }));
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${searchParams.date === TOMORROW_YMD ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10'}`}
            >
              Tomorrow
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-8 lg:flex-row">

          <aside className="w-full flex-shrink-0 space-y-6 lg:w-72">
            <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-charcoal dark:ring-white/5">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Departure Time</h3>
              <div className="space-y-3">
                {DEPARTURE_SLOTS.map(({ label }) => (
                  <label key={label} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={selectedSlots.includes(label)}
                      onChange={() => toggleItem(setSelectedSlots, label)}
                      className="h-5 w-5 rounded border-slate-300 bg-white text-primary focus:ring-primary dark:border-white/10 dark:bg-input-gray" />
                    <span className="text-sm text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-charcoal dark:ring-white/5">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Bus Type</h3>
              <div className="space-y-3">
                {[...new Set(buses.map(b => b.busType).filter(Boolean))].map(type => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={selectedBusTypes.includes(type)}
                      onChange={() => toggleItem(setSelectedBusTypes, type)}
                      className="h-5 w-5 rounded border-slate-300 bg-white text-primary focus:ring-primary dark:border-white/10 dark:bg-input-gray" />
                    <span className="text-sm text-slate-600 transition-colors group-hover:text-slate-900 dark:text-slate-300 dark:group-hover:text-white">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-charcoal dark:ring-white/5">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                Max Price · <span className="text-primary">₹{maxPrice}</span>
              </h3>
              <input type="range" min={0} max={allMaxPrice} value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-200 accent-primary dark:bg-input-gray" />
              <div className="mt-2 flex justify-between text-xs font-bold text-slate-400">
                <span>₹0</span>
                <span>₹{allMaxPrice}</span>
              </div>
            </div>

            <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-charcoal dark:ring-white/5">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(a => (
                  <button key={a} onClick={() => toggleItem(setSelectedAmenities, a)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                      selectedAmenities.includes(a)
                        ? 'bg-primary/10 text-primary ring-1 ring-primary/30'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-input-gray dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}>
                    {a}
                  </button>
                ))}
              </div>

              {(selectedSlots.length > 0 || selectedBusTypes.length > 0 || selectedAmenities.length > 0) && (
                <button onClick={() => { setSelectedSlots([]); setSelectedBusTypes([]); setSelectedAmenities([]); setMaxPrice(allMaxPrice); }}
                  className="mt-5 w-full rounded-2xl bg-slate-100 py-2.5 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10">
                  Reset Filters
                </button>
              )}
            </div>
          </aside>

          <div className="flex-1 space-y-4">
            <div className="rounded-[28px] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-charcoal dark:ring-white/5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {loadingBuses ? 'Searching...' : `${availableBuses.length} available bus${availableBuses.length !== 1 ? 'es' : ''}`}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {appliedSearch.from} → {appliedSearch.to} on {appliedSearch.date}
                  </p>
                </div>
                {availableBuses.length > 0 && (
                  <div className="flex items-center gap-4 text-sm font-medium">
                    <span className="text-slate-400">Sort by:</span>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="cursor-pointer rounded-full bg-slate-100 px-4 py-2 font-bold text-primary outline-none dark:bg-white/5">
                    <option value="cheapest">Cheapest First</option>
                    <option value="earliest">Earliest First</option>
                  </select>
                  </div>
                )}
              </div>
            </div>

            {loadingBuses && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400">Searching for buses...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-[28px] bg-red-500/10 p-6 text-center ring-1 ring-red-500/20">
                <span className="material-symbols-outlined text-red-400 text-4xl mb-2">error</span>
                <p className="text-red-400 font-medium">{error}</p>
              </div>
            )}

            {!loadingBuses && !error && availableBuses.length === 0 && (
              <div className="rounded-[28px] bg-white p-12 text-center shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-200/70 dark:bg-charcoal dark:ring-white/5">
                <span className="material-symbols-outlined text-slate-600 text-6xl mb-4">search_off</span>
                <h3 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">No available buses found</h3>
                <p className="text-slate-500 dark:text-slate-400">Try adjusting your filters or search for a different date</p>
              </div>
            )}

            {!loadingBuses && !error && availableBuses.map((bus) => (
              <BusCard key={bus.scheduleId} bus={bus} searchParams={appliedSearch} />
            ))}
          </div>
        </div>
      </main>

      </div>
    </UserLayout>
  );
};

export default SearchResults;
