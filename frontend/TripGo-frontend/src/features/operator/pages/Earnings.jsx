import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { getRevenueReport } from '../../../api/operatorReportService';
import { ROUTES } from '../../../shared/constants/routes';

const formatCurrency = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const shortLabel  = (v) => { const n = Number(v || 0); if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`; if (n >= 1000) return `₹${(n/1000).toFixed(0)}k`; return `₹${n}`; };
const normalizeEntries = (obj = {}) => Object.entries(obj || {}).map(([key, value]) => ({ key, value: Number(value || 0) }));
const lastN = (arr, n) => arr.slice(Math.max(0, arr.length - n));

const PIE_COLORS = ['#002046','#0057b7','#0ea5e9','#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981'];

/* ── Custom bar tooltip ── */
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white shadow-lg ring-1 ring-slate-200 px-3 py-2.5 text-xs">
      <p className="font-bold text-slate-700 mb-0.5">{label}</p>
      <p className="font-black text-[#002046]">{formatCurrency(payload[0]?.value)}</p>
    </div>
  );
};

/* ── Custom pie tooltip ── */
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white shadow-lg ring-1 ring-slate-200 px-3 py-2.5 text-xs max-w-[180px]">
      <p className="font-bold text-slate-700 mb-0.5 truncate">{payload[0]?.name}</p>
      <p className="font-black text-[#002046]">{formatCurrency(payload[0]?.value)}</p>
      <p className="text-slate-400">{payload[0]?.payload?.pct}% of total</p>
    </div>
  );
};

/* ── Bar chart card ── */
const RevenueBarChart = ({ title, entries, window, setWindow, windowOptions }) => {
  const data = entries.map(e => ({ name: e.key, value: e.value }));
  const hasData = data.some(d => d.value > 0);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-2">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <select
          value={window}
          onChange={(e) => setWindow(Number(e.target.value))}
          className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-[#002046] cursor-pointer"
        >
          {windowOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>
      <div className="px-2 pt-5 pb-3">
        {!hasData ? (
          <div className="h-52 flex flex-col items-center justify-center gap-3 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-200">bar_chart</span>
            <p className="text-sm text-slate-400">No revenue data for this period</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                interval={0}
                tickFormatter={(v) => v.length > 7 ? v.slice(5) : v}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={shortLabel}
                width={46}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.value > 0 ? '#002046' : '#e2e8f0'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

/* ── Pie chart card ── */
const RevenuePieChart = ({ title, entries, icon, emptyIcon, emptyLabel }) => {
  const total = entries.reduce((s, e) => s + e.value, 0);
  const data = entries.map((e, i) => ({
    name: e.key,
    value: e.value,
    pct: total > 0 ? ((e.value / total) * 100).toFixed(1) : '0',
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));
  const hasData = data.some(d => d.value > 0);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold bg-[#002046]/[0.08] text-[#002046]">
          {entries.length} {icon}
        </span>
      </div>

      {!hasData ? (
        <div className="p-10 flex flex-col items-center justify-center gap-3 text-center">
          <span className="material-symbols-outlined text-4xl text-slate-200">{emptyIcon}</span>
          <p className="text-sm text-slate-400">{emptyLabel}</p>
        </div>
      ) : (
        <div className="px-4 pt-4 pb-5">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={data.length > 1 ? 3 : 0}
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend table */}
          <div className="mt-2 space-y-2">
            {data.map((entry, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                  <span className="text-xs text-slate-600 truncate">{entry.name}</span>
                  {i === 0 && (
                    <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full flex-shrink-0">Top</span>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(entry.value)}</span>
                  <span className="text-[10px] text-slate-400 ml-1.5">{entry.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Main Component ── */
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

  useEffect(() => { fetchRevenue(); }, []);

  const dailyEntries = useMemo(() => {
    const entries = normalizeEntries(report?.dailyRevenue).sort((a, b) => new Date(a.key) - new Date(b.key));
    return lastN(entries, dailyWindow);
  }, [report, dailyWindow]);

  const monthlyEntries = useMemo(() => {
    const entries = normalizeEntries(report?.monthlyRevenue).sort((a, b) => a.key.localeCompare(b.key));
    return lastN(entries, monthlyWindow);
  }, [report, monthlyWindow]);

  const routeEntries = useMemo(() => normalizeEntries(report?.revenueByRoute).sort((a, b) => b.value - a.value), [report]);
  const busEntries   = useMemo(() => normalizeEntries(report?.revenueByBus).sort((a, b) => b.value - a.value), [report]);

  return (
    <OperatorLayout activeItem="earnings" title="Earnings">
      <div className="space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Revenue Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Live revenue and booking analytics</p>
          </div>
          <button
            onClick={fetchRevenue}
            disabled={loadingReport}
            className="flex-shrink-0 flex items-center gap-2 rounded-2xl bg-[#002046] text-white px-4 sm:px-5 py-2.5 text-sm font-bold hover:bg-[#003a80] transition-colors shadow-sm disabled:opacity-60"
          >
            {loadingReport ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <span className="material-symbols-outlined text-base">refresh</span>
            )}
            Refresh
          </button>
        </div>

        {loadingReport ? (
          <div className="p-16 flex items-center justify-center gap-3 text-sm text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
            Loading revenue dashboard...
          </div>
        ) : (
          <>
            {/* Stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden">
                <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
                <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">Total Revenue</p>
                <p className="text-2xl sm:text-3xl font-black">{formatCurrency(report?.totalRevenue)}</p>
                <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5">all time</p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden">
                <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
                <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">Total Bookings</p>
                <p className="text-2xl sm:text-3xl font-black">{Number(report?.totalBookings || 0)}</p>
                <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5">confirmed</p>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-3 sm:p-5 text-white shadow-sm relative overflow-hidden col-span-2 sm:col-span-1">
                <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
                <p className="text-[9px] sm:text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">Avg per Booking</p>
                <p className="text-2xl sm:text-3xl font-black">
                  {report?.totalBookings ? formatCurrency(Number(report.totalRevenue || 0) / Number(report.totalBookings)) : '₹0'}
                </p>
                <p className="text-[10px] sm:text-xs opacity-50 mt-1 sm:mt-1.5">average value</p>
              </div>
            </div>

            {/* Bar charts — daily & monthly */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <RevenueBarChart
                title="Daily Revenue"
                entries={dailyEntries}
                window={dailyWindow}
                setWindow={setDailyWindow}
                windowOptions={[
                  { value: 7, label: 'Last 7 days' },
                  { value: 14, label: 'Last 14 days' },
                  { value: 30, label: 'Last 30 days' },
                ]}
              />
              <RevenueBarChart
                title="Monthly Revenue"
                entries={monthlyEntries}
                window={monthlyWindow}
                setWindow={setMonthlyWindow}
                windowOptions={[
                  { value: 3, label: 'Last 3 months' },
                  { value: 6, label: 'Last 6 months' },
                  { value: 12, label: 'Last 12 months' },
                ]}
              />
            </div>

            {/* Pie charts — by route & by bus */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <RevenuePieChart
                title="Revenue by Route"
                entries={routeEntries}
                icon="routes"
                emptyIcon="route"
                emptyLabel="Route revenue will appear once bookings are made."
              />
              <RevenuePieChart
                title="Revenue by Bus"
                entries={busEntries}
                icon="buses"
                emptyIcon="directions_bus"
                emptyLabel="Bus revenue will appear once bookings are made."
              />
            </div>
          </>
        )}

      </div>
    </OperatorLayout>
  );
};

export default Earnings;
