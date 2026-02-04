import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const HeaderAuth = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-deep-black/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="text-primary">
              <TripGoIcon className="w-8 h-8" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-white">TripGo</span>
          </div>
          <div className="flex items-center gap-6">
            <button className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              Support
            </button>
            <button className="bg-white/10 hover:bg-white/20 text-white px-5 py-2 rounded-full text-sm font-bold transition-all">
              My Profile
            </button>
            <button 
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-full text-sm font-bold transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderAuth;