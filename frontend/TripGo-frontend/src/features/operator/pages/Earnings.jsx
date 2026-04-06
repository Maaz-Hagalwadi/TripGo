import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getRevenueReport } from '../../../api/operatorReportService';
import { ROUTES } from '../../../shared/constants/routes';
import './OperatorDashboard.css';

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const normalizeEntries = (obj = {}) => Object.entries(obj || {}).map(([key, value]) => ({ key, value: Number(value || 0) }));

const lastN = (entries, n) => entries.slice(Math.max(0, entries.length - n));

const ChartBars = ({ title, entries, valueFormatter = (v) => String(v) }) => {
  const max = Math.max(...entries.map(e => e.value), 1);
  return (
    <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-5">
      <h4 className="text-sm font-bold mb-4">{title}</h4>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">No data available</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div key={entry.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500 truncate max-w-[65%]">{entry.key}</span>
                <span className="font-semibold">{valueFormatter(entry.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${(entry.value / max) * 100}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Earnings = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(true);
  const [dailyWindow, setDailyWindow] = useState(7);
  const [monthlyWindow, setMonthlyWindow] = useState(6);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const fetchRevenue = async () => {
    try {
      setLoadingReport(true);
      const data = await getRevenueReport();
      setReport(data || {});
    } catch (e) {
      setReport({});
      toast.error(e.message || 'Failed to load revenue report');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  const dailyEntries = useMemo(() => {
    const entries = normalizeEntries(report?.dailyRevenue).sort((a, b) => new Date(a.key) - new Date(b.key));
    return lastN(entries, dailyWindow);
  }, [report, dailyWindow]);

  const monthlyEntries = useMemo(() => {
    const entries = normalizeEntries(report?.monthlyRevenue).sort((a, b) => a.key.localeCompare(b.key));
    return lastN(entries, monthlyWindow);
  }, [report, monthlyWindow]);

  const routeEntries = useMemo(() => normalizeEntries(report?.revenueByRoute).sort((a, b) => b.value - a.value), [report]);
  const busEntries = useMemo(() => normalizeEntries(report?.revenueByBus).sort((a, b) => b.value - a.value), [report]);

  return (
    <OperatorLayout activeItem="earnings" title="Earnings">
      {loadingReport ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-slate-500">Loading revenue dashboard...</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold tracking-tight">Revenue Dashboard</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Live revenue and booking analytics</p>
            </div>
            <button
              onClick={fetchRevenue}
              className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Revenue</p>
                  <p className="text-3xl font-bold mt-1">{formatCurrency(report?.totalRevenue)}</p>
                </div>
                <span className="material-symbols-outlined text-primary">payments</span>
              </div>
            </div>
            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">Total Bookings</p>
                  <p className="text-3xl font-bold mt-1">{Number(report?.totalBookings || 0)}</p>
                </div>
                <span className="material-symbols-outlined text-primary">confirmation_number</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-5">
            <h4 className="text-sm font-bold mb-3">Report Controls</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Daily Revenue Window</label>
                <select
                  value={dailyWindow}
                  onChange={(e) => setDailyWindow(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value={7}>Last 7 days</option>
                  <option value={14}>Last 14 days</option>
                  <option value={30}>Last 30 days</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Monthly Revenue Window</label>
                <select
                  value={monthlyWindow}
                  onChange={(e) => setMonthlyWindow(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                >
                  <option value={3}>Last 3 months</option>
                  <option value={6}>Last 6 months</option>
                  <option value={12}>Last 12 months</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ChartBars title={`Daily Revenue (Last ${dailyWindow} Days)`} entries={dailyEntries} valueFormatter={formatCurrency} />
            <ChartBars title={`Monthly Revenue (Last ${monthlyWindow} Months)`} entries={monthlyEntries} valueFormatter={formatCurrency} />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <h4 className="text-sm font-bold mb-4">Revenue By Route</h4>
              {routeEntries.length === 0 ? (
                <p className="text-sm text-slate-400">No route revenue data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2">Route</th>
                        <th className="py-2 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routeEntries.map(row => (
                        <tr key={row.key} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <td className="py-2">{row.key}</td>
                          <td className="py-2 text-right font-semibold">{formatCurrency(row.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-5">
              <h4 className="text-sm font-bold mb-4">Revenue By Bus</h4>
              {busEntries.length === 0 ? (
                <p className="text-sm text-slate-400">No bus revenue data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-200 dark:border-slate-700">
                        <th className="py-2">Bus Name</th>
                        <th className="py-2 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {busEntries.map(row => (
                        <tr key={row.key} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <td className="py-2">{row.key}</td>
                          <td className="py-2 text-right font-semibold">{formatCurrency(row.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
};

export default Earnings;
