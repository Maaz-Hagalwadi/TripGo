import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ResponsiveContainer,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import AdminLayout from '../shared/components/AdminLayout';
import { useAuth } from '../shared/contexts/AuthContext';
import { getAdminAnalytics } from '../api/adminAnalyticsService';
import { ROUTES } from '../shared/constants/routes';

const fmt   = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const short = (v) => { const n = Number(v || 0); if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`; if (n >= 1000) return `₹${(n/1000).toFixed(0)}k`; return `₹${n}`; };
const normalizeEntries = (obj = {}) => Object.entries(obj || {}).map(([key, value]) => ({ key, value: Number(value || 0) }));
const lastN = (arr, n) => arr.slice(Math.max(0, arr.length - n));

const RevTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white shadow-lg ring-1 ring-slate-200 px-3 py-2.5 text-xs">
      <p className="font-bold text-slate-700 mb-0.5">{label}</p>
      <p className="font-black text-[#002046]">{fmt(payload[0]?.value)}</p>
    </div>
  );
};

const CntTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white shadow-lg ring-1 ring-slate-200 px-3 py-2.5 text-xs">
      <p className="font-bold text-slate-700 mb-0.5">{label}</p>
      <p className="font-black text-[#002046]">{payload[0]?.value} bookings</p>
    </div>
  );
};

const TrendCard = ({ title, data, tooltip, yFormatter, color = '#002046', gradId }) => {
  const hasData = data.some(d => d.value > 0);
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-sm font-black text-slate-900">{title}</p>
      </div>
      <div className="px-2 pt-4 pb-3">
        {!hasData ? (
          <div className="h-44 flex flex-col items-center justify-center gap-2">
            <span className="material-symbols-outlined text-3xl text-slate-200">show_chart</span>
            <p className="text-xs text-slate-400">No data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={color} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={yFormatter} width={42} />
              <Tooltip content={tooltip} cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 2' }} />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 4, fill: color }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, sub, color = 'text-[#002046]', iconBg = 'bg-[#002046]/10' }) => (
  <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-4 sm:p-5 flex items-start gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <span className={`material-symbols-outlined text-lg ${color}`}>{icon}</span>
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-black text-slate-900 mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

const LeaderboardTable = ({ title, icon, rows, valueLabel, valueFormat }) => (
  <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
      <p className="text-sm font-black text-slate-900">{title}</p>
      <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
    </div>
    {rows.length === 0 ? (
      <div className="py-10 flex flex-col items-center gap-2">
        <span className="material-symbols-outlined text-3xl text-slate-200">info</span>
        <p className="text-xs text-slate-400">No data yet</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">#</th>
              <th className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">Name</th>
              <th className="px-4 py-3 text-right text-slate-400 font-semibold uppercase tracking-wider">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.name} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                <td className="px-4 py-3 text-slate-400 font-bold">{i + 1}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {row.name}
                  {i === 0 && <span className="ml-1.5 text-[10px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">Top</span>}
                </td>
                <td className="px-4 py-3 text-right font-black text-[#002046]">{valueFormat(row.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </div>
);

const AdminAnalytics = () => {
  const navigate      = useNavigate();
  const { user, loading } = useAuth();
  const [data, setData]   = useState(null);
  const [busy, setBusy]   = useState(true);
  const [window, setWindow] = useState(14);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const fetch = async () => {
    try {
      setBusy(true);
      const res = await getAdminAnalytics();
      setData(res || {});
    } catch (e) {
      toast.error(e.message || 'Failed to load analytics');
      setData({});
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const dailyRevEntries = useMemo(() => {
    const entries = normalizeEntries(data?.dailyRevenue).sort((a, b) => a.key.localeCompare(b.key));
    return lastN(entries, window).map(e => ({ name: e.key, value: e.value }));
  }, [data, window]);

  const dailyCntEntries = useMemo(() => {
    const entries = normalizeEntries(data?.dailyBookings).sort((a, b) => a.key.localeCompare(b.key));
    return lastN(entries, window).map(e => ({ name: e.key, value: e.value }));
  }, [data, window]);

  const topOperators = useMemo(() =>
    Object.entries(data?.revenueByOperator || {})
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value).slice(0, 8),
    [data]
  );

  const topRoutes = useMemo(() =>
    Object.entries(data?.topRoutes || {})
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value).slice(0, 8),
    [data]
  );

  const totalAll = (data?.totalBookings || 0) + (data?.totalCancelled || 0);
  const cancelRate = totalAll > 0 ? ((data?.totalCancelled / totalAll) * 100).toFixed(1) : '0.0';

  return (
    <AdminLayout activeItem="analytics" title="Analytics">
      <div className="space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Platform Analytics</h1>
            <p className="text-sm text-slate-500 mt-0.5">Real-time platform-wide KPIs</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={window}
              onChange={e => setWindow(Number(e.target.value))}
              className="rounded-xl bg-white ring-1 ring-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:ring-[#002046] cursor-pointer"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <button
              onClick={fetch}
              disabled={busy}
              className="flex items-center gap-2 rounded-2xl bg-[#002046] text-white px-4 py-2.5 text-sm font-bold hover:bg-[#003a80] transition-colors disabled:opacity-60"
            >
              {busy ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <span className="material-symbols-outlined text-base">refresh</span>}
              Refresh
            </button>
          </div>
        </div>

        {busy && !data ? (
          <div className="p-16 flex items-center justify-center gap-3 text-sm text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
            Loading analytics…
          </div>
        ) : (
          <>
            {/* KPI grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon="group"            label="Total Users"       value={Number(data?.totalUsers || 0).toLocaleString()}  sub="registered"       iconBg="bg-sky-50"     color="text-sky-600" />
              <StatCard icon="business"         label="Operators"         value={`${data?.activeOperators || 0} / ${data?.totalOperators || 0}`} sub="active / total" iconBg="bg-violet-50" color="text-violet-600" />
              <StatCard icon="directions_bus"   label="Active Buses"      value={Number(data?.activeBuses || 0).toLocaleString()}  sub="approved"         iconBg="bg-emerald-50" color="text-emerald-600" />
              <StatCard icon="account_balance"  label="Total Revenue"     value={fmt(data?.totalRevenue)}   sub="all time"          iconBg="bg-[#002046]/10" color="text-[#002046]" />
              <StatCard icon="confirmation_number" label="Confirmed"      value={Number(data?.totalBookings || 0).toLocaleString()} sub="bookings"        iconBg="bg-emerald-50" color="text-emerald-600" />
              <StatCard icon="cancel"           label="Cancelled"         value={Number(data?.totalCancelled || 0).toLocaleString()} sub="bookings"       iconBg="bg-rose-50"    color="text-rose-600" />
              <StatCard icon="percent"          label="Cancellation Rate" value={`${cancelRate}%`}           sub="of all bookings"   iconBg={Number(cancelRate) >= 20 ? 'bg-rose-50' : 'bg-amber-50'} color={Number(cancelRate) >= 20 ? 'text-rose-600' : 'text-amber-600'} />
              <StatCard icon="payments"         label="Avg Booking Value"
                value={data?.totalBookings ? fmt(Number(data.totalRevenue || 0) / data.totalBookings) : '₹0'}
                sub="per booking" iconBg="bg-indigo-50" color="text-indigo-600" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <TrendCard
                title="Daily Revenue"
                data={dailyRevEntries}
                tooltip={<RevTooltip />}
                yFormatter={short}
                color="#002046"
                gradId="revGrad"
              />
              <TrendCard
                title="Daily Bookings"
                data={dailyCntEntries}
                tooltip={<CntTooltip />}
                yFormatter={v => v}
                color="#0ea5e9"
                gradId="cntGrad"
              />
            </div>

            {/* Leaderboards */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <LeaderboardTable
                title="Top Operators by Revenue"
                icon="leaderboard"
                rows={topOperators}
                valueLabel="Revenue"
                valueFormat={fmt}
              />
              <LeaderboardTable
                title="Top Routes by Bookings"
                icon="route"
                rows={topRoutes}
                valueLabel="Bookings"
                valueFormat={v => v.toLocaleString()}
              />
            </div>
          </>
        )}

      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
