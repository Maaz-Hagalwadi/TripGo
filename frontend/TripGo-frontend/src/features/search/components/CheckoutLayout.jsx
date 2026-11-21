import { Link } from 'react-router-dom';
import TripGoIcon from '../../../assets/icons/TripGoIcon';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';

/**
 * Booking, payment and confirmation pages. Signed-in travellers keep their dashboard shell; guests
 * (and anyone without a traveller account) get a distraction-free checkout bar — no sidebar,
 * profile menu or notifications, since there is no account behind them.
 */
const CheckoutLayout = ({ activeItem = 'search', title, children }) => {
  const { user } = useAuth();

  if (user?.role === 'USER') {
    return <UserLayout activeItem={activeItem} title={title} showHeaderSearch={false}>{children}</UserLayout>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link to={ROUTES.HOME} className="flex items-center gap-2" aria-label="TripGo home">
            <span className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center"><TripGoIcon className="w-6 h-5 text-white" /></span>
            <span className="text-lg font-black tracking-tight text-primary">TripGo</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700">
            <span className="material-symbols-outlined text-[16px]">lock</span>Secure checkout
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-screen-xl flex-1 px-4 sm:px-6 py-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-2 px-4 sm:px-6 py-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} TripGo</span>
          <span className="flex gap-4">
            <Link to={ROUTES.TERMS} className="hover:text-primary">Terms</Link>
            <Link to={ROUTES.PRIVACY} className="hover:text-primary">Privacy</Link>
          </span>
        </div>
      </footer>
    </div>
  );
};

export default CheckoutLayout;
