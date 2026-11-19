import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRecentSearches, removeRecentSearch, clearRecentSearches } from '../../../shared/utils/recentSearches';
import { localDateString } from '../../../shared/utils/date';

const toDisplayCity = (value) => String(value).trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

const RecentSearches = ({ className = '', style }) => {
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
            className="group flex items-center rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-[#FDBA74]/50 transition-colors"
          >
            <button
              onClick={() => navigate('/search-results', { state: { from: s.from, to: s.to, date } })}
              className="pl-3 pr-1 py-1.5 text-xs font-semibold text-white"
            >
              {toDisplayCity(s.from)} <span className="text-[#FDBA74]">→</span> {toDisplayCity(s.to)}
              <span className="text-slate-400 font-medium"> · {dateLabel(date)}</span>
            </button>
            <button
              onClick={() => setSearches(removeRecentSearch(s))}
              aria-label={`Remove ${s.from} to ${s.to} from recent searches`}
              className="w-6 h-6 mr-1 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
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
