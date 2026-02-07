import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OperatorSidebar from '../components/operator/OperatorSidebar';
import { getAmenities } from '../api/amenityService';
import './OperatorDashboard.css';

const AddBus = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [activeView, setActiveView] = useState('add-bus');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedAmenities, setSelectedAmenities] = useState([]);
  const [amenities, setAmenities] = useState([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [busName, setBusName] = useState('');
  const [busCode, setBusCode] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [model, setModel] = useState('');
  const [busType, setBusType] = useState('');
  const [totalSeats, setTotalSeats] = useState('');
  const [errors, setErrors] = useState({});
  const profileRef = useRef(null);
  const notificationRef = useRef(null);

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
        setAmenities(data);
      } catch (error) {
        console.error('Error fetching amenities:', error);
        // Fallback to default amenities if backend is unavailable
        setAmenities([
          { id: '1', code: 'WIFI', description: 'Wireless Internet' },
          { id: '2', code: 'AC', description: 'Air Conditioned' },
          { id: '3', code: 'CHARGER', description: 'Charging Point' },
          { id: '4', code: 'WATER', description: 'Water Bottle' },
          { id: '5', code: 'BLANKET', description: 'Blanket' }
        ]);
      } finally {
        setLoadingAmenities(false);
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

  const amenityIcons = {
    WIFI: 'wifi',
    AC: 'ac_unit',
    CHARGER: 'power',
    WATER: 'water_full',
    BLANKET: 'bed'
  };

  const toggleAmenity = (id) => {
    setSelectedAmenities(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleGenerateLayout = () => {
    const newErrors = {};
    if (!busName) newErrors.busName = 'Bus name is required';
    if (!busCode) newErrors.busCode = 'Bus code is required';
    if (!vehicleNumber) newErrors.vehicleNumber = 'Vehicle number is required';
    if (!model) newErrors.model = 'Model is required';
    if (!busType) newErrors.busType = 'Bus type is required';
    if (!totalSeats) newErrors.totalSeats = 'Total seats is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    navigate('/operator/bus-layout', {
      state: { busName, busCode, vehicleNumber, model, busType, totalSeats: parseInt(totalSeats), amenityIds: selectedAmenities }
    });
  };

  return (
    <div className="bg-background-light dark:bg-[#101e22] text-slate-900 dark:text-slate-100 min-h-screen flex">
      <div className="operator-sidebar">
        <OperatorSidebar activeItem={activeView} onNavigate={setActiveView} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      <main className={`operator-main flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101e22] flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-semibold capitalize">Add Bus</h2>
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
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <header className="mb-8">
              <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                <button onClick={() => navigate('/operator/dashboard')} className="hover:text-primary transition-colors">Fleet Management</button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-slate-200 dark:text-slate-100 font-medium">Add New Bus</span>
              </div>
              <h2 className="text-3xl font-extrabold">Add Bus Information</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Register a new vehicle by filling out the details below.</p>
            </header>

            {/* Progress Steps */}
            <div className="mb-10">
              <div className="flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
                <div className="absolute top-1/2 left-0 w-1/3 h-0.5 bg-primary -translate-y-1/2 z-0 shadow-[0_0_10px_rgba(19,127,236,0.5)]"></div>
                
                <div className="relative z-10 flex flex-col items-center">
                  <div className="size-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-[#101e22]">1</div>
                  <span className="mt-2 text-xs font-bold text-primary uppercase tracking-widest">Bus Info</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="size-10 rounded-full bg-slate-200 dark:bg-[#1a1a1a] border-2 border-slate-300 dark:border-slate-700 text-slate-500 flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-[#101e22]">2</div>
                  <span className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Layout</span>
                </div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="size-10 rounded-full bg-slate-200 dark:bg-[#1a1a1a] border-2 border-slate-300 dark:border-slate-700 text-slate-500 flex items-center justify-center font-bold text-sm ring-4 ring-white dark:ring-[#101e22]">3</div>
                  <span className="mt-2 text-xs font-semibold text-slate-500 uppercase tracking-widest">Review</span>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 lg:p-8">
                {/* Basic Information */}
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-primary">info</span>
                    <h3 className="text-lg font-bold">Basic Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bus Name</label>
                      <input value={busName} onChange={(e) => { setBusName(e.target.value); setErrors(prev => ({...prev, busName: ''})); }} className={`w-full px-4 py-3 rounded-lg border ${errors.busName ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-black/40 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`} placeholder="e.g. Royal Express" type="text"/>
                      {errors.busName && <p className="text-red-500 text-xs">{errors.busName}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bus Code</label>
                      <input value={busCode} onChange={(e) => { setBusCode(e.target.value); setErrors(prev => ({...prev, busCode: ''})); }} className={`w-full px-4 py-3 rounded-lg border ${errors.busCode ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-black/40 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`} placeholder="e.g. RE-204" type="text"/>
                      {errors.busCode && <p className="text-red-500 text-xs">{errors.busCode}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Vehicle Number</label>
                      <input value={vehicleNumber} onChange={(e) => { setVehicleNumber(e.target.value); setErrors(prev => ({...prev, vehicleNumber: ''})); }} className={`w-full px-4 py-3 rounded-lg border ${errors.vehicleNumber ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-black/40 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`} placeholder="e.g. KA-01-F-1234" type="text"/>
                      {errors.vehicleNumber && <p className="text-red-500 text-xs">{errors.vehicleNumber}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Model</label>
                      <input value={model} onChange={(e) => { setModel(e.target.value); setErrors(prev => ({...prev, model: ''})); }} className={`w-full px-4 py-3 rounded-lg border ${errors.model ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-black/40 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`} placeholder="e.g. Volvo 9400 B11R" type="text"/>
                      {errors.model && <p className="text-red-500 text-xs">{errors.model}</p>}
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Seats</label>
                      <input value={totalSeats} onChange={(e) => { setTotalSeats(e.target.value); setErrors(prev => ({...prev, totalSeats: ''})); }} className={`w-full px-4 py-3 rounded-lg border ${errors.totalSeats ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-black/40 text-slate-900 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all`} placeholder="e.g. 40" type="number" min="1"/>
                      {errors.totalSeats && <p className="text-red-500 text-xs">{errors.totalSeats}</p>}
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Bus Type</label>
                      <select value={busType} onChange={(e) => { setBusType(e.target.value); setErrors(prev => ({...prev, busType: ''})); }} className={`w-full px-4 py-3 rounded-lg border ${errors.busType ? 'border-red-500' : 'border-slate-300 dark:border-slate-700'} bg-white dark:bg-black/40 text-slate-900 dark:text-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all appearance-none cursor-pointer`}>
                        <option value="">Select Bus Type</option>
                        <optgroup label="Seater Types">
                          <option value="SEATER">Seater</option>
                          <option value="SEMI_SLEEPER">Semi Sleeper</option>
                          <option value="EXECUTIVE_SEATER">Executive Seater</option>
                          <option value="LUXURY_SEATER">Luxury Seater</option>
                        </optgroup>
                        <optgroup label="Sleeper Types">
                          <option value="SLEEPER">Sleeper</option>
                          <option value="AC_SLEEPER">AC Sleeper</option>
                          <option value="NON_AC_SLEEPER">Non-AC Sleeper</option>
                          <option value="SEMI_SLEEPER_AC">Semi Sleeper AC</option>
                          <option value="SEMI_SLEEPER_NON_AC">Semi Sleeper Non-AC</option>
                        </optgroup>
                        <optgroup label="Multi-Axle">
                          <option value="MULTI_AXLE_SEMI_SLEEPER">Multi-Axle Semi Sleeper</option>
                          <option value="MULTI_AXLE_SLEEPER">Multi-Axle Sleeper</option>
                          <option value="MULTI_AXLE_AC_SLEEPER">Multi-Axle AC Sleeper</option>
                        </optgroup>
                        <optgroup label="Volvo Premium">
                          <option value="VOLVO_AC">Volvo AC</option>
                          <option value="VOLVO_MULTI_AXLE">Volvo Multi-Axle</option>
                          <option value="VOLVO_SLEEPER">Volvo Sleeper</option>
                          <option value="VOLVO_MULTI_AXLE_SLEEPER">Volvo Multi-Axle Sleeper</option>
                        </optgroup>
                        <optgroup label="Mercedes-Benz Premium">
                          <option value="MERCEDES_BENZ_AC">Mercedes-Benz AC</option>
                          <option value="MERCEDES_BENZ_SLEEPER">Mercedes-Benz Sleeper</option>
                        </optgroup>
                        <optgroup label="Special">
                          <option value="ELECTRIC">Electric</option>
                          <option value="MINI_BUS">Mini Bus</option>
                          <option value="DELUXE">Deluxe</option>
                          <option value="SUPER_DELUXE">Super Deluxe</option>
                        </optgroup>
                      </select>
                      {errors.busType && <p className="text-red-500 text-xs">{errors.busType}</p>}
                    </div>
                  </div>
                </div>

                {/* Amenities */}
                <div>
                  <div className="flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-primary">feature_search</span>
                    <h3 className="text-lg font-bold">Amenities & Features</h3>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {loadingAmenities ? (
                      <div className="col-span-full text-center py-8 text-slate-500">Loading amenities...</div>
                    ) : amenities.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-slate-500">No amenities available</div>
                    ) : (
                      amenities.map((amenity) => (
                        <div
                          key={amenity.id}
                          onClick={() => toggleAmenity(amenity.id)}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedAmenities.includes(amenity.id)
                              ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
                              : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-black/40 text-slate-600 dark:text-white hover:border-slate-400 dark:hover:border-slate-600'
                          }`}
                        >
                          <span className={`material-symbols-outlined mb-2 text-2xl transition-transform ${selectedAmenities.includes(amenity.id) ? 'scale-110' : ''}`}>
                            {amenityIcons[amenity.code] || 'check_circle'}
                          </span>
                          <span className={`text-[10px] font-extrabold uppercase tracking-widest text-center ${selectedAmenities.includes(amenity.id) ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>
                            {amenity.description}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="bg-slate-50 dark:bg-black/30 p-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <button onClick={() => navigate('/operator/dashboard')} className="px-6 py-2.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 transition-colors">
                  Cancel
                </button>
                <button onClick={handleGenerateLayout} className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all shadow-lg shadow-primary/20">
                  Next: Generate Layout
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>

            {/* Tip */}
            <div className="mt-8 p-4 rounded-lg bg-primary/5 border border-primary/20 flex gap-4">
              <span className="material-symbols-outlined text-primary">lightbulb</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                <span className="font-bold text-primary">Tip:</span> Make sure the vehicle number matches your registration certificate. This will be used for automated compliance checks.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
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
    </div>
  );
};

export default AddBus;
