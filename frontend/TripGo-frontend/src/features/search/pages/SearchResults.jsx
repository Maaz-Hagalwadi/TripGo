import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { searchBuses } from '../../../api/busService';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import UserLayout from '../../../shared/components/UserLayout';

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

const toYmd = (date) => date.toISOString().split('T')[0];
const TODAY_YMD = toYmd(new Date());
const TOMORROW_YMD = toYmd(new Date(Date.now() + 24 * 60 * 60 * 1000));

const BusCard = ({ bus, searchParams }) => {
  const navigate = useNavigate();
  const fareEntries = Object.entries(bus.faresByType || {});
  const [selectedType, setSelectedType] = useState(fareEntries[0]?.[0] || null);
  const selectedFare = bus.faresByType?.[selectedType];
  const availableSeats = Array.isArray(bus.seatAvailability) ? bus.seatAvailability.filter((seat) => seat.available).length : null;
  const tripStatus = String(bus.tripStatus || '').toUpperCase();
  const delayMins = Number(bus.delayMinutes || 0);
  const statusLabel = tripStatus === 'DELAYED' || delayMins > 0 ? `Delayed${delayMins > 0 ? ` by ${delayMins} min` : ''}` : 'On Time';
  const statusClass = tripStatus === 'DELAYED' || delayMins > 0 ? 'text-amber-400' : 'text-emerald-400';

  return (
    <div className="bg-charcoal border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all">
      <div className="flex flex-col md:flex-row md:items-center gap-6">

        {/* Bus info */}
        <div className="flex items-center gap-4 md:w-48 flex-shrink-0">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl text-primary">directions_bus</span>
          </div>
          <div>
            <h4 className="font-bold text-white">{bus.busName}</h4>
            <p className="text-xs text-slate-400">{bus.busType}</p>
            <p className="text-xs text-slate-500">{bus.operatorName}</p>
            <p className={`text-[11px] font-semibold mt-1 ${statusClass}`}>{statusLabel}</p>
          </div>
        </div>

        {/* Times */}
        <div className="flex-1 grid grid-cols-3 items-center text-center">
          <div>
            <p className="text-xl font-extrabold text-white">{formatTime(bus.departureTime)}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">{searchParams.from}</p>
          </div>
          <div className="flex flex-col items-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">
              {formatDuration(bus.departureTime, bus.arrivalTime)}
            </p>
            <div className="w-full h-px bg-white/10 relative">
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/40 border border-primary"></div>
            </div>
          </div>
          <div>
            <p className="text-xl font-extrabold text-white">{formatTime(bus.arrivalTime)}</p>
            <p className="text-xs text-slate-400 uppercase tracking-wider mt-1">{searchParams.to}</p>
          </div>
        </div>

        {/* Seat type selector + price */}
        <div className="flex flex-col items-end gap-3 md:border-l border-white/5 md:pl-6 min-w-[160px]">
          {fareEntries.length > 1 && (
            <div className="flex gap-2 flex-wrap justify-end">
              {fareEntries.map(([type, fare]) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                    selectedType === type
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-white/10 text-slate-400 hover:border-primary/40'
                  }`}
                >
                  {type} · ₹{Math.round(fare.totalFare)}
                </button>
              ))}
            </div>
          )}
          {fareEntries.length === 1 && (
            <p className="text-xs text-slate-400 font-medium">{fareEntries[0][0]}</p>
          )}
          <p className="text-2xl font-black text-primary">
            ₹{selectedFare ? Math.round(selectedFare.totalFare) : '--'}
          </p>
          {bus.amenities?.length > 0 && (
            <div className="flex gap-1 flex-wrap justify-end">
              {bus.amenities.slice(0, 4).map(a => (
                <span key={a} className="text-[10px] bg-white/5 text-slate-400 px-2 py-0.5 rounded">{a}</span>
              ))}
            </div>
          )}
          {availableSeats !== null && (
            <p className="text-[11px] text-emerald-400 font-semibold">{availableSeats} seats available</p>
          )}
          <button
            onClick={() => navigate(ROUTES.BOOKING, { state: { bus, selectedType, selectedFare, searchParams } })}
            className="w-full bg-white/10 hover:bg-primary hover:text-black text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all">
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
      setBuses(data || []);
    } catch {
      setError('Failed to fetch buses. Please try again.');
    } finally {
      setLoadingBuses(false);
    }
  };

  const toggleItem = (setter, value) =>
    setter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);

  const filteredBuses = useMemo(() => {
    let result = [...buses];

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
      <div className="bg-deep-black text-slate-100 rounded-2xl overflow-hidden">

      {/* Search Bar */}
      <div className="bg-charcoal border-b border-white/5 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">location_on</span>
              <input value={searchParams.from} onChange={e => setSearchParams(p => ({ ...p, from: e.target.value }))}
                list="from-city-options"
                className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm placeholder-silver-text focus:ring-1 focus:ring-primary outline-none"
                placeholder="Departure City" type="text" />
              <datalist id="from-city-options">
                {cityOptions.map((city) => (
                  <option key={`from-${city}`} value={city} />
                ))}
              </datalist>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">directions_bus</span>
              <input value={searchParams.to} onChange={e => setSearchParams(p => ({ ...p, to: e.target.value }))}
                list="to-city-options"
                className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm placeholder-silver-text focus:ring-1 focus:ring-primary outline-none"
                placeholder="Destination City" type="text" />
              <datalist id="to-city-options">
                {cityOptions.map((city) => (
                  <option key={`to-${city}`} value={city} />
                ))}
              </datalist>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">calendar_today</span>
              <input value={searchParams.date} onChange={e => setSearchParams(p => ({ ...p, date: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm outline-none"
                type="date" />
            </div>
            <button onClick={handleModifySearch}
              className="w-full bg-primary hover:bg-primary/90 text-black h-[42px] rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
              <span className="material-symbols-outlined text-lg">edit</span> Modify
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                setSearchParams((p) => ({ ...p, date: TODAY_YMD }));
                setAppliedSearch((p) => ({ ...p, date: TODAY_YMD }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${searchParams.date === TODAY_YMD ? 'border-primary text-primary bg-primary/10' : 'border-white/10 text-slate-300 hover:border-primary/40'}`}
            >
              Today
            </button>
            <button
              onClick={() => {
                setSearchParams((p) => ({ ...p, date: TOMORROW_YMD }));
                setAppliedSearch((p) => ({ ...p, date: TOMORROW_YMD }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${searchParams.date === TOMORROW_YMD ? 'border-primary text-primary bg-primary/10' : 'border-white/10 text-slate-300 hover:border-primary/40'}`}
            >
              Tomorrow
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Departure Time</h3>
              <div className="space-y-3">
                {DEPARTURE_SLOTS.map(({ label }) => (
                  <label key={label} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={selectedSlots.includes(label)}
                      onChange={() => toggleItem(setSelectedSlots, label)}
                      className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Bus Type</h3>
              <div className="space-y-3">
                {[...new Set(buses.map(b => b.busType).filter(Boolean))].map(type => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={selectedBusTypes.includes(type)}
                      onChange={() => toggleItem(setSelectedBusTypes, type)}
                      className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Max Price · <span className="text-primary">₹{maxPrice}</span>
              </h3>
              <input type="range" min={0} max={allMaxPrice} value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full h-2 bg-input-gray rounded-lg appearance-none cursor-pointer accent-primary" />
              <div className="flex justify-between mt-2 text-xs text-slate-400 font-bold">
                <span>₹0</span>
                <span>₹{allMaxPrice}</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                {AMENITY_OPTIONS.map(a => (
                  <button key={a} onClick={() => toggleItem(setSelectedAmenities, a)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      selectedAmenities.includes(a)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-white/10 bg-input-gray text-slate-300 hover:border-primary/50'
                    }`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {(selectedSlots.length > 0 || selectedBusTypes.length > 0 || selectedAmenities.length > 0) && (
              <button onClick={() => { setSelectedSlots([]); setSelectedBusTypes([]); setSelectedAmenities([]); setMaxPrice(allMaxPrice); }}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-white border border-white/10 rounded-lg transition-colors">
                Reset Filters
              </button>
            )}
          </aside>

          {/* Results */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {loadingBuses ? 'Searching...' : `${filteredBuses.length} Bus${filteredBuses.length !== 1 ? 'es' : ''} found`}
              </h2>
              <p className="text-xs text-slate-400">
                {appliedSearch.from} → {appliedSearch.to} on {appliedSearch.date}
              </p>
              {filteredBuses.length > 0 && (
                <div className="flex items-center gap-4 text-sm font-medium">
                  <span className="text-slate-400">Sort by:</span>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                    className="bg-transparent border-none text-primary font-bold focus:ring-0 cursor-pointer">
                    <option value="cheapest">Cheapest First</option>
                    <option value="earliest">Earliest First</option>
                  </select>
                </div>
              )}
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
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                <span className="material-symbols-outlined text-red-400 text-4xl mb-2">error</span>
                <p className="text-red-400 font-medium">{error}</p>
              </div>
            )}

            {!loadingBuses && !error && filteredBuses.length === 0 && (
              <div className="bg-charcoal border border-white/5 rounded-2xl p-12 text-center">
                <span className="material-symbols-outlined text-slate-600 text-6xl mb-4">search_off</span>
                <h3 className="text-xl font-bold text-white mb-2">No Buses Found</h3>
                <p className="text-slate-400">Try adjusting your filters or search for a different date</p>
              </div>
            )}

            {!loadingBuses && !error && filteredBuses.map((bus) => (
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
