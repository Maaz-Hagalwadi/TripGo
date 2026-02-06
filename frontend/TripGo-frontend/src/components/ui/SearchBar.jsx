import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [isMobile, setIsMobile] = useState(false);
  const [formData, setFormData] = useState({
    from: '',
    to: '',
    date: today
  });
  const [errors, setErrors] = useState({});
  
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.from.trim()) {
      newErrors.from = 'Departure city is required';
    }
    
    if (!formData.to.trim()) {
      newErrors.to = 'Destination city is required';
    }
    
    if (!formData.date) {
      newErrors.date = 'Travel date is required';
    }
    
    if (formData.from.trim() && formData.to.trim() && formData.from.toLowerCase() === formData.to.toLowerCase()) {
      newErrors.to = 'Destination must be different from departure city';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSearch = () => {
    if (validateForm()) {
      navigate('/search-results', { 
        state: { 
          from: formData.from.trim(),
          to: formData.to.trim(),
          date: formData.date
        } 
      });
    }
  };

  return (
    <div className="bg-charcoal/90 border border-white/10 p-2 md:p-6 rounded-2xl shadow-2xl w-full mx-auto backdrop-blur-xl">
      <div className={isMobile ? "grid grid-cols-1 gap-4 items-end" : "grid grid-cols-4 gap-4 items-end"}>
        <div className="flex flex-col text-left px-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1">From</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-3 text-silver-text text-xl z-10">location_on</span>
            <input 
              value={formData.from}
              onChange={(e) => handleInputChange('from', e.target.value)}
              className={`w-full pl-10 pr-4 py-4 bg-input-gray border rounded-xl text-white placeholder-silver-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none ${
                errors.from ? 'border-red-500' : 'border-white/10'
              }`}
              placeholder="Departure City" 
              type="text"
            />
          </div>
          {errors.from && <span className="text-red-400 text-xs mt-1 ml-1">{errors.from}</span>}
        </div>
        
        <div className="flex flex-col text-left px-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1">To</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-3 text-silver-text text-xl z-10">directions_bus</span>
            <input 
              value={formData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              className={`w-full pl-10 pr-4 py-4 bg-input-gray border rounded-xl text-white placeholder-silver-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none ${
                errors.to ? 'border-red-500' : 'border-white/10'
              }`}
              placeholder="Destination City" 
              type="text"
            />
          </div>
          {errors.to && <span className="text-red-400 text-xs mt-1 ml-1">{errors.to}</span>}
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
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className={`w-full pl-10 pr-4 py-4 bg-input-gray border rounded-xl text-white placeholder-silver-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none [&::-webkit-calendar-picker-indicator]:hidden ${
                errors.date ? 'border-red-500' : 'border-white/10'
              }`}
              type="date" 
              min={today}
            />
          </div>
          {errors.date && <span className="text-red-400 text-xs mt-1 ml-1">{errors.date}</span>}
        </div>
        
        <div className="px-2">
          <button 
            onClick={handleSearch}
            className="w-full bg-primary hover:bg-primary/90 text-black h-[60px] rounded-xl font-extrabold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)] transform hover:scale-[1.02]"
          >
            <span className="material-symbols-outlined">search</span>
            Search
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;