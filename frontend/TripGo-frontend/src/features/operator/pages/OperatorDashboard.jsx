import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getBuses } from '../../../api/busService';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || (user.role && user.role !== 'OPERATOR')) navigate(ROUTES.DASHBOARD, { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => { fetchBuses(); }, []);

  const fetchBuses = async () => {
    try {
      setLoadingBuses(true);
      const data = await getBuses();
      setBuses(data || []);
    } catch {
      setBuses([]);
    } finally {
      setLoadingBuses(false);
    }
  };

  return (
    <OperatorLayout activeItem="overview" title="Overview">
      <div className="space-y-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">

          {/* Total Buses */}
          <div className="bg-white dark:bg-op-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between">
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
          <div className="bg-white dark:bg-op-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between">
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
          <div className="bg-white dark:bg-op-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between">
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

          {/* Live Trip Status */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">Live Trip Status</h3>
              <button className="text-sm font-medium text-primary flex items-center gap-1 hover:underline">
                View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-op-table-head border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Bus Code</th>
                      <th className="px-6 py-4 font-semibold">Route</th>
                      <th className="px-6 py-4 font-semibold">Current Location</th>
                      <th className="px-6 py-4 font-semibold">Occupancy</th>
                      <th className="px-6 py-4 font-semibold text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[
                      { code: 'TRP-102', route: 'New York → Boston', location: 'Near New Haven', pct: 85, status: 'On-Time', color: 'green' },
                      { code: 'TRP-088', route: 'Chicago → Detroit', location: 'St. Joseph Heights', pct: 42, status: 'Delayed', color: 'orange' },
                      { code: 'TRP-095', route: 'Seattle → Portland', location: 'Olympia Station', pct: 98, status: 'On-Time', color: 'green' },
                      { code: 'TRP-114', route: 'Miami → Orlando', location: 'Palm Beach', pct: 65, status: 'On-Time', color: 'green' },
                    ].map(({ code, route, location, pct, status, color }) => (
                      <tr key={code} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-medium text-primary">{code}</td>
                        <td className="px-6 py-4">{route}</td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{location}</td>
                        <td className="px-6 py-4">
                          <div className="w-full max-w-[100px] flex flex-col gap-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                              <div className="bg-primary h-full" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-[10px] font-bold">{pct}% Filled</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`px-2 py-1 rounded bg-${color}-500/10 text-${color}-500 text-[10px] font-bold uppercase tracking-wider`}>{status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Map */}
            <div className="h-64 rounded-xl overflow-hidden relative border border-slate-200 dark:border-slate-800">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d497698.77490949244!2d77.3507609!3d12.9539974!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bae1670c9b44e6d%3A0xf8dfc3e8517e4fe0!2sBengaluru%2C%20Karnataka!5e0!3m2!1sen!2sin!4v1234567890123!5m2!1sen!2sin"
                width="100%" height="100%" style={{ border: 0 }}
                allowFullScreen loading="lazy" referrerPolicy="no-referrer-when-downgrade"
                className="grayscale"
              ></iframe>
              <div className="absolute inset-0 bg-gradient-to-t from-op-bg/80 to-transparent flex items-end p-6 pointer-events-none">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2 text-sm text-white bg-op-bg/60 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-primary"></span> 12 Active
                  </span>
                  <span className="flex items-center gap-2 text-sm text-white bg-op-bg/60 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> 32 In Garage
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight">Recent Activity</h3>
            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="relative space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 dark:before:bg-slate-800">
                {[
                  { icon: 'confirmation_number', color: 'primary', title: 'New Booking: $45.00', time: '2 min ago', desc: 'User ID #89201 booked 1 seat on Route A (NY-BOS).' },
                  { icon: 'engineering', color: 'amber-500', title: 'Maintenance Alert', time: '45 min ago', desc: 'Bus TRP-098 is due for its 10k mile service check.' },
                  { icon: 'done_all', color: 'green-500', title: 'Trip Completed', time: '1 hr ago', desc: 'Bus TRP-072 safely arrived at Seattle terminal.' },
                  { icon: 'account_circle', color: 'primary', title: 'New Driver Onboarded', time: '3 hrs ago', desc: 'Marcus Wright assigned to South-Eastern routes.' },
                ].map(({ icon, color, title, time, desc }) => (
                  <div key={title} className="relative pl-8">
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full bg-${color}/20 text-${color} flex items-center justify-center ring-4 ring-white dark:ring-op-card z-10`}>
                      <span className="material-symbols-outlined text-sm">{icon}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{title}</p>
                        <span className="text-[10px] font-medium text-slate-400 uppercase">{time}</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-8 py-2.5 text-sm font-medium border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                Show All Activity
              </button>
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Quick Stats</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">On-Time Performance</span>
                  <span className="text-sm font-bold text-green-500">92%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: '92%' }}></div>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-sm">Avg. Occupancy</span>
                  <span className="text-sm font-bold text-primary">68%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full" style={{ width: '68%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default OperatorDashboard;
