import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';
import TripGoIcon from '../assets/icons/TripGoIcon';

const HOME_BY_ROLE = {
  ADMIN: { route: ROUTES.ADMIN_DASHBOARD, label: 'Go to admin overview' },
  OPERATOR: { route: ROUTES.OPERATOR_DASHBOARD, label: 'Go to operator dashboard' },
  USER: { route: ROUTES.DASHBOARD, label: 'Go to my dashboard' },
};

const Unauthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const home = user ? (HOME_BY_ROLE[user.role] || HOME_BY_ROLE.USER) : null;
  const canGoBack = location.key !== 'default';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="px-6 h-16 flex items-center">
        <Link to={ROUTES.HOME} className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center"><TripGoIcon className="w-6 h-5 text-white" /></span>
          <span className="font-black text-primary tracking-tight">TripGo</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-16">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto mb-6 flex w-20 h-20 items-center justify-center rounded-3xl bg-[#FDBA74]/25">
            <span className="material-symbols-outlined text-[44px] text-orange-600">lock</span>
          </span>
          <p className="text-sm font-bold uppercase tracking-widest text-orange-600">Error 403</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">You don’t have access to this page</h1>
          <p className="mt-3 text-slate-600">
            {user
              ? `You’re signed in as ${user.email || 'a TripGo user'}, and this page needs a different account type.`
              : 'Sign in with an account that has access to continue.'}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            {home ? (
              <button onClick={() => navigate(home.route, { replace: true })} className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors">
                {home.label}
              </button>
            ) : (
              <button onClick={() => navigate(ROUTES.LOGIN, { state: { returnTo: location.state?.from } })} className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white hover:bg-[#102A4C] transition-colors">
                Sign in
              </button>
            )}
            {canGoBack && (
              <button onClick={() => navigate(-1)} className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:border-[#FF8A65] transition-colors">
                Go back
              </button>
            )}
          </div>
          <p className="mt-8 text-sm text-slate-500">
            Think this is a mistake? <a href="mailto:support@tripgo.com" className="font-bold text-primary hover:text-[#FF8A65]">Email support</a>
          </p>
        </div>
      </main>
    </div>
  );
};

export default Unauthorized;
