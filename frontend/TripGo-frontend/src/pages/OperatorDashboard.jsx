import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import OperatorSidebar from '../components/operator/OperatorSidebar';
import { getBuses } from '../api/amenityService';
import './OperatorDashboard.css';

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeView, setActiveView] = useState('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(true);
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
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoadingBuses(true);
      const data = await getBuses();
      setBuses(data || []);
    } catch (error) {
      console.error('Failed to fetch buses:', error);
      setBuses([]);
    } finally {
      setLoadingBuses(false);
    }
  };

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

  const renderContent = () => {
    if (activeView === 'overview') {
      return (
        <div className="space-y-8">
          {/* KPI Section */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Total Buses */}
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Buses</p>
                <h3 className="text-3xl font-bold mt-2">{loadingBuses ? '...' : buses.length}</h3>
                <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span> {buses.filter(b => b.active).length} active
                </p>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg text-primary">
                <span className="material-symbols-outlined">directions_bus</span>
              </div>
            </div>

            {/* Active Trips */}
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Trips</p>
                <h3 className="text-3xl font-bold mt-2">12</h3>
                <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">trending_up</span> +2 since last hour
                </p>
              </div>
              <div className="bg-green-500/10 p-3 rounded-lg text-green-500 flex items-center justify-center">
                <div className="relative">
                  <span className="material-symbols-outlined">route</span>
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                  </span>
                </div>
              </div>
            </div>

            {/* Total Bookings */}
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Bookings</p>
                <h3 className="text-3xl font-bold mt-2">1,240</h3>
                <p className="text-xs text-green-500 mt-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">trending_up</span> +15% this month
                </p>
              </div>
              <div className="bg-orange-500/10 p-3 rounded-lg text-orange-500">
                <span className="material-symbols-outlined">confirmation_number</span>
              </div>
            </div>

            {/* Monthly Revenue */}
            <div className="bg-primary p-6 rounded-xl flex items-start justify-between relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-sm font-medium text-white/80">Monthly Revenue</p>
                <h3 className="text-3xl font-bold mt-2 text-white">$42,500</h3>
                <div className="mt-4">
                  <svg className="w-full h-10 overflow-visible" viewBox="0 0 100 30">
                    <path d="M0 25 Q15 28 30 15 T60 10 T100 5" fill="none" stroke="white" strokeWidth="2"></path>
                  </svg>
                </div>
              </div>
              <div className="bg-white/20 p-3 rounded-lg text-white relative z-10">
                <span className="material-symbols-outlined">payments</span>
              </div>
              <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
            </div>
          </div>

          {/* Dashboard Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Live Trip Status Table */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight">Live Trip Status</h3>
                <button className="text-sm font-medium text-primary flex items-center gap-1 hover:underline">
                  View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 dark:bg-[#222] border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-6 py-4 font-semibold">Bus Code</th>
                        <th className="px-6 py-4 font-semibold">Route</th>
                        <th className="px-6 py-4 font-semibold">Current Location</th>
                        <th className="px-6 py-4 font-semibold">Occupancy</th>
                        <th className="px-6 py-4 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-primary">TRP-102</td>
                        <td className="px-6 py-4">New York → Boston</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Near New Haven</td>
                        <td className="px-6 py-4">
                          <div className="w-full max-w-[100px] flex flex-col gap-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full" style={{width: '85%'}}></div>
                            </div>
                            <span className="text-[10px] font-bold">85% Filled</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">On-Time</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-primary">TRP-088</td>
                        <td className="px-6 py-4">Chicago → Detroit</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">St. Joseph Heights</td>
                        <td className="px-6 py-4">
                          <div className="w-full max-w-[100px] flex flex-col gap-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full" style={{width: '42%'}}></div>
                            </div>
                            <span className="text-[10px] font-bold">42% Filled</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-1 rounded bg-orange-500/10 text-orange-500 text-[10px] font-bold uppercase tracking-wider">Delayed</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-primary">TRP-095</td>
                        <td className="px-6 py-4">Seattle → Portland</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Olympia Station</td>
                        <td className="px-6 py-4">
                          <div className="w-full max-w-[100px] flex flex-col gap-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full" style={{width: '98%'}}></div>
                            </div>
                            <span className="text-[10px] font-bold">98% Filled</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">On-Time</span>
                        </td>
                      </tr>
                      <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-primary">TRP-114</td>
                        <td className="px-6 py-4">Miami → Orlando</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">Palm Beach</td>
                        <td className="px-6 py-4">
                          <div className="w-full max-w-[100px] flex flex-col gap-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full" style={{width: '65%'}}></div>
                            </div>
                            <span className="text-[10px] font-bold">65% Filled</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2 py-1 rounded bg-green-500/10 text-green-500 text-[10px] font-bold uppercase tracking-wider">On-Time</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Map */}
              <div className="h-64 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d497698.77490949244!2d77.3507609!3d12.9539974!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670c9b44e6d%3A0xf8dfc3e8517e4fe0!2sBengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="grayscale"
                ></iframe>
                <div className="absolute inset-0 bg-gradient-to-t from-[#101e22]/80 to-transparent flex items-end p-6 pointer-events-none">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-2 text-sm text-white bg-[#101e22]/60 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-primary"></span> 12 Active
                    </span>
                    <span className="flex items-center gap-2 text-sm text-white bg-[#101e22]/60 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span> 32 In Garage
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold tracking-tight">Recent Activity</h3>
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-slate-800 p-6">
                <div className="relative space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                  {/* Activity Item 1 */}
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center ring-4 ring-white dark:ring-[#1a1a1a] z-10">
                      <span className="material-symbols-outlined text-sm">confirmation_number</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">New Booking: $45.00</p>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">2 min ago</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">User ID #89201 booked 1 seat on Route A (NY-BOS).</p>
                    </div>
                  </div>

                  {/* Activity Item 2 */}
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center ring-4 ring-white dark:ring-[#1a1a1a] z-10">
                      <span className="material-symbols-outlined text-sm">engineering</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-amber-500">Maintenance Alert</p>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">45 min ago</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Bus <span className="font-mono text-primary">TRP-098</span> is due for its 10k mile service check.</p>
                    </div>
                  </div>

                  {/* Activity Item 3 */}
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center ring-4 ring-white dark:ring-[#1a1a1a] z-10">
                      <span className="material-symbols-outlined text-sm">done_all</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">Trip Completed</p>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">1 hr ago</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Bus <span className="font-mono text-primary">TRP-072</span> safely arrived at Seattle terminal.</p>
                    </div>
                  </div>

                  {/* Activity Item 4 */}
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center ring-4 ring-white dark:ring-[#1a1a1a] z-10">
                      <span className="material-symbols-outlined text-sm">account_circle</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">New Driver Onboarded</p>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">3 hrs ago</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Marcus Wright assigned to South-Eastern routes.</p>
                    </div>
                  </div>
                </div>
                <button className="w-full mt-8 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  Show All Activity
                </button>
              </div>

              {/* Fleet Distribution Stats */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Quick Stats</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">On-Time Performance</span>
                    <span className="text-sm font-bold text-green-500">92%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full" style={{width: '92%'}}></div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm">Avg. Occupancy</span>
                    <span className="text-sm font-bold text-primary">68%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div className="bg-primary h-full" style={{width: '68%'}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-slate-200 dark:border-slate-800 p-8">
        <h2 className="text-2xl font-bold mb-4 capitalize">{activeView}</h2>
        <p className="text-slate-600 dark:text-slate-400">{activeView} content coming soon...</p>
      </div>
    );
  };

  return (
    <div className="bg-background-light dark:bg-[#101e22] text-slate-900 dark:text-slate-100 min-h-screen flex">
      {/* Desktop Sidebar */}
      <div className="operator-sidebar">
        <OperatorSidebar activeItem={activeView} onNavigate={setActiveView} collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)} />
      </div>

      <main className={`operator-main flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#101e22] flex items-center justify-between px-4 lg:px-8 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <h2 className="text-lg font-semibold capitalize">{activeView}</h2>
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
          {renderContent()}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1a1a1a] border-t border-slate-200 dark:border-slate-800 z-50">
        <div className="grid grid-cols-5 h-16">
          <button onClick={() => setActiveView('overview')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeView === 'overview' ? 'text-primary' : 'text-slate-400'
          }`}>
            <span className="material-symbols-outlined text-xl">dashboard</span>
            <span className="text-[10px] font-medium">Overview</span>
          </button>
          <button onClick={() => setActiveView('buses')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeView === 'buses' ? 'text-primary' : 'text-slate-400'
          }`}>
            <span className="material-symbols-outlined text-xl">directions_bus</span>
            <span className="text-[10px] font-medium">Buses</span>
          </button>
          <button onClick={() => navigate('/operator/add-bus')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeView === 'add-bus' ? 'text-primary' : 'text-slate-400'
          }`}>
            <span className="material-symbols-outlined text-xl">add_circle</span>
            <span className="text-[10px] font-medium">Add Bus</span>
          </button>
          <button onClick={() => setActiveView('schedules')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeView === 'schedules' ? 'text-primary' : 'text-slate-400'
          }`}>
            <span className="material-symbols-outlined text-xl">schedule</span>
            <span className="text-[10px] font-medium">Schedule</span>
          </button>
          <button onClick={() => setActiveView('bookings')} className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeView === 'bookings' ? 'text-primary' : 'text-slate-400'
          }`}>
            <span className="material-symbols-outlined text-xl">confirmation_number</span>
            <span className="text-[10px] font-medium">Bookings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

export default OperatorDashboard;
