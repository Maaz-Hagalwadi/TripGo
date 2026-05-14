import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TripGoIcon from '../../../assets/icons/TripGoIcon';
import NotificationBell from '../NotificationBell';

const Header = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button onClick={() => navigate('/')} className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-9 h-9 rounded-xl bg-[#002046] flex items-center justify-center shadow-sm group-hover:bg-[#001533] transition-colors">
              <TripGoIcon className="w-6 h-5 text-white" />
            </div>
            <span className="text-base font-black text-[#002046] tracking-tight">TripGo</span>
          </button>

          {/* Right */}
          <div className="flex items-center gap-2">
            {isAuthenticated && <NotificationBell />}
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-slate-600 hover:text-[#002046] transition-colors px-3 py-2 rounded-lg hover:bg-slate-50"
            >
              Log In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm font-bold bg-[#002046] text-white px-4 py-2 rounded-lg hover:bg-[#001533] transition-all shadow-sm"
            >
              Sign Up
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default Header;
