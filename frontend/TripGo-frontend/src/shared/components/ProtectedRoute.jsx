import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ROUTES } from '../constants/routes';
import TripGoLoader from './ui/TripGoLoader';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading || (isAuthenticated && !user)) {
    return <TripGoLoader />;
  }

  if (!isAuthenticated) {
    // Remember the page so login can bring the user straight back
    const returnTo = { pathname: location.pathname + location.search, state: location.state };
    return <Navigate to={ROUTES.LOGIN} replace state={{ returnTo }} />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to={ROUTES.UNAUTHORIZED} replace />;
  }

  return children;
};

export default ProtectedRoute;