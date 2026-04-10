import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCities } from '../../../api/routeService';

const SEARCH_DRAFT_STORAGE_KEY = 'tripgo_search_draft';
const toCityKey = (value) => String(value || '').trim().toLowerCase();

const toDisplayCityName = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeCityOptions = (list) => {
  const unique = new Map();

  list.forEach((entry) => {
    const rawName = typeof entry === 'string' ? entry : entry?.name;
    const normalizedName = String(rawName || '').trim();
    const key = toCityKey(normalizedName);
    if (!key) return;

    const nextOption = {
      value: normalizedName,
      label: toDisplayCityName(normalizedName),
    };

    if (!unique.has(key)) {
      unique.set(key, nextOption);
      return;
    }

    const existing = unique.get(key);
    const shouldReplace = existing.label === existing.value && nextOption.label !== nextOption.value;
    if (shouldReplace) unique.set(key, nextOption);
  });

  return [...unique.values()];
};

const SearchBar = ({
  showQuickDates = true,
  persistDraft = true,
  initialValues = null,
  submitLabel = 'Search',
  submitIcon = 'search',
  onSubmit = null,
}) => {
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const storedDraft = (() => {
    if (!persistDraft) return null;
    try {
      const raw = localStorage.getItem(SEARCH_DRAFT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const [isMobile, setIsMobile] = useState(false);
  const [cities, setCities] = useState([]);
  const resolvedInitialValues = {
    from: initialValues?.from || storedDraft?.from || '',
    to: initialValues?.to || storedDraft?.to || '',
    date: initialValues?.date || storedDraft?.date || today,
  };
  const [formData, setFormData] = useState({
    from: resolvedInitialValues.from,
    to: resolvedInitialValues.to,
    date: resolvedInitialValues.date,
  });
  const [errors, setErrors] = useState({});
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromSearch, setFromSearch] = useState(resolvedInitialValues.from ? toDisplayCityName(resolvedInitialValues.from) : '');
  const [toSearch, setToSearch] = useState(resolvedInitialValues.to ? toDisplayCityName(resolvedInitialValues.to) : '');
  const fromRef = useRef(null);
  const toRef = useRef(null);
  
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  useEffect(() => {
    const fetchCities = async () => {
      const data = await getCities();
      setCities(normalizeCityOptions(Array.isArray(data) ? data : []));
    };
    fetchCities();
  }, []);

  useEffect(() => {
    setFormData({
      from: initialValues?.from || '',
      to: initialValues?.to || '',
      date: initialValues?.date || today,
    });
    setFromSearch(initialValues?.from ? toDisplayCityName(initialValues.from) : '');
    setToSearch(initialValues?.to ? toDisplayCityName(initialValues.to) : '');
  }, [initialValues?.date, initialValues?.from, initialValues?.to, today]);

  useEffect(() => {
    if (!persistDraft) return;
    try {
      localStorage.setItem(SEARCH_DRAFT_STORAGE_KEY, JSON.stringify(formData));
    } catch {
      // ignore storage errors
    }
  }, [formData, persistDraft]);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (fromRef.current && !fromRef.current.contains(event.target)) {
        setShowFromDropdown(false);
      }
      if (toRef.current && !toRef.current.contains(event.target)) {
        setShowToDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleDateIconClick = () => {
    document.getElementById('dateInput').showPicker();
  };

  const filteredFromCities = cities.filter((city) =>
    city.label.toLowerCase().includes(fromSearch.toLowerCase())
  );
  
  const filteredToCities = cities.filter((city) =>
    city.label.toLowerCase().includes(toSearch.toLowerCase())
  );
  
  const handleFromSelect = (cityOption) => {
    setFormData(prev => ({ ...prev, from: cityOption.value }));
    setFromSearch(cityOption.label);
    setShowFromDropdown(false);
    if (errors.from) {
      setErrors(prev => ({ ...prev, from: '' }));
    }
  };
  
  const handleToSelect = (cityOption) => {
    setFormData(prev => ({ ...prev, to: cityOption.value }));
    setToSearch(cityOption.label);
    setShowToDropdown(false);
    if (errors.to) {
      setErrors(prev => ({ ...prev, to: '' }));
    }
  };
  
  const handleSwap = () => {
    const tempFrom = formData.from;
    const tempFromSearch = fromSearch;
    setFormData(prev => ({ ...prev, from: prev.to, to: tempFrom }));
    setFromSearch(toSearch);
    setToSearch(tempFromSearch);
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

  const getCanonicalCity = (value) => {
    const key = toCityKey(value);
    if (!key) return '';
    return cities.find((city) => toCityKey(city.value) === key)?.value || value.trim();
  };

  const handleSearch = () => {
    if (validateForm()) {
      const canonicalFrom = getCanonicalCity(formData.from);
      const canonicalTo = getCanonicalCity(formData.to);
      const payload = {
        from: canonicalFrom,
        to: canonicalTo,
        date: formData.date,
      };
      if (onSubmit) {
        onSubmit(payload);
        return;
      }
      navigate('/search-results', { state: payload });
    }
  };

  return (
    <div className="bg-charcoal/90 border border-white/10 p-2 md:p-6 rounded-2xl shadow-2xl w-full mx-auto backdrop-blur-xl">
      <div className={isMobile ? "grid grid-cols-1 gap-4 items-end" : "flex gap-4 items-end"}>
        <div className="flex flex-col text-left px-2 flex-1" ref={fromRef}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1">From</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-3 text-silver-text text-xl z-10">location_on</span>
            <input 
              value={fromSearch}
              onChange={(e) => {
                setFromSearch(e.target.value);
                setFormData(prev => ({ ...prev, from: e.target.value }));
                setShowFromDropdown(true);
                if (errors.from) setErrors(prev => ({ ...prev, from: '' }));
              }}
              onFocus={() => setShowFromDropdown(true)}
              className={`w-full pl-10 pr-4 py-4 bg-input-gray border rounded-xl text-white placeholder-silver-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none ${
                errors.from ? 'border-red-500' : 'border-white/10'
              }`}
              placeholder="Departure City" 
              type="text"
            />
            {showFromDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-charcoal border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                {filteredFromCities.length > 0 ? (
                  filteredFromCities.map((city) => (
                    <div
                      key={city.value.toLowerCase()}
                      onClick={() => handleFromSelect(city)}
                      className="px-4 py-3 hover:bg-primary/10 cursor-pointer text-white border-b border-white/5 last:border-0"
                    >
                      <span className="material-symbols-outlined text-sm text-slate-400 mr-2 align-middle">location_on</span>
                      {city.label}
                    </div>
                  ))
                ) : fromSearch.length > 0 ? (
                  <div className="px-4 py-3 text-slate-400 text-sm">No matching cities — you can still search</div>
                ) : null}
              </div>
            )}
          </div>
          {errors.from && <span className="text-red-400 text-xs mt-1 ml-1">{errors.from}</span>}
        </div>
        
        <button
          onClick={handleSwap}
          className={`${isMobile ? 'mx-auto' : 'mb-2'} w-10 h-10 flex-shrink-0 bg-white/5 hover:bg-primary/20 border border-white/10 rounded-full flex items-center justify-center text-primary transition-all`}
          title="Swap cities"
        >
          <span className="material-symbols-outlined text-xl">{isMobile ? 'swap_vert' : 'swap_horiz'}</span>
        </button>
        
        <div className="flex flex-col text-left px-2 flex-1" ref={toRef}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1">To</span>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-3 text-silver-text text-xl z-10">directions_bus</span>
            <input 
              value={toSearch}
              onChange={(e) => {
                setToSearch(e.target.value);
                setFormData(prev => ({ ...prev, to: e.target.value }));
                setShowToDropdown(true);
                if (errors.to) setErrors(prev => ({ ...prev, to: '' }));
              }}
              onFocus={() => setShowToDropdown(true)}
              className={`w-full pl-10 pr-4 py-4 bg-input-gray border rounded-xl text-white placeholder-silver-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none ${
                errors.to ? 'border-red-500' : 'border-white/10'
              }`}
              placeholder="Destination City" 
              type="text"
            />
            {showToDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-charcoal border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                {filteredToCities.length > 0 ? (
                  filteredToCities.map((city) => (
                    <div
                      key={city.value.toLowerCase()}
                      onClick={() => handleToSelect(city)}
                      className="px-4 py-3 hover:bg-primary/10 cursor-pointer text-white border-b border-white/5 last:border-0"
                    >
                      <span className="material-symbols-outlined text-sm text-slate-400 mr-2 align-middle">location_on</span>
                      {city.label}
                    </div>
                  ))
                ) : toSearch.length > 0 ? (
                  <div className="px-4 py-3 text-slate-400 text-sm">No matching cities — you can still search</div>
                ) : null}
              </div>
            )}
          </div>
          {errors.to && <span className="text-red-400 text-xs mt-1 ml-1">{errors.to}</span>}
        </div>
        
        <div className="flex flex-col text-left px-2 flex-1">
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
              onChange={(e) => {
                setFormData(prev => ({ ...prev, date: e.target.value }));
                if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
              }}
              className={`w-full pl-10 pr-4 py-4 bg-input-gray border rounded-xl text-white placeholder-silver-text focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none [&::-webkit-calendar-picker-indicator]:hidden ${
                errors.date ? 'border-red-500' : 'border-white/10'
              }`}
              type="date" 
              min={today}
            />
          </div>
          {showQuickDates && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { label: 'Today', value: today },
                { label: 'Tomorrow', value: tomorrow },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, date: item.value }));
                    if (errors.date) setErrors((prev) => ({ ...prev, date: '' }));
                  }}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    formData.date === item.value
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:border-primary/40'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
          {errors.date && <span className="text-red-400 text-xs mt-1 ml-1">{errors.date}</span>}
        </div>
        
        <div className="px-2 flex-shrink-0 min-w-[160px]">
          <button 
            onClick={handleSearch}
            className="w-full bg-primary hover:bg-primary/90 text-black h-[60px] rounded-xl font-extrabold flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(0,212,255,0.3)] transform hover:scale-[1.02] whitespace-nowrap"
          >
            <span className="material-symbols-outlined">{submitIcon}</span>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
