import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackVisit } from '../utils/visitTracker';

/** Sends a page view on every route change (no-op unless VITE_FEATURE_VISIT_TRACKING is on). */
const VisitTracker = () => {
  const { pathname } = useLocation();
  useEffect(() => { trackVisit(pathname); }, [pathname]);
  return null;
};

export default VisitTracker;
