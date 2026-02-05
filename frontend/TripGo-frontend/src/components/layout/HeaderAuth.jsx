import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const HeaderAuth = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const notifications = [
    { id: 1, message: "Your booking for Delhi to Mumbai is confirmed", time: "2 hours ago", unread: true },
    { id: 2, message: "New route available: Bangalore to Chennai", time: "1 day ago", unread: false },
    { id: 3, message: "Payment successful for booking #TG12345", time: "2 days ago", unread: false }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-deep-black/95 backdrop-blur-xl shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="text-primary">
              <TripGoIcon className="w-10 h-10" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-white">TripGo</span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-sm font-bold text-primary hover:text-primary/80 transition-colors"
            >
              Dashboard
            </button>
            <button 
              onClick={() => navigate('/search-results')}
              className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Search Buses
            </button>
            <button className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              My Bookings
            </button>
            <button className="text-sm font-semibold text-slate-400 hover:text-white transition-colors">
              Support
            </button>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Notifications */}
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-slate-400 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-xl md:text-2xl">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-black text-xs font-bold rounded-full w-4 h-4 md:w-5 md:h-5 flex items-center justify-center text-[10px] md:text-xs">
                    {unreadCount}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-72 md:w-80 bg-charcoal border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-white font-bold text-lg">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`p-4 border-b border-white/5 hover:bg-white/5 transition-colors ${
                        notification.unread ? 'bg-primary/5' : ''
                      }`}>
                        <p className="text-white text-sm mb-1">{notification.message}</p>
                        <p className="text-slate-400 text-xs">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 border-t border-white/10">
                    <button className="text-primary text-sm font-medium hover:underline">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 md:gap-3 p-1 md:p-2 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 md:w-10 md:h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-lg md:text-xl">person</span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-white text-sm font-medium">{user?.name || 'User'}</p>
                  <p className="text-slate-400 text-xs">{user?.email || 'user@example.com'}</p>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-base md:text-lg hidden md:block">
                  {showProfileDropdown ? 'expand_less' : 'expand_more'}
                </span>
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 md:w-64 bg-charcoal border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-primary text-xl">person</span>
                      </div>
                      <div>
                        <p className="text-white font-medium">{user?.name || 'User'}</p>
                        <p className="text-slate-400 text-sm">{user?.email || 'user@example.com'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="py-2">
                    <button className="w-full px-4 py-3 text-left text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">person</span>
                      My Profile
                    </button>
                    <button className="w-full px-4 py-3 text-left text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">confirmation_number</span>
                      My Bookings
                    </button>
                    <button className="w-full px-4 py-3 text-left text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">payment</span>
                      Payment Methods
                    </button>
                    <button className="w-full px-4 py-3 text-left text-slate-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">settings</span>
                      Settings
                    </button>
                  </div>
                  
                  <div className="border-t border-white/10 p-2">
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors flex items-center gap-3 rounded-xl"
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