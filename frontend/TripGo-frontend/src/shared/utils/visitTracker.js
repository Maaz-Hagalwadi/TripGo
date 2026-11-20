import { API_BASE_URL } from '../../config/env';
import { VISIT_TRACKING_ENABLED } from '../constants/features';

// Records one page view per route change (spec §11). Visitors are identified by an anonymous id kept
// in this browser; the backend links the visit to an account only when the request is signed in.
const VISITOR_KEY = 'tripgo_visitor_id';
const SESSION_KEY = 'tripgo_visit_session';
const SOURCE_KEY = 'tripgo_visit_source';
const SKIP_PREFIXES = ['/admin'];
const DEDUPE_MS = 30000;

let last = { path: '', at: 0 };

const safeGet = (storage, key) => { try { return storage.getItem(key); } catch { return null; } };
const safeSet = (storage, key, value) => { try { storage.setItem(key, value); } catch { /* storage blocked */ } };
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

const getId = (storage, key) => {
  let id = safeGet(storage, key);
  if (!id) { id = newId(); safeSet(storage, key, id); }
  return id;
};

/** Where this visit came from: utm_source on a shared link, else the referring site. Kept for the session. */
const getSource = () => {
  const saved = safeGet(sessionStorage, SOURCE_KEY);
  if (saved) return JSON.parse(saved);
  const params = new URLSearchParams(window.location.search);
  let referrerHost = '';
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* bad referrer */ }
  const source = {
    utmSource: params.get('utm_source') || params.get('ref') || '',
    utmMedium: params.get('utm_medium') || '',
    utmCampaign: params.get('utm_campaign') || '',
    referrer: referrerHost && referrerHost !== window.location.hostname ? referrerHost : '',
  };
  safeSet(sessionStorage, SOURCE_KEY, JSON.stringify(source));
  return source;
};

export const trackVisit = (path) => {
  if (!VISIT_TRACKING_ENABLED) return;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.webdriver) return;
  if (SKIP_PREFIXES.some((p) => path.startsWith(p))) return;
  const now = Date.now();
  if (last.path === path && now - last.at < DEDUPE_MS) return; // StrictMode double effects, quick re-renders
  last = { path, at: now };

  const token = safeGet(localStorage, 'accessToken');
  fetch(`${API_BASE_URL}/analytics/visits`, {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({
      path,
      visitorId: getId(localStorage, VISITOR_KEY),
      sessionId: getId(sessionStorage, SESSION_KEY),
      screenWidth: window.innerWidth,
      ...getSource(),
    }),
  }).catch(() => {});
};
