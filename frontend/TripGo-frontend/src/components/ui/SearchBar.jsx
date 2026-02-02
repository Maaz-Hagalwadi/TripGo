import { useState, useEffect } from 'react';

const SearchBar = () => {
  const today = new Date().toISOString().split('T')[0];
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  const handleDateIconClick = () => {
    document.getElementById('dateInput').showPicker();
  };

  return (
    <div className="bg-charcoal/90 border border-white/10 p-2 md:p-6 rounded-2xl shadow-2xl w-full mx-auto backdrop-blur-xl">
      <div className={isMobile ? "grid grid-cols-1 gap-4 items-end" : "grid grid-cols-4 gap-4 items-end"}>
        <div className="flex flex-col text-left px-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1">From</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-3 text-silver-text text-xl z-10">location_on</span>
            <input 
              className="w-full pl-10 pr-4 py-4 bg-input-gray border border-white/10 rounded-xl text-white placeholder-silver-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
              placeholder="Departure City" 
              type="text"
            />
          </div>
        </div>
        
        <div className="flex flex-col text-left px-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1">To</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-3 text-silver-text text-xl z-10">directions_bus</span>
            <input 
              className="w-full pl-10 pr-4 py-4 bg-input-gray border border-white/10 rounded-xl text-white placeholder-silver-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none" 
              placeholder="Destination City" 
              type="text"
            />
          </div>
        </div>
        
        <div className="flex flex-col text-left px-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1">Date</span>
          <div className="relative">
            <span 
              className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-3 text-silver-text text-xl z-10 cursor-pointer" 
              onClick={handleDateIconClick}
            >
              calendar_today
            </span>
            <input 
              id="dateInput"
              className="w-full pl-10 pr-4 py-4 bg-input-gray border border-white/10 rounded-xl text-white placeholder-silver-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none [&::-webkit-calendar-picker-indicator]:hidden" 
              type="date" 
              min={today}
              defaultValue={today}
            />
          </div>
        </div>
        
        <div className="px-2">
          <button className="w-full bg-primary hover:bg-primary/90 text-black h-[60px] rounded-xl font-extrabold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)] transform hover:scale-[1.02]">
            <span className="material-symbols-outlined">search</span>
            Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;