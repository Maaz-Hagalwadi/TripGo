import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import HeaderAuth from '../../../shared/components/layout/HeaderAuth';
import { searchBuses } from '../../../api/busService';
import { useAuth } from '../../../shared/contexts/AuthContext';

const DEPARTURE_SLOTS = [
  { label: 'Early Morning (6am – 12pm)', start: 6, end: 12 },
  { label: 'Afternoon (12pm – 6pm)', start: 12, end: 18 },
  { label: 'Night (6pm – 12am)', start: 18, end: 24 },
];

const BUS_TYPE_OPTIONS = ['AC Sleeper', 'Luxury Volvo', 'Seater', 'Semi Sleeper', 'Electric'];
const AMENITY_OPTIONS = ['WiFi', 'USB Port', 'Meal', 'Blanket', 'AC'];

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useState({
    from: location.state?.from || '',
    to: location.state?.to || '',
    date: location.state?.date || new Date().toISOString().split('T')[0],
  });

  // Filter state
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [selectedBusTypes, setSelectedBusTypes] = useState([]);
  const [maxPrice, setMaxPrice] = useState(150);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [sortBy, setSortBy] = useState('cheapest');

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/'); return; }
    if (user.role && user.role !== 'USER') { navigate('/'); return; }
    if (searchParams.from && searchParams.to && searchParams.date) fetchBuses();
  }, [user, loading]);

  const fetchBuses = async () => {
    setLoadingBuses(true);
    setError(null);
    try {
      const data = await searchBuses(searchParams.from, searchParams.to, searchParams.date);
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
        const hour = parseInt(bus.departureTime?.split(':')[0] ?? '0');
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

    result = result.filter(bus => (bus.price ?? 0) <= maxPrice);

    if (selectedAmenities.length > 0) {
      result = result.filter(bus =>
        selectedAmenities.every(a =>
          bus.amenities?.some(ba => ba.toLowerCase().includes(a.toLowerCase()))
        )
      );
    }

    if (sortBy === 'cheapest') result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    else if (sortBy === 'earliest') result.sort((a, b) => (a.departureTime ?? '').localeCompare(b.departureTime ?? ''));

    return result;
  }, [buses, selectedSlots, selectedBusTypes, maxPrice, selectedAmenities, sortBy]);

  const handleUpdateSearch = () => {
    if (searchParams.from.trim() && searchParams.to.trim() && searchParams.date) fetchBuses();
  };

  return (
    <div className="bg-deep-black text-slate-100 min-h-screen">
      <HeaderAuth />

      {/* Search Bar */}
      <div className="bg-charcoal border-b border-white/5 py-4 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">location_on</span>
              <input value={searchParams.from} onChange={e => setSearchParams(p => ({ ...p, from: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm placeholder-silver-text focus:ring-1 focus:ring-primary outline-none"
                placeholder="Departure City" type="text" />
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">directions_bus</span>
              <input value={searchParams.to} onChange={e => setSearchParams(p => ({ ...p, to: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm placeholder-silver-text focus:ring-1 focus:ring-primary outline-none"
                placeholder="Destination City" type="text" />
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">calendar_today</span>
              <input value={searchParams.date} onChange={e => setSearchParams(p => ({ ...p, date: e.target.value }))}
                className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm outline-none"
                type="date" />
            </div>
            <button onClick={handleUpdateSearch}
              className="w-full bg-primary hover:bg-primary/90 text-black h-[42px] rounded-lg font-bold flex items-center justify-center gap-2 transition-all">
              <span className="material-symbols-outlined text-lg">sync</span> Update
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">

            {/* Departure Time */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Departure Time</h3>
              <div className="space-y-3">
                {DEPARTURE_SLOTS.map(({ label }) => (
                  <label key={label} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={selectedSlots.includes(label)}
                      onChange={() => toggleItem(setSelectedSlots, label)}
                      className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bus Type */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Bus Type</h3>
              <div className="space-y-3">
                {BUS_TYPE_OPTIONS.map(type => (
                  <label key={type} className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" checked={selectedBusTypes.includes(type)}
                      onChange={() => toggleItem(setSelectedBusTypes, type)}
                      className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black" />
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Max Price</h3>
              <input type="range" min={20} max={150} value={maxPrice}
                onChange={e => setMaxPrice(Number(e.target.value))}
                className="w-full h-2 bg-input-gray rounded-lg appearance-none cursor-pointer accent-primary" />
              <div className="flex justify-between mt-2 text-xs text-slate-400 font-bold">
                <span>$20</span>
                <span className="text-primary">${maxPrice}</span>
                <span>$150</span>
              </div>
            </div>

            {/* Amenities */}
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

            {/* Reset */}
            {(selectedSlots.length > 0 || selectedBusTypes.length > 0 || selectedAmenities.length > 0 || maxPrice < 150) && (
              <button onClick={() => { setSelectedSlots([]); setSelectedBusTypes([]); setSelectedAmenities([]); setMaxPrice(150); }}
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
                <p className="text-slate-400">Try adjusting your filters or search criteria</p>
              </div>
            )}

            {!loadingBuses && !error && filteredBuses.map((bus, index) => (
              <div key={index} className="bg-charcoal border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all">
                <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-primary">directions_bus</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg">{bus.busName}</h4>
                      <p className="text-xs text-slate-400 font-medium">{bus.busType}</p>
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-3 items-center text-center">
                    <div>
                      <p className="text-xl font-extrabold text-white">{bus.departureTime}</p>
                      <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">{searchParams.from}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{bus.duration}</p>
                      <div className="w-full h-px bg-white/10 relative">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/40 border border-primary"></div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xl font-extrabold text-white">{bus.arrivalTime}</p>
                      <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">{searchParams.to}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3 border-l border-white/5 pl-6">
                    <p className="text-2xl font-black text-primary">${bus.price}</p>
                    <button className="w-full bg-white/10 hover:bg-primary hover:text-black text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all">
                      Select Seat
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="bg-deep-black border-t border-white/5 pt-12 pb-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <span className="text-lg font-bold tracking-tight text-white">TripGo</span>
            <div className="text-slate-500 text-sm">© 2024 TripGo Inc. All rights reserved.</div>
            <div className="flex gap-6">
              <a className="text-slate-400 hover:text-white transition-colors text-sm" href="#">Privacy</a>
              <a className="text-slate-400 hover:text-white transition-colors text-sm" href="#">Terms</a>
              <a className="text-slate-400 hover:text-white transition-colors text-sm" href="#">Help</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SearchResults;
