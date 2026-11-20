import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecentSearches, removeRecentSearch, clearRecentSearches } from '../../../shared/utils/recentSearches';
import { localDateString } from '../../../shared/utils/date';

const toDisplayCity = (value) => String(value).trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// variant: 'dark' for the navy landing hero, 'light' for white cards (dashboard)
const STYLES = {
  dark: {
    chip: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-[#FDBA74]/50',
    text: 'text-white',
    remove: 'text-slate-500 hover:text-white hover:bg-white/10',
  },
  light: {
    chip: 'bg-slate-50 border-slate-200 hover:bg-white hover:border-[#FF8A65]/60',
    text: 'text-slate-800',
    remove: 'text-slate-400 hover:text-slate-800 hover:bg-slate-100',
  },
};

const RecentSearches = ({ className = '', style, variant = 'dark' }) => {
  const theme = STYLES[variant];
  const navigate = useNavigate();
  const [searches, setSearches] = useState(getRecentSearches);

  if (searches.length === 0) return null;

  const today = localDateString();
  const tomorrow = localDateString(1);

  // Past dates roll forward to today so a recent search is always bookable
  const resolveDate = (date) => (date && date >= today ? date : today);

  const dateLabel = (date) => {
    if (date === today) return 'Today';
    if (date === tomorrow) return 'Tomorrow';
    return new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`} style={style}>
      <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 mr-1">
        <span className="material-symbols-outlined text-base">history</span>
        Recent
      </span>

      {searches.map((s) => {
        const date = resolveDate(s.date);
        return (
          <div
            key={`${s.from}-${s.to}`}
            className={`group flex items-center rounded-full border transition-colors ${theme.chip}`}
          >
            <button
              onClick={() => navigate('/search-results', { state: { from: s.from, to: s.to, date } })}
              className={`pl-3 pr-1 py-1.5 text-xs font-semibold ${theme.text}`}
            >
              {toDisplayCity(s.from)} <span className={variant === 'dark' ? 'text-[#FDBA74]' : 'text-[#FF8A65]'}>→</span> {toDisplayCity(s.to)}
              <span className="text-slate-400 font-medium"> · {dateLabel(date)}</span>
            </button>
            <button
              onClick={() => setSearches(removeRecentSearch(s))}
              aria-label={`Remove ${s.from} to ${s.to} from recent searches`}
              className={`w-6 h-6 mr-1 rounded-full flex items-center justify-center transition-colors ${theme.remove}`}
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        );
      })}

      <button
        onClick={() => { clearRecentSearches(); setSearches([]); }}
        className="text-xs font-semibold text-slate-500 hover:text-[#FDBA74] transition-colors ml-1"
      >
        Clear
      </button>
    </div>
  );
};

export default RecentSearches;
