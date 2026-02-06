import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import HeaderAuth from '../components/layout/HeaderAuth';
import { searchBuses } from '../api/busService';
import { useAuth } from '../contexts/AuthContext';
import TripGoIcon from '../assets/icons/TripGoIcon';

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
    date: location.state?.date || new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    console.log('SearchResults - User data:', user, 'loading:', loading);
    if (loading) return;
    
    if (!user) {
      console.log('SearchResults - No user, redirecting');
      navigate('/');
      return;
    }
    
    if (user.role && user.role !== 'USER') {
      console.log('SearchResults - Blocking access for role:', user.role);
      navigate('/');
      return;
    }
    
    if (searchParams.from && searchParams.to && searchParams.date) {
      fetchBuses();
    }
  }, [user, loading, navigate]);

  const fetchBuses = async () => {
    setLoadingBuses(true);
    setError(null);
    try {
      const data = await searchBuses(searchParams.from, searchParams.to, searchParams.date);
      setBuses(data || []);
    } catch (err) {
      setError('Failed to fetch buses. Please try again.');
      console.error(err);
    } finally {
      setLoadingBuses(false);
    }
  };

  const handleUpdateSearch = () => {
    if (searchParams.from.trim() && searchParams.to.trim() && searchParams.date) {
      fetchBuses();
    }
  };
  return (
    <div className="bg-deep-black text-slate-100 min-h-screen">
      {/* Header */}
      <HeaderAuth />

      {/* Search Bar */}
      <div className="bg-charcoal border-b border-white/5 py-4 sticky top-20 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">location_on</span>
              <input 
                value={searchParams.from}
                onChange={(e) => setSearchParams({...searchParams, from: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm placeholder-silver-text focus:ring-1 focus:ring-primary focus:border-transparent transition-all outline-none" 
                placeholder="Departure City" 
                type="text"
              />
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">directions_bus</span>
              <input 
                value={searchParams.to}
                onChange={(e) => setSearchParams({...searchParams, to: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm placeholder-silver-text focus:ring-1 focus:ring-primary focus:border-transparent transition-all outline-none" 
                placeholder="Destination City" 
                type="text"
              />
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">calendar_today</span>
              <input 
                value={searchParams.date}
                onChange={(e) => setSearchParams({...searchParams, date: e.target.value})}
                className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm placeholder-silver-text focus:ring-1 focus:ring-primary focus:border-transparent transition-all outline-none" 
                type="date"
              />
            </div>
            <button 
              onClick={handleUpdateSearch}
              className="w-full bg-primary hover:bg-primary/90 text-black h-[42px] rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,212,255,0.2)]"
            >
              <span className="material-symbols-outlined text-lg">sync</span>
              Update
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Departure Time</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black" type="checkbox"/>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Early Morning (6am - 12pm)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black" type="checkbox"/>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Afternoon (12pm - 6pm)</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black" type="checkbox"/>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Night (6pm - 12am)</span>
                </label>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Bus Type</h3>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black" type="checkbox"/>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">AC Sleeper</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black" type="checkbox"/>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Luxury Volvo</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded border-white/10 bg-input-gray text-primary focus:ring-primary focus:ring-offset-deep-black" type="checkbox"/>
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Electric Express</span>
                </label>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Price Range</h3>
              <input className="w-full h-2 bg-input-gray rounded-lg appearance-none cursor-pointer accent-primary" type="range"/>
              <div className="flex justify-between mt-2 text-xs text-slate-400 font-bold">
                <span>$20</span>
                <span>$150</span>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Amenities</h3>
              <div className="flex flex-wrap gap-2">
                <button className="px-3 py-1.5 rounded-lg border border-white/10 bg-input-gray text-xs text-slate-300 hover:border-primary/50 transition-all">WiFi</button>
                <button className="px-3 py-1.5 rounded-lg border border-white/10 bg-input-gray text-xs text-slate-300 hover:border-primary/50 transition-all">USB Port</button>
                <button className="px-3 py-1.5 rounded-lg border border-white/10 bg-input-gray text-xs text-slate-300 hover:border-primary/50 transition-all">Meal</button>
                <button className="px-3 py-1.5 rounded-lg border border-white/10 bg-input-gray text-xs text-slate-300 hover:border-primary/50 transition-all">Blanket</button>
              </div>
            </div>
          </aside>

          {/* Bus Results */}
          <div className="flex-1 space-y-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {loadingBuses ? 'Searching...' : `${buses.length} Buses found`}
              </h2>
              {buses.length > 0 && (
                <div className="flex items-center gap-4 text-sm font-medium">
                  <span className="text-slate-400">Sort by:</span>
                  <select className="bg-transparent border-none text-primary font-bold focus:ring-0 cursor-pointer">
                    <option>Cheapest First</option>
                    <option>Earliest First</option>
                    <option>Fastest First</option>
                  </select>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loadingBuses && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-slate-400">Searching for buses...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
                <span className="material-symbols-outlined text-red-400 text-4xl mb-2">error</span>
                <p className="text-red-400 font-medium">{error}</p>
              </div>
            )}

            {/* No Results */}
            {!loadingBuses && !error && buses.length === 0 && (
              <div className="bg-charcoal border border-white/5 rounded-2xl p-12 text-center">
                <span className="material-symbols-outlined text-slate-600 text-6xl mb-4">search_off</span>
                <h3 className="text-xl font-bold text-white mb-2">No Buses Found</h3>
                <p className="text-slate-400">Try adjusting your search criteria or date</p>
              </div>
            )}

            {/* Bus Cards */}
            {!loadingBuses && !error && buses.map((bus, index) => (
              <div key={index} className="bg-charcoal border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all group">
                <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center p-2">
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

      {/* Footer */}
      <footer className="bg-deep-black border-t border-white/5 pt-12 pb-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="text-primary">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path clipRule="evenodd" d="M12.0799 24L4 19.2479L9.95537 8.75216L18.04 13.4961L18.0446 4H29.9554L29.96 13.4961L38.0446 8.75216L44 19.2479L35.92 24L44 28.7521L38.0446 39.2479L29.96 34.5039L29.9554 44H18.0446L18.04 34.5039L9.95537 39.2479L4 28.7521L12.0799 24Z" fillRule="evenodd"></path>
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">TripGo</span>
            </div>
            <div className="text-slate-500 text-sm">
              © 2023 TripGo Inc. All rights reserved.
            </div>
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