import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TripGoIcon from '../../../assets/icons/TripGoIcon';
import NotificationBell from '../NotificationBell';

const HeaderAuth = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button className="flex items-center gap-2.5 flex-shrink-0 group" onClick={() => navigate('/dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-[#002046] flex items-center justify-center shadow-sm group-hover:bg-[#001533] transition-colors">
              <TripGoIcon className="w-6 h-5 text-white" />
            </div>
            <span className="text-base font-black text-[#002046] tracking-tight">TripGo</span>
          </button>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm font-semibold text-[#002046] px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/bookings')}
              className="text-sm font-semibold text-slate-600 hover:text-[#002046] px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              My Bookings
            </button>
            <button
              onClick={() => navigate('/user/support')}
              className="text-sm font-semibold text-slate-600 hover:text-[#002046] px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Support
            </button>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            <NotificationBell />

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 bg-[#002046]/10 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#002046] text-lg">person</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-slate-800 text-sm font-semibold leading-tight">{user?.name || 'User'}</p>
                  <p className="text-slate-500 text-xs leading-tight">{user?.email || 'user@example.com'}</p>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-base hidden md:block">
                  {showProfileDropdown ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#002046]/10 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#002046] text-xl">person</span>
                      </div>
                      <div>
                        <p className="text-slate-800 font-semibold text-sm">{user?.name || 'User'}</p>
                        <p className="text-slate-500 text-xs">{user?.email || 'user@example.com'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="py-1.5">
                    <button
                      onClick={() => { navigate('/user/profile'); setShowProfileDropdown(false); }}
                      className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 hover:text-[#002046] transition-colors flex items-center gap-3 text-sm"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">star</span>
                      Ratings
                    </button>
                    <button
                      onClick={() => { navigate('/bookings'); setShowProfileDropdown(false); }}
                      className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 hover:text-[#002046] transition-colors flex items-center gap-3 text-sm"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">confirmation_number</span>
                      My Bookings
                    </button>
                    <button
                      className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 hover:text-[#002046] transition-colors flex items-center gap-3 text-sm"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">payment</span>
                      Payment Methods
                    </button>
                    <button
                      onClick={() => { navigate('/user/settings'); setShowProfileDropdown(false); }}
                      className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 hover:text-[#002046] transition-colors flex items-center gap-3 text-sm"
                    >
                      <span className="material-symbols-outlined text-lg text-slate-400">settings</span>
                      Settings
                    </button>
                  </div>

                  <div className="border-t border-slate-100 p-1.5">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2.5 text-left text-red-500 hover:bg-red-50 transition-colors flex items-center gap-3 rounded-xl text-sm font-medium"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderAuth;
