import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import AdminLayout from '../shared/components/AdminLayout';
import { getAdminAnalytics } from '../api/adminAnalyticsService';
import { Card, EmptyState, FilterTabs, PageHeader, StatCard } from '../features/admin/components/AdminUI';
import { headerButton } from '../features/admin/components/adminStyles';

// Validated chart hues (light surface): revenue = coral, bookings = blue
const REVENUE_COLOR = '#E8663D';
const BOOKINGS_COLOR = '#3B6FB6';
const GRID = '#EEF1F5';
const AXIS_TEXT = '#94A3B8';

const rupees = (v) => `₹${Math.round(Number(v || 0)).toLocaleString('en-IN')}`;
const compactRupees = (v) => {
  const n = Number(v || 0);
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${Number((n / 1e3).toFixed(n >= 1e4 ? 0 : 1))}K`;
  return `₹${n}`;
};
const dayLabel = (ymd) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayLong = (ymd) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

const ranked = (obj) => Object.entries(obj || {}).map(([name, value]) => ({ name, value: Number(value) }))
  .sort((a, b) => b.value - a.value).slice(0, 8);

const RANGES = [{ value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 30, label: '30 days' }];

const ChartTooltip = ({ active, payload, label, format, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200">
      <p className="font-semibold text-slate-500">{dayLong(label)}</p>
      <p className="mt-0.5 flex items-center gap-1.5 font-black text-slate-900">
        <span className="w-2 h-2 rounded-full" style={{ background: payload[0].color || payload[0].fill }} />
        {format(payload[0].value)}{unit}
      </p>
    </div>
  );
};

/** Change vs the previous period of the same length; null when there's no earlier data */
const Delta = ({ current, previous }) => {
  if (previous == null) return null;
  if (previous === 0) return current > 0 ? <span className="text-xs font-bold text-green-700">New activity</span> : <span className="text-xs text-slate-400">No change</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const up = pct >= 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${up ? 'text-green-700' : 'text-red-600'}`}>
      <span className="material-symbols-outlined text-[16px]">{up ? 'arrow_upward' : 'arrow_downward'}</span>
      {Math.abs(pct)}% <span className="font-medium text-slate-400">vs previous</span>
    </span>
  );
};

const RankedBars = ({ rows, color, format, emptyText }) => {
  if (!rows.length) return <EmptyState icon="leaderboard" title="No data yet" subtitle={emptyText} />;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-3 px-5 py-4">
      {rows.map((row, i) => (
        <li key={row.name} className="grid grid-cols-[1.25rem_minmax(0,1fr)] items-center gap-x-2">
          <span className="self-start pt-0.5 text-xs font-bold text-slate-400 tabular-nums">{i + 1}</span>
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-semibold text-slate-800">{row.name}</span>
              <span className="flex-shrink-0 text-sm font-black text-slate-900 tabular-nums">{format(row.value)}</span>
            </div>
            <div className="mt-1.5 h-2 rounded-r-full bg-slate-100">
              <div className="h-2 rounded-r-full" style={{ width: `${Math.max(2, (row.value / max) * 100)}%`, background: color }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
};

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(14);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData((await getAdminAnalytics()) || {});
    } catch (e) {
      toast.error(e.message || 'Couldn’t load analytics');
      setData((prev) => prev || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // The API returns the last 30 IST days, zero-filled, oldest first
  const days = useMemo(() => Object.keys(data?.dailyBookings || {}).sort().map((day) => ({
    day,
    bookings: Number(data.dailyBookings[day] || 0),
    revenue: Number(data.dailyRevenue?.[day] || 0),
  })), [data]);
  const current = days.slice(-range);
  const previous = days.length >= range * 2 ? days.slice(-range * 2, -range) : null;
  const sum = (list, key) => list.reduce((s, d) => s + d[key], 0);
  const period = {
    revenue: sum(current, 'revenue'),
    bookings: sum(current, 'bookings'),
    prevRevenue: previous ? sum(previous, 'revenue') : null,
    prevBookings: previous ? sum(previous, 'bookings') : null,
  };

  const topOperators = useMemo(() => ranked(data?.revenueByOperator), [data]);
  const topRoutes = useMemo(() => ranked(data?.topRoutes), [data]);

  const confirmed = Number(data?.totalBookings || 0);
  const cancelled = Number(data?.totalCancelled || 0);
  const cancelRate = confirmed + cancelled > 0 ? (cancelled / (confirmed + cancelled)) * 100 : 0;
  const busy = loading && !data;
  const tickEvery = range === 30 ? 4 : range === 14 ? 1 : 0;

  return (
    <AdminLayout activeItem="analytics" title="Analytics">
      <div className="space-y-5">
        <PageHeader
          title="Analytics"
          subtitle="Bookings and revenue across TripGo · dates in IST"
          actions={<button onClick={load} disabled={loading} className={headerButton}><span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>Refresh</button>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="payments" tone="green" label="Revenue (all time)" value={rupees(data?.totalRevenue)} sub="Confirmed bookings" loading={busy} />
          <StatCard icon="confirmation_number" tone="blue" label="Confirmed bookings" value={confirmed.toLocaleString('en-IN')} sub={`${cancelled.toLocaleString('en-IN')} cancelled`} loading={busy} />
          <StatCard icon="receipt_long" tone="peach" label="Average booking" value={confirmed ? rupees(Number(data?.totalRevenue || 0) / confirmed) : '₹0'} sub="Per confirmed booking" loading={busy} />
          <StatCard icon="event_busy" tone={cancelRate >= 20 ? 'red' : 'amber'} label="Cancellation rate" value={`${cancelRate.toFixed(1)}%`} sub="Of confirmed + cancelled" loading={busy} />
          <StatCard icon="group" tone="navy" label="Users" value={Number(data?.totalUsers || 0).toLocaleString('en-IN')} loading={busy} />
          <StatCard icon="domain" tone="navy" label="Approved operators" value={`${data?.activeOperators || 0} of ${data?.totalOperators || 0}`} loading={busy} />
          <StatCard icon="directions_bus" tone="navy" label="Active buses" value={Number(data?.activeBuses || 0).toLocaleString('en-IN')} loading={busy} />
          <StatCard icon="route" tone="navy" label="Routes with bookings" value={Object.keys(data?.topRoutes || {}).length.toLocaleString('en-IN')} loading={busy} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900">Trends</h2>
          <FilterTabs options={RANGES} value={range} onChange={setRange} label="Date range" />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Revenue" subtitle={`Last ${range} days`} icon="payments">
            <div className="px-5 pt-4">
              <p className="text-2xl font-black text-slate-900 tabular-nums">{rupees(period.revenue)}</p>
              <Delta current={period.revenue} previous={period.prevRevenue} />
            </div>
            <div className="h-56 px-2 pb-3 pt-2">
              {busy ? <div className="h-full rounded-xl bg-slate-50 animate-pulse" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={current} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={REVENUE_COLOR} stopOpacity={0.14} />
                        <stop offset="100%" stopColor={REVENUE_COLOR} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="day" tickFormatter={dayLabel} interval={tickEvery} tick={{ fontSize: 11, fill: AXIS_TEXT }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compactRupees} tick={{ fontSize: 11, fill: AXIS_TEXT }} axisLine={false} tickLine={false} width={52} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip format={rupees} unit="" />} cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }} />
                    <Area type="linear" dataKey="revenue" stroke={REVENUE_COLOR} strokeWidth={2} fill="url(#revenueFill)" dot={false}
                      activeDot={{ r: 5, fill: REVENUE_COLOR, stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card title="Bookings" subtitle={`Last ${range} days`} icon="confirmation_number">
            <div className="px-5 pt-4">
              <p className="text-2xl font-black text-slate-900 tabular-nums">{period.bookings.toLocaleString('en-IN')}</p>
              <Delta current={period.bookings} previous={period.prevBookings} />
            </div>
            <div className="h-56 px-2 pb-3 pt-2">
              {busy ? <div className="h-full rounded-xl bg-slate-50 animate-pulse" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={current} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="day" tickFormatter={dayLabel} interval={tickEvery} tick={{ fontSize: 11, fill: AXIS_TEXT }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: AXIS_TEXT }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip format={(v) => v.toLocaleString('en-IN')} unit=" bookings" />} cursor={{ fill: '#F1F5F9' }} />
                    <Bar dataKey="bookings" fill={BOOKINGS_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        <details className="group rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-bold text-slate-700">
            Daily figures (table)
            <span className="material-symbols-outlined text-slate-400 transition-transform group-open:rotate-180">expand_more</span>
          </summary>
          <div className="max-h-80 overflow-y-auto border-t border-slate-100">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-5 py-2.5 text-right">Bookings</th>
                  <th className="px-5 py-2.5 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...current].reverse().map((d) => (
                  <tr key={d.day}>
                    <td className="px-5 py-2 text-slate-600">{dayLong(d.day)}</td>
                    <td className="px-5 py-2 text-right tabular-nums text-slate-900">{d.bookings}</td>
                    <td className="px-5 py-2 text-right tabular-nums text-slate-900">{rupees(d.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Top operators" subtitle="By revenue, all time" icon="domain">
            {busy ? <div className="m-5 h-48 rounded-xl bg-slate-50 animate-pulse" /> : (
              <RankedBars rows={topOperators} color={REVENUE_COLOR} format={rupees} emptyText="Operators show up once they have confirmed bookings." />
            )}
          </Card>
          <Card title="Top routes" subtitle="By confirmed bookings, all time" icon="route">
            {busy ? <div className="m-5 h-48 rounded-xl bg-slate-50 animate-pulse" /> : (
              <RankedBars rows={topRoutes} color={BOOKINGS_COLOR} format={(v) => v.toLocaleString('en-IN')} emptyText="Routes show up once they have confirmed bookings." />
            )}
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminAnalytics;
