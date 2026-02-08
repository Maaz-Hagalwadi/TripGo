import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OperatorSidebar from '../components/operator/OperatorSidebar';
import { createBus, getAmenities } from '../api/amenityService';
import './OperatorDashboard.css';

const BusReview = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, logout } = useAuth();
  const [activeView, setActiveView] = useState('add-bus');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [amenitiesList, setAmenitiesList] = useState([]);
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

  const busData = location.state || {};
  const { busName, busCode, vehicleNumber, model, totalSeats, busType, amenities, blockedSeats } = busData;

  console.log('BusReview - busData:', busData);
  console.log('BusReview - amenities:', amenities);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate('/');
      return;
    }
    if (user.role && user.role !== 'OPERATOR') {
      navigate('/');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchAmenities = async () => {
      try {
        const data = await getAmenities();
        console.log('Fetched amenities:', data);
        setAmenitiesList(data);
      } catch (error) {
        console.error('Error fetching amenities:', error);
      }
    };
    fetchAmenities();
  }, []);

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

  const notifications = [
    { id: 1, message: "New booking received for Route TRP-102", time: "10 min ago", unread: true },
    { id: 2, message: "Bus TRP-088 maintenance scheduled", time: "1 hour ago", unread: true },
    { id: 3, message: "Monthly revenue report available", time: "2 hours ago", unread: false }
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      const busPayload = {
        name: busName,
        busCode,
        vehicleNumber,
        model,
        totalSeats: parseInt(totalSeats),
        busType,
        amenityIds: amenities || []
      };

      await createBus(busPayload);
      // Add delay to show loader
      await new Promise(resolve => setTimeout(resolve, 1500));
      navigate('/operator/my-buses');
    } catch (error) {
      setIsSubmitting(false);
      const message = error.message || 'Failed to add bus. Please try again.';
      if (message.includes('duplicate') || message.includes('already exists')) {
        setErrorMessage('Bus code already exists. Please use a different code.');
      } else {
        setErrorMessage(message);
      }
    }
  };

  return (
    <div className="bg-background-light dark:bg-[#101e22] text-slate-900 dark:text-slate-100 min-h-screen flex">
      <div className="operator-sidebar">
        <OperatorSidebar activeItem={activeView} onNavigate={setActiveView} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      <main className={`operator-main flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101e22] flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-semibold capitalize">Review & Submit</h2>
            <div className="operator-search relative max-w-md w-full ml-4">
              <span className="material-symbols-outlined absolute left-3 top-[11px] text-slate-400 text-[18px]">search</span>
              <input className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 py-2 text-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Search buses, routes, or bookings..." type="text"/>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative" ref={notificationRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative text-slate-500 dark:text-slate-400 hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">notifications</span>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="notification-dropdown absolute right-0 mt-2 w-80 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <h3 className="font-bold text-sm">Notifications</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`p-4 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        notification.unread ? 'bg-primary/5' : ''
                      }`}>
                        <p className="text-sm mb-1">{notification.message}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-800 relative" ref={profileRef}>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-slate-500">Fleet Manager</p>
              </div>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">person</span>
              </button>
              {showProfileDropdown && (
                <div className="profile-dropdown absolute right-0 top-12 w-64 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 text-xl">person</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{user?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2">
                    <button className="w-full px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">person</span>
                      My Profile
                    </button>
                    <button className="w-full px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">settings</span>
                      Settings
                    </button>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 p-2">
                    <button 
                      onClick={async () => {
                        await logout();
                        navigate('/');
                      }}
                      className="w-full px-4 py-3 text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-3 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <header className="mb-8">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <button onClick={() => navigate('/operator/add-bus')} className="hover:text-primary transition-colors">Add Bus</button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <button onClick={() => navigate('/operator/bus-layout', { state: busData })} className="hover:text-primary transition-colors">Seat Layout</button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-slate-200 dark:text-slate-100 font-medium">Review</span>
              </div>
              <h2 className="text-3xl font-extrabold">Review Bus Details</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Please review all information before submitting</p>
            </header>

            <div className="mb-10">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-primary -translate-y-1/2 z-0 shadow-[0_0_10px_rgba(19,127,236,0.5)]"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-[#101e22]">✓</div>
                  <span className="mt-2 text-xs font-bold text-primary uppercase tracking-widest">Bus Info</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-[#101e22]">✓</div>
                  <span className="mt-2 text-xs font-bold text-primary uppercase tracking-widest">Layout</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-[#101e22]">3</div>
                  <span className="mt-2 text-xs font-bold text-primary uppercase tracking-widest">Review</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 lg:p-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">directions_bus</span>
                      Bus Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Bus Name</span>
                        <span className="font-semibold">{busName}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Bus Code</span>
                        <span className="font-semibold">{busCode}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Vehicle Number</span>
                        <span className="font-semibold">{vehicleNumber}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Model</span>
                        <span className="font-semibold">{model}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-200 dark:border-slate-800">
                        <span className="text-slate-600 dark:text-slate-400">Bus Type</span>
                        <span className="font-semibold">{busType?.replace(/_/g, ' ')}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-slate-600 dark:text-slate-400">Total Seats</span>
                        <span className="font-semibold">{totalSeats}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">star</span>
                      Amenities & Seats
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 mb-2">Selected Amenities</p>
                        <div className="flex flex-wrap gap-2">
                          {amenities && amenities.length > 0 ? (
                            amenities.map((id) => {
                              const amenity = amenitiesList.find(a => a.id === id);
                              return (
                                <span key={id} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                  {amenity?.code || `Amenity ${id}`}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-slate-500">No amenities selected</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-slate-600 dark:text-slate-400 mb-2">Blocked Seats</p>
                        <div className="flex flex-wrap gap-2">
                          {blockedSeats && blockedSeats.length > 0 ? (
                            blockedSeats.map((seat) => (
                              <span key={seat} className="px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-sm font-medium">
                                {seat}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-500">No seats blocked</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-black/30 p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <button 
                  onClick={() => navigate('/operator/bus-layout', { state: busData })} 
                  className="px-6 py-2.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors"
                >
                  Back
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Bus'}
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-slate-800 z-50">
        <div className="grid grid-cols-5 h-16">
          <button onClick={() => navigate('/operator/dashboard')} className="flex flex-col items-center justify-center gap-1 transition-colors text-slate-400">
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span className="text-[10px] font-medium">Overview</span>
          </button>
          <button onClick={() => navigate('/operator/dashboard')} className="flex flex-col items-center justify-center gap-1 transition-colors text-slate-400">
            <span className="material-symbols-outlined text-xl">directions_bus</span>
            <span className="text-[10px] font-medium">Buses</span>
          </button>
          <button onClick={() => navigate('/operator/add-bus')} className="flex flex-col items-center justify-center gap-1 transition-colors text-primary">
            <span className="material-symbols-outlined text-xl">add_circle</span>
            <span className="text-[10px] font-medium">Add Bus</span>
          </button>
          <button onClick={() => navigate('/operator/dashboard')} className="flex flex-col items-center justify-center gap-1 transition-colors text-slate-400">
            <span className="material-symbols-outlined text-xl">confirmation_number</span>
            <span className="text-[10px] font-medium">Bookings</span>
          </button>
          <button onClick={() => navigate('/operator/dashboard')} className="flex flex-col items-center justify-center gap-1 transition-colors text-slate-400">
            <span className="material-symbols-outlined text-xl">settings</span>
            <span className="text-[10px] font-medium">Settings</span>
          </button>
        </div>
      </nav>

      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-md mx-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary"></div>
            <p className="text-lg font-semibold">Adding Bus...</p>
            <p className="text-sm text-slate-500 text-center">Please wait while we process your request</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 shadow-2xl max-w-md mx-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-3xl">error</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">Error</h3>
                <p className="text-sm text-slate-500">Failed to add bus</p>
              </div>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-6">{errorMessage}</p>
            <button
              onClick={() => setErrorMessage('')}
              className="w-full bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusReview;
