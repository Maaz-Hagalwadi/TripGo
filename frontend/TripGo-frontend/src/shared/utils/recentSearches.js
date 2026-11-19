const STORAGE_KEY = 'tripgo_recent_searches';
const MAX_RECENT = 3;

const sameRoute = (a, b) =>
  a.from.trim().toLowerCase() === b.from.trim().toLowerCase() &&
  a.to.trim().toLowerCase() === b.to.trim().toLowerCase();

/** Most recent first: [{ from, to, date }] */
export const getRecentSearches = () => {
  try {
    const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(list) ? list.filter((s) => s?.from && s?.to).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

const save = (list) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // storage unavailable (private mode / blocked) — recent searches are a convenience only
  }
};

/** Adds a search to the front, replacing any earlier search for the same route. */
export const addRecentSearch = ({ from, to, date }) => {
  if (!from || !to) return;
  const entry = { from, to, date };
  save([entry, ...getRecentSearches().filter((s) => !sameRoute(s, entry))].slice(0, MAX_RECENT));
};

export const removeRecentSearch = (search) => {
  const next = getRecentSearches().filter((s) => !sameRoute(s, search));
  save(next);
  return next;
};

export const clearRecentSearches = () => save([]);
