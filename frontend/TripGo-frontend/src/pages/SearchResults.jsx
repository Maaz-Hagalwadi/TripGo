import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TripGoIcon from '../assets/icons/TripGoIcon';

const SearchResults = () => {
  return (
    <div className="bg-deep-black text-slate-100 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-deep-black/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="text-primary">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path clipRule="evenodd" d="M12.0799 24L4 19.2479L9.95537 8.75216L18.04 13.4961L18.0446 4H29.9554L29.96 13.4961L38.0446 8.75216L44 19.2479L35.92 24L44 28.7521L38.0446 39.2479L29.96 34.5039L29.9554 44H18.0446L18.04 34.5039L9.95537 39.2479L4 28.7521L12.0799 24Z" fillRule="evenodd"></path>
                </svg>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white">TripGo</span>
            </div>
            <div className="flex items-center gap-6">
              <button className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">Support</button>
              <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full text-sm font-bold transition-all">My Profile</button>
            </div>
          </div>
        </div>
      </header>

      {/* Search Bar */}
      <div className="bg-charcoal border-b border-white/5 py-4 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">location_on</span>
              <input className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm placeholder-silver-text focus:ring-1 focus:ring-primary focus:border-transparent transition-all outline-none" placeholder="Departure City" type="text" defaultValue="San Francisco"/>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">directions_bus</span>
              <input className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm placeholder-silver-text focus:ring-1 focus:ring-primary focus:border-transparent transition-all outline-none" placeholder="Destination City" type="text" defaultValue="Los Angeles"/>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-silver-text z-10 text-xl">calendar_today</span>
              <input className="w-full pl-10 pr-4 py-2.5 bg-input-gray border border-white/10 rounded-lg text-white text-sm placeholder-silver-text focus:ring-1 focus:ring-primary focus:border-transparent transition-all outline-none" placeholder="Oct 25, 2023" type="text" defaultValue="Oct 25, 2023"/>
            </div>
            <button className="w-full bg-primary hover:bg-primary/90 text-black h-[42px] rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,212,255,0.2)]">
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
              <h2 className="text-xl font-bold text-white">24 Buses found</h2>
              <div className="flex items-center gap-4 text-sm font-medium">
                <span className="text-slate-400">Sort by:</span>
                <select className="bg-transparent border-none text-primary font-bold focus:ring-0 cursor-pointer">
                  <option>Cheapest First</option>
                  <option>Earliest First</option>
                  <option>Fastest First</option>
                </select>
              </div>
            </div>

            {/* Bus Card 1 */}
            <div className="bg-charcoal border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all group">
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center p-2">
                    <span className="material-symbols-outlined text-3xl text-primary">electric_bolt</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Bolt Express</h4>
                    <p className="text-xs text-slate-400 font-medium">AC Sleeper (2+1)</p>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-3 items-center text-center">
                  <div>
                    <p className="text-xl font-extrabold text-white">08:30</p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">San Francisco</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">6h 15m</p>
                    <div className="w-full h-px bg-white/10 relative">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/40 border border-primary"></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-white">14:45</p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">Los Angeles</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 border-l border-white/5 pl-6">
                  <p className="text-2xl font-black text-primary">$45.00</p>
                  <button className="w-full bg-white/10 hover:bg-primary hover:text-black text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all">
                    Select Seat
                  </button>
                </div>
              </div>
            </div>

            {/* Bus Card 2 */}
            <div className="bg-charcoal border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all group">
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center p-2">
                    <span className="material-symbols-outlined text-3xl text-accent">stars</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Skyline Gold</h4>
                    <p className="text-xs text-slate-400 font-medium">Premium Multi-Axle</p>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-3 items-center text-center">
                  <div>
                    <p className="text-xl font-extrabold text-white">10:00</p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">San Francisco</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">5h 45m</p>
                    <div className="w-full h-px bg-white/10 relative">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/40 border border-primary"></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-white">15:45</p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">Los Angeles</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 border-l border-white/5 pl-6">
                  <p className="text-2xl font-black text-primary">$62.50</p>
                  <button className="w-full bg-white/10 hover:bg-primary hover:text-black text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all">
                    Select Seat
                  </button>
                </div>
              </div>
            </div>

            {/* Bus Card 3 */}
            <div className="bg-charcoal border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all group">
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center p-2">
                    <span className="material-symbols-outlined text-3xl text-slate-400">commute</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">City Runner</h4>
                    <p className="text-xs text-slate-400 font-medium">Standard Non-AC</p>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-3 items-center text-center">
                  <div>
                    <p className="text-xl font-extrabold text-white">22:15</p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">San Francisco</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">7h 00m</p>
                    <div className="w-full h-px bg-white/10 relative">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/40 border border-primary"></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-white">05:15</p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">Los Angeles</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 border-l border-white/5 pl-6">
                  <p className="text-2xl font-black text-primary">$24.99</p>
                  <button className="w-full bg-white/10 hover:bg-primary hover:text-black text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all">
                    Select Seat
                  </button>
                </div>
              </div>
            </div>

            {/* Bus Card 4 */}
            <div className="bg-charcoal border border-white/5 rounded-2xl p-6 hover:border-primary/30 transition-all group">
              <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center p-2">
                    <span className="material-symbols-outlined text-3xl text-primary">eco</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-lg">Green Travel</h4>
                    <p className="text-xs text-slate-400 font-medium">Electric Semi-Sleeper</p>
                  </div>
                </div>
                <div className="md:col-span-2 grid grid-cols-3 items-center text-center">
                  <div>
                    <p className="text-xl font-extrabold text-white">13:30</p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">San Francisco</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">6h 45m</p>
                    <div className="w-full h-px bg-white/10 relative">
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/40 border border-primary"></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xl font-extrabold text-white">20:15</p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">Los Angeles</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 border-l border-white/5 pl-6">
                  <p className="text-2xl font-black text-primary">$38.00</p>
                  <button className="w-full bg-white/10 hover:bg-primary hover:text-black text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all">
                    Select Seat
                  </button>
                </div>
              </div>
            </div>
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