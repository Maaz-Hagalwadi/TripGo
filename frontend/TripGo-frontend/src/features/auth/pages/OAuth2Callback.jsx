import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getCurrentUser } from '../../../api/userService';
import { ROUTES } from '../../../shared/constants/routes';

const OAuth2Callback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const handleCallback = async () => {
      const token = searchParams.get('token');
      const refreshToken = searchParams.get('refresh');
      const error = searchParams.get('error');

      if (error) {
        navigate(ROUTES.LOGIN, { replace: true });
        return;
      }

      if (token && refreshToken) {
        localStorage.setItem('accessToken', token);
        localStorage.setItem('refreshToken', refreshToken);
        const role = await checkAuth();
        try {
          const userData = await getCurrentUser();
          if (!userData.phone) {
            navigate(ROUTES.COMPLETE_PROFILE, { replace: true });
            return;
          }
        } catch {
          navigate(ROUTES.COMPLETE_PROFILE, { replace: true });
          return;
        }
        if (role === 'OPERATOR') navigate(ROUTES.OPERATOR_DASHBOARD, { replace: true });
        else if (role === 'ADMIN') navigate(ROUTES.ADMIN_OPERATOR_ACTION, { replace: true });
        else navigate(ROUTES.DASHBOARD, { replace: true });
      } else {
        navigate(ROUTES.LOGIN, { replace: true });
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="bg-deep-black min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-white text-lg">Completing sign in...</p>
      </div>
    </div>
  );
};

export default OAuth2Callback;
