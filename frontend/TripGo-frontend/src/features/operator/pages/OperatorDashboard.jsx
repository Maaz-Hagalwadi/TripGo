import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../shared/contexts/AuthContext';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getBuses } from '../../../api/busService';
import { getOperatorDashboard } from '../../../api/routeService';
import { getOperatorBookings } from '../../../api/operatorBookingService';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

const SuspendedModal = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-op-card border border-orange-500/30 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
      <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="material-symbols-outlined text-orange-500 text-3xl">block</span>
      </div>
      <h2 className="text-xl font-bold mb-3">Account Suspended</h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
        Your operator account has been suspended. Please contact our support team at{' '}
        <a href="mailto:support@tripgo.com" className="text-primary font-semibold hover:underline">support@tripgo.com</a>
      </p>
      <button onClick={onClose} className="mt-6 px-6 py-2.5 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-all">
        Go to Login
      </button>
    </div>
  </div>
);

const OperatorDashboard = () => {
  const navigate = useNavigate();
  const { user, loading, suspendedWhileLoggedIn, setSuspendedWhileLoggedIn } = useAuth();
  const [buses, setBuses] = useState([]);
  const [loadingBuses, setLoadingBuses] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    confirmedBookings: 0,
    cancelledBookings: 0,
    totalRevenue: 0,
    totalBuses: 0,
    totalRoutes: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user || (user.role && user.role !== 'OPERATOR')) navigate(ROUTES.DASHBOARD, { replace: true });
  }, [user, loading, navigate]);

  if (!loading && user?.operatorStatus === 'SUSPENDED') {
    return (
      <div className="bg-op-bg min-h-screen flex items-center justify-center p-6">
        <div className="bg-white dark:bg-op-card border border-orange-500/30 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
          <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-orange-500 text-3xl">block</span>
          </div>
          <h2 className="text-xl font-bold mb-3">Account Suspended</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
            Your operator account has been suspended. Please contact our support team at{' '}
            <a href="mailto:support@tripgo.com" className="text-primary font-semibold hover:underline">support@tripgo.com</a>
          </p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    fetchBuses();
    fetchOperatorStats();
  }, []);

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

  const fetchOperatorStats = async () => {
    try {
      setLoadingStats(true);
      const [dashboard, bookingsResp, cancelledResp] = await Promise.all([
        getOperatorDashboard(),
        getOperatorBookings(),
        getOperatorBookings('CANCELLED')
      ]);

      const normalizeList = (resp) => {
        if (Array.isArray(resp)) return resp;
        if (Array.isArray(resp?.content)) return resp.content;
        if (Array.isArray(resp?.data)) return resp.data;
        return [];
      };

      const allBookings = normalizeList(bookingsResp);
      const cancelledBookingsList = normalizeList(cancelledResp);

      const totalBookings = allBookings.length || Number(dashboard?.totalBookings || 0);
      const cancelledBookings = cancelledBookingsList.length || Number(dashboard?.cancelledBookings || 0);
      const confirmedBookings = Number(dashboard?.confirmedBookings ?? Math.max(totalBookings - cancelledBookings, 0));

      setStats({
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        totalRevenue: Number(dashboard?.totalRevenue || 0),
        totalBuses: Number(dashboard?.totalBuses || 0),
        totalRoutes: Number(dashboard?.totalRoutes || 0)
      });
    } catch {
      setStats({
        totalBookings: 0,
        confirmedBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        totalBuses: 0,
        totalRoutes: 0
      });
    } finally {
      setLoadingStats(false);
    }
  };

  const activeBuses = buses.filter(b => b.active).length;
  const resolvedTotalBuses = buses.length > 0 ? buses.length : stats.totalBuses;

  return (
    <OperatorLayout activeItem="overview" title="Overview">
      {suspendedWhileLoggedIn && (
        <SuspendedModal onClose={() => {
          setSuspendedWhileLoggedIn(false);
          navigate(ROUTES.LOGIN);
        }} />
      )}
      <div className="space-y-8">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">

          {/* Total Buses — real data */}
          <div className="bg-white dark:bg-op-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Buses</p>
              <h3 className="text-3xl font-bold mt-2">{loadingBuses ? '...' : resolvedTotalBuses}</h3>
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">info</span>
                {loadingStats ? '...' : `${stats.totalRoutes} routes`} · {loadingBuses ? '...' : `${activeBuses} active`}
              </p>
            </div>
            <div className="bg-primary/10 p-3 rounded-lg text-primary">
              <span className="material-symbols-outlined">directions_bus</span>
            </div>
          </div>

          {/* Confirmed Bookings */}
          <div className="bg-white dark:bg-op-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Confirmed Bookings</p>
              <h3 className="text-3xl font-bold mt-2">{loadingStats ? '...' : stats.confirmedBookings}</h3>
              <p className="text-xs text-slate-400 mt-2">Cancelled: {loadingStats ? '...' : stats.cancelledBookings}</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg text-green-500">
              <span className="material-symbols-outlined">route</span>
            </div>
          </div>

          {/* Total Bookings */}
          <div className="bg-white dark:bg-op-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Bookings</p>
              <h3 className="text-3xl font-bold mt-2">{loadingStats ? '...' : stats.totalBookings}</h3>
              <p className="text-xs text-slate-400 mt-2">All booking statuses</p>
            </div>
            <div className="bg-orange-500/10 p-3 rounded-lg text-orange-500">
              <span className="material-symbols-outlined">confirmation_number</span>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-primary p-6 rounded-xl flex items-start justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-sm font-medium text-white/80">Total Revenue</p>
              <h3 className="text-3xl font-bold mt-2 text-white">{loadingStats ? '...' : `₹${Math.round(stats.totalRevenue).toLocaleString()}`}</h3>
              <p className="text-xs text-white/80 mt-2">From dashboard API</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg text-white relative z-10">
              <span className="material-symbols-outlined">payments</span>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Live Trip Status */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold tracking-tight">Live Trip Status</h3>
            </div>
            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">route</span>
                <p className="text-slate-500 font-medium">
                  {loadingStats ? 'Loading dashboard stats...' : `${stats.totalRoutes} route${stats.totalRoutes > 1 ? 's' : ''} configured`}
                </p>
                <p className="text-slate-400 text-sm mt-1">
                  {loadingStats ? 'Fetching latest operator dashboard data.' : `${stats.totalBuses} buses and ${stats.totalBookings} bookings in summary.`}
                </p>
                <button
                  onClick={() => navigate(ROUTES.OPERATOR_SCHEDULES)}
                  className="mt-4 px-4 py-2 bg-primary text-black text-sm font-bold rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Create Schedule
                </button>
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
                    <span className="w-2 h-2 rounded-full bg-primary"></span> {activeBuses} Active
                  </span>
                  <span className="flex items-center gap-2 text-sm text-white bg-op-bg/60 backdrop-blur px-3 py-1 rounded-full border border-white/10">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> {buses.length - activeBuses} In Garage
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight">Recent Activity</h3>
            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-6">
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">history</span>
                <p className="text-slate-500 font-medium">No recent activity</p>
                <p className="text-slate-400 text-sm mt-1">Bookings and events will appear here.</p>
              </div>
            </div>

            {/* Fleet Stats — real data */}
            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
              <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Fleet Overview</h4>
              {loadingBuses ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              ) : buses.length === 0 ? (
                <p className="text-sm text-slate-400">No buses registered yet.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Buses</span>
                    <span className="text-sm font-bold text-green-500">{activeBuses} / {buses.length}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full transition-all" style={{ width: buses.length ? `${(activeBuses / buses.length) * 100}%` : '0%' }}></div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-sm">Pending Approval</span>
                    <span className="text-sm font-bold text-yellow-500">{buses.length - activeBuses}</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-yellow-500 h-full transition-all" style={{ width: buses.length ? `${((buses.length - activeBuses) / buses.length) * 100}%` : '0%' }}></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default OperatorDashboard;
