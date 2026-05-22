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
    const nextOption = { value: normalizedName, label: toDisplayCityName(normalizedName) };
    if (!unique.has(key)) { unique.set(key, nextOption); return; }
    const existing = unique.get(key);
    if (existing.label === existing.value && nextOption.label !== nextOption.value) unique.set(key, nextOption);
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
  variant = 'dark',
  compact = false,
}) => {
  const navigate = useNavigate();
  const isLight = variant === 'light';
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const storedDraft = (() => {
    if (!persistDraft) return null;
    try { const raw = localStorage.getItem(SEARCH_DRAFT_STORAGE_KEY); return raw ? JSON.parse(raw) : null; }
    catch { return null; }
  })();

  const [isMobile, setIsMobile] = useState(false);
  const [cities, setCities] = useState([]);
  const resolvedInitialValues = {
    from: initialValues?.from || storedDraft?.from || '',
    to: initialValues?.to || storedDraft?.to || '',
    date: initialValues?.date || storedDraft?.date || today,
  };
  const [formData, setFormData] = useState({ from: resolvedInitialValues.from, to: resolvedInitialValues.to, date: resolvedInitialValues.date });
  const [errors, setErrors] = useState({});
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [fromSearch, setFromSearch] = useState(resolvedInitialValues.from ? toDisplayCityName(resolvedInitialValues.from) : '');
  const [toSearch, setToSearch] = useState(resolvedInitialValues.to ? toDisplayCityName(resolvedInitialValues.to) : '');
  const fromRef = useRef(null);
  const toRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    getCities().then(data => setCities(normalizeCityOptions(Array.isArray(data) ? data : [])));
  }, []);

  useEffect(() => {
    setFormData({ from: initialValues?.from || '', to: initialValues?.to || '', date: initialValues?.date || today });
    setFromSearch(initialValues?.from ? toDisplayCityName(initialValues.from) : '');
    setToSearch(initialValues?.to ? toDisplayCityName(initialValues.to) : '');
  }, [initialValues?.date, initialValues?.from, initialValues?.to, today]);

  useEffect(() => {
    if (!persistDraft) return;
    try { localStorage.setItem(SEARCH_DRAFT_STORAGE_KEY, JSON.stringify(formData)); } catch {}
  }, [formData, persistDraft]);

  useEffect(() => {
    const handle = (e) => {
      if (fromRef.current && !fromRef.current.contains(e.target)) setShowFromDropdown(false);
      if (toRef.current && !toRef.current.contains(e.target)) setShowToDropdown(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const handleDateIconClick = () => document.getElementById('dateInput').showPicker?.();

  const filteredFromCities = cities.filter(c => c.label.toLowerCase().includes(fromSearch.toLowerCase()));
  const filteredToCities = cities.filter(c => c.label.toLowerCase().includes(toSearch.toLowerCase()));

  const handleFromSelect = (city) => {
    setFormData(p => ({ ...p, from: city.value }));
    setFromSearch(city.label);
    setShowFromDropdown(false);
    setErrors(p => ({ ...p, from: '' }));
  };
  const handleToSelect = (city) => {
    setFormData(p => ({ ...p, to: city.value }));
    setToSearch(city.label);
    setShowToDropdown(false);
    setErrors(p => ({ ...p, to: '' }));
  };
  const handleSwap = () => {
    const pf = formData.from; const pfs = fromSearch;
    setFormData(p => ({ ...p, from: p.to, to: pf }));
    setFromSearch(toSearch); setToSearch(pfs);
  };

  const validateForm = () => {
    const e = {};
    if (!formData.from.trim()) e.from = 'Departure city is required';
    if (!formData.to.trim()) e.to = 'Destination city is required';
    if (!formData.date) e.date = 'Travel date is required';
    if (formData.from.trim() && formData.to.trim() && formData.from.toLowerCase() === formData.to.toLowerCase())
      e.to = 'Destination must differ from departure';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getCanonicalCity = (value) => {
    const key = toCityKey(value);
    return cities.find(c => toCityKey(c.value) === key)?.value || value.trim();
  };

  const handleSearch = () => {
    if (!validateForm()) return;
    const payload = { from: getCanonicalCity(formData.from), to: getCanonicalCity(formData.to), date: formData.date };
    if (onSubmit) { onSubmit(payload); return; }
    navigate('/search-results', { state: payload });
  };

  /* ── Style tokens ── */
  const S = isLight ? {
    wrapper: 'bg-transparent p-0 md:bg-white md:border md:border-slate-200 md:p-5 rounded-2xl md:shadow-sm w-full mx-auto',
    label: 'text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 ml-1',
    input: 'w-full pl-10 pr-4 py-3.5 bg-slate-50 border rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] focus:bg-white transition-all outline-none',
    inputErr: 'border-red-400',
    inputOk: 'border-slate-200',
    icon: 'text-slate-400',
    dropdown: 'absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto z-50',
    dropdownItem: 'px-4 py-3 text-slate-700 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-sm',
    dropdownEmpty: 'px-4 py-3 text-slate-400 text-sm',
    swapBtn: 'mb-2 w-10 h-10 flex-shrink-0 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-full flex items-center justify-center text-[#002046] transition-all',
    quickPillActive: 'border-[#002046] bg-[#002046]/10 text-[#002046]',
    quickPillInactive: 'border-slate-200 bg-slate-50 text-slate-500 hover:border-[#002046]/40',
    searchBtn: `w-full bg-[#002046] hover:bg-[#001533] text-white ${compact ? 'h-[38px]' : 'h-[52px] md:h-[54px]'} rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 transition-all`,
    // mobile
    mobileCard: 'rounded-xl border border-slate-200 bg-white shadow-sm',
    mobileInput: 'w-full pl-9 pr-4 py-2 bg-transparent border-0 text-sm text-slate-900 placeholder-slate-400 focus:outline-none',
    mobileDivider: 'border-slate-100',
    mobileSwap: 'absolute right-4 -top-5 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-[#002046] z-20 shadow-sm',
    mobileDropdown: 'absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto z-[9999]',
    mobileDropdownItem: 'px-4 py-3 text-slate-700 hover:bg-slate-50 cursor-pointer text-sm border-b border-slate-100 last:border-0',
    mobileSearchBtn: 'w-auto self-end bg-[#002046] hover:bg-[#001533] text-white h-[36px] px-5 rounded-lg font-bold text-sm flex items-center justify-center gap-1.5 transition-all mt-3',
  } : {
    wrapper: 'bg-transparent md:bg-charcoal/90 border-0 md:border md:border-white/10 p-0 md:p-6 rounded-2xl md:shadow-2xl w-full mx-auto md:backdrop-blur-xl',
    label: 'text-xs font-bold text-slate-400 uppercase tracking-[0.1em] mb-2 ml-1',
    input: 'w-full pl-10 pr-4 py-4 bg-input-gray border rounded-xl text-base text-white placeholder-silver-text focus:ring-2 focus:ring-white/30 focus:border-transparent transition-all outline-none',
    inputErr: 'border-red-500',
    inputOk: 'border-white/10',
    icon: 'text-silver-text',
    dropdown: 'absolute top-full left-0 right-0 mt-2 bg-charcoal border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50',
    dropdownItem: 'px-4 py-3 text-white hover:bg-primary/10 cursor-pointer border-b border-white/5 last:border-0',
    dropdownEmpty: 'px-4 py-3 text-slate-400 text-sm',
    swapBtn: 'mb-2 w-10 h-10 flex-shrink-0 bg-white/5 hover:bg-primary/20 border border-white/10 rounded-full flex items-center justify-center text-primary transition-all',
    quickPillActive: 'border-primary bg-primary/15 text-primary',
    quickPillInactive: 'border-white/10 bg-white/5 text-slate-300 hover:border-primary/40',
    searchBtn: 'w-full bg-slate-900 hover:bg-slate-700 text-white h-[52px] md:h-[60px] rounded-xl font-extrabold text-base flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] whitespace-nowrap',
    // mobile
    mobileCard: 'rounded-xl border border-white/20 bg-charcoal/90 backdrop-blur-xl shadow-2xl',
    mobileInput: 'w-full pl-9 pr-4 py-2 bg-transparent border-0 text-xs text-white placeholder-silver-text focus:outline-none',
    mobileDivider: 'border-white/10',
    mobileSwap: 'absolute right-4 -top-5 w-10 h-10 bg-charcoal/90 border border-white/20 rounded-full flex items-center justify-center text-primary z-20',
    mobileDropdown: 'absolute top-full left-0 right-0 mt-1 bg-charcoal border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-[9999]',
    mobileDropdownItem: 'px-4 py-3 hover:bg-primary/10 cursor-pointer text-white text-sm border-b border-white/5 last:border-0',
    mobileSearchBtn: 'w-full bg-slate-900 hover:bg-slate-700 text-white h-[52px] rounded-xl font-extrabold text-base flex items-center justify-center gap-2 transition-all',
  };

  return (
    <div className={S.wrapper}>
      <div className={isMobile ? 'flex flex-col' : 'flex gap-4 items-end'}>

        {isMobile ? (
          <>
            <div className={S.mobileCard}>
              {/* From */}
              <div className="flex flex-col text-left px-2 pt-2 pb-1" ref={fromRef}>
                <span className={`text-[10px] font-bold uppercase tracking-[0.1em] mb-0.5 ml-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>From</span>
                <div className="relative">
                  <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg z-10 ${S.icon}`}>location_on</span>
                  <input
                    value={fromSearch}
                    onChange={e => { setFromSearch(e.target.value); setFormData(p => ({ ...p, from: e.target.value })); setShowFromDropdown(true); setErrors(p => ({ ...p, from: '' })); }}
                    onFocus={() => setShowFromDropdown(true)}
                    className={`${S.mobileInput} ${errors.from ? 'placeholder-red-400' : ''}`}
                    placeholder="Departure City" type="text"
                  />
                  {showFromDropdown && filteredFromCities.length > 0 && (
                    <div className={S.mobileDropdown}>
                      {filteredFromCities.map(city => (
                        <div key={city.value.toLowerCase()} onClick={() => handleFromSelect(city)} className={S.mobileDropdownItem}>
                          <span className="material-symbols-outlined text-sm text-slate-400 mr-2 align-middle">location_on</span>{city.label}
                        </div>
                      ))}
                    </div>
                  )}
                  {showFromDropdown && filteredFromCities.length === 0 && fromSearch.length > 0 && (
                    <div className={`${S.mobileDropdown} px-4 py-3 ${isLight ? 'text-slate-400' : 'text-slate-400'} text-sm`}>No matching cities</div>
                  )}
                </div>
                {errors.from && <span className="text-red-400 text-xs mt-1 ml-1">{errors.from}</span>}
              </div>

              <div className={`relative border-t ${S.mobileDivider}`}>
                <button onClick={handleSwap} className={S.mobileSwap} title="Swap">
                  <span className="material-symbols-outlined text-xl">swap_vert</span>
                </button>
              </div>

              {/* To */}
              <div className="flex flex-col text-left px-2 pt-2 pb-1" ref={toRef}>
                <span className={`text-[10px] font-bold uppercase tracking-[0.1em] mb-0.5 ml-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>To</span>
                <div className="relative">
                  <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg z-10 ${S.icon}`}>directions_bus</span>
                  <input
                    value={toSearch}
                    onChange={e => { setToSearch(e.target.value); setFormData(p => ({ ...p, to: e.target.value })); setShowToDropdown(true); setErrors(p => ({ ...p, to: '' })); }}
                    onFocus={() => setShowToDropdown(true)}
                    className={`${S.mobileInput} ${errors.to ? 'placeholder-red-400' : ''}`}
                    placeholder="Destination City" type="text"
                  />
                  {showToDropdown && filteredToCities.length > 0 && (
                    <div className={S.mobileDropdown}>
                      {filteredToCities.map(city => (
                        <div key={city.value.toLowerCase()} onClick={() => handleToSelect(city)} className={S.mobileDropdownItem}>
                          <span className="material-symbols-outlined text-sm text-slate-400 mr-2 align-middle">location_on</span>{city.label}
                        </div>
                      ))}
                    </div>
                  )}
                  {showToDropdown && filteredToCities.length === 0 && toSearch.length > 0 && (
                    <div className={`${S.mobileDropdown} px-4 py-3 text-slate-400 text-sm`}>No matching cities</div>
                  )}
                </div>
                {errors.to && <span className="text-red-400 text-xs mt-1 ml-1">{errors.to}</span>}
              </div>

              <div className={`border-t ${S.mobileDivider}`} />

              {/* Date */}
              <div className="flex flex-col text-left px-2 pt-2 pb-2">
                <span className={`text-[10px] font-bold uppercase tracking-[0.1em] mb-0.5 ml-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Date</span>
                <div className="relative">
                  <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-lg z-10 cursor-pointer ${S.icon}`} onClick={handleDateIconClick}>calendar_today</span>
                  <input
                    id="dateInput"
                    value={formData.date}
                    onChange={e => { setFormData(p => ({ ...p, date: e.target.value })); setErrors(p => ({ ...p, date: '' })); }}
                    className={`${S.mobileInput} [&::-webkit-calendar-picker-indicator]:hidden`}
                    type="date" min={today}
                  />
                </div>
                {showQuickDates && (
                  <div className="mt-2 flex flex-wrap gap-2 px-1">
                    {[{ label: 'Today', value: today }, { label: 'Tomorrow', value: tomorrow }].map(item => (
                      <button key={item.value} type="button"
                        onClick={() => { setFormData(p => ({ ...p, date: item.value })); setErrors(p => ({ ...p, date: '' })); }}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${formData.date === item.value ? S.quickPillActive : S.quickPillInactive}`}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
                {errors.date && <span className="text-red-400 text-xs mt-1 ml-1">{errors.date}</span>}
              </div>
            </div>

            <button onClick={handleSearch} className={S.mobileSearchBtn}>
              <span className="material-symbols-outlined text-[22px]">{submitIcon}</span>
              {submitLabel}
            </button>
          </>
        ) : (
          /* Desktop */
          <>
            {/* From */}
            <div className="flex flex-col text-left px-2 flex-1" ref={fromRef}>
              <span className={S.label}>From</span>
              <div className="relative">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-3 text-xl z-10 ${S.icon}`}>location_on</span>
                <input
                  value={fromSearch}
                  onChange={e => { setFromSearch(e.target.value); setFormData(p => ({ ...p, from: e.target.value })); setShowFromDropdown(true); setErrors(p => ({ ...p, from: '' })); }}
                  onFocus={() => setShowFromDropdown(true)}
                  className={`${S.input} ${errors.from ? S.inputErr : S.inputOk}`}
                  placeholder="Departure City" type="text"
                />
                {showFromDropdown && (
                  <div className={S.dropdown}>
                    {filteredFromCities.length > 0
                      ? filteredFromCities.map(city => (
                          <div key={city.value.toLowerCase()} onClick={() => handleFromSelect(city)} className={S.dropdownItem}>
                            <span className="material-symbols-outlined text-sm text-slate-400 mr-2 align-middle">location_on</span>{city.label}
                          </div>
                        ))
                      : fromSearch.length > 0
                        ? <div className={S.dropdownEmpty}>No matching cities — you can still search</div>
                        : null
                    }
                  </div>
                )}
              </div>
              {errors.from && <span className="text-red-400 text-xs mt-1 ml-1">{errors.from}</span>}
            </div>

            <button onClick={handleSwap} className={S.swapBtn} title="Swap cities">
              <span className="material-symbols-outlined text-xl">swap_horiz</span>
            </button>

            {/* To */}
            <div className="flex flex-col text-left px-2 flex-1" ref={toRef}>
              <span className={S.label}>To</span>
              <div className="relative">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-3 text-xl z-10 ${S.icon}`}>directions_bus</span>
                <input
                  value={toSearch}
                  onChange={e => { setToSearch(e.target.value); setFormData(p => ({ ...p, to: e.target.value })); setShowToDropdown(true); setErrors(p => ({ ...p, to: '' })); }}
                  onFocus={() => setShowToDropdown(true)}
                  className={`${S.input} ${errors.to ? S.inputErr : S.inputOk}`}
                  placeholder="Destination City" type="text"
                />
                {showToDropdown && (
                  <div className={S.dropdown}>
                    {filteredToCities.length > 0
                      ? filteredToCities.map(city => (
                          <div key={city.value.toLowerCase()} onClick={() => handleToSelect(city)} className={S.dropdownItem}>
                            <span className="material-symbols-outlined text-sm text-slate-400 mr-2 align-middle">location_on</span>{city.label}
                          </div>
                        ))
                      : toSearch.length > 0
                        ? <div className={S.dropdownEmpty}>No matching cities — you can still search</div>
                        : null
                    }
                  </div>
                )}
              </div>
              {errors.to && <span className="text-red-400 text-xs mt-1 ml-1">{errors.to}</span>}
            </div>

            {/* Date */}
            <div className="flex flex-col text-left px-2 flex-1">
              <span className={S.label}>Date</span>
              <div className="relative">
                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-3 text-xl z-10 cursor-pointer ${S.icon}`} onClick={handleDateIconClick}>calendar_today</span>
                <input
                  id="dateInput"
                  value={formData.date}
                  onChange={e => { setFormData(p => ({ ...p, date: e.target.value })); setErrors(p => ({ ...p, date: '' })); }}
                  className={`${S.input} [&::-webkit-calendar-picker-indicator]:hidden ${errors.date ? S.inputErr : S.inputOk}`}
                  type="date" min={today}
                />
              </div>
              {showQuickDates && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {[{ label: 'Today', value: today }, { label: 'Tomorrow', value: tomorrow }].map(item => (
                    <button key={item.value} type="button"
                      onClick={() => { setFormData(p => ({ ...p, date: item.value })); setErrors(p => ({ ...p, date: '' })); }}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${formData.date === item.value ? S.quickPillActive : S.quickPillInactive}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
              {errors.date && <span className="text-red-400 text-xs mt-1 ml-1">{errors.date}</span>}
            </div>

            {/* Search btn */}
            <div className="hidden md:block px-2 flex-shrink-0 md:min-w-[140px] self-end">
              <button onClick={handleSearch} className={S.searchBtn}>
                <span className="material-symbols-outlined text-[22px]">{submitIcon}</span>
                {submitLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
