import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { getRevenueReport } from '../../../api/operatorReportService';
import { Card, EmptyState, FilterTabs, PageHeader, StatCard } from '../../../shared/components/console/ConsoleUI';
import { headerButton } from '../../../shared/components/console/consoleStyles';
import { rupees } from '../utils/operatorFormat';

// Validated chart hues on the light surface (same as admin analytics): revenue = coral, bookings = blue
const REVENUE_COLOR = '#E8663D';
const BOOKINGS_COLOR = '#3B6FB6';
const GRID = '#EEF1F5';
const AXIS = { fontSize: 11, fill: '#94A3B8' };

const compact = (v) => {
  const n = Number(v || 0);
  if (n >= 1e5) return `₹${Number((n / 1e5).toFixed(1))}L`;
  if (n >= 1e3) return `₹${Number((n / 1e3).toFixed(n >= 1e4 ? 0 : 1))}K`;
  return `₹${n}`;
};
const dayLabel = (ymd) => new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const monthLabel = (ym) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const ranked = (obj) => Object.entries(obj || {}).map(([name, value]) => ({ name, value: Number(value) })).sort((a, b) => b.value - a.value);

const Tip = ({ active, payload, label, format, labelFormat }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200">
      <p className="font-semibold text-slate-500">{labelFormat(label)}</p>
      <p className="mt-0.5 flex items-center gap-1.5 font-black text-slate-900"><span className="w-2 h-2 rounded-full" style={{ background: payload[0].color || payload[0].fill }} />{format(payload[0].value)}</p>
    </div>
  );
};

const Delta = ({ current, previous }) => {
  if (previous == null) return null;
  if (!previous) return current ? <span className="text-xs font-bold text-green-700">New activity</span> : null;
  const pct = Math.round(((current - previous) / previous) * 100);
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${pct >= 0 ? 'text-green-700' : 'text-red-600'}`}>
      <span className="material-symbols-outlined text-[16px]">{pct >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>{Math.abs(pct)}% <span className="font-medium text-slate-400">vs previous</span>
    </span>
  );
};

const Ranked = ({ rows, color, format, empty, extra }) => {
  if (!rows.length) return <EmptyState icon="leaderboard" title="No data yet" subtitle={empty} />;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ol className="space-y-3 px-5 py-4">
      {rows.slice(0, 8).map((r) => (
        <li key={r.name}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-sm font-semibold text-slate-800">{r.name}</span>
            <span className="flex-shrink-0 text-sm font-black text-slate-900 tabular-nums">{format(r.value)}{extra ? <span className="ml-1.5 text-xs font-medium text-slate-400">{extra(r.name)}</span> : null}</span>
          </div>
          <div className="mt-1.5 h-2 rounded-r-full bg-slate-100"><div className="h-2 rounded-r-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }} /></div>
        </li>
      ))}
    </ol>
  );
};

const Earnings = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(14);
  const [months, setMonths] = useState(6);

  const load = useCallback(async () => {
    try {
      setReport((await getRevenueReport()) || {});
    } catch (e) {
      toast.error(e.message || 'Couldn’t load earnings');
      setReport((p) => p || {});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // The API returns the last 30 IST days (zero-filled) and the last 12 months, oldest first
  const days = useMemo(() => Object.keys(report?.dailyRevenue || {}).sort().map((day) => ({
    day, revenue: Number(report.dailyRevenue[day] || 0), bookings: Number(report.dailyBookings?.[day] || 0),
  })), [report]);
  const current = days.slice(-range);
  const previous = days.length >= range * 2 ? days.slice(-range * 2, -range) : null;
  const sum = (list, k) => list.reduce((n, d) => n + d[k], 0);
  const monthly = Object.keys(report?.monthlyRevenue || {}).sort().slice(-months).map((m) => ({ month: m, revenue: Number(report.monthlyRevenue[m] || 0) }));
  const byRoute = useMemo(() => ranked(report?.revenueByRoute), [report]);
  const byBus = useMemo(() => ranked(report?.revenueByBus), [report]);
  const confirmed = Number(report?.totalBookings || 0);
  const cancelRate = Number(report?.cancellationRate || 0);
  const busy = loading && !report;

  return (
    <OperatorLayout activeItem="earnings" title="Earnings">
      <div className="space-y-5">
        <PageHeader
          title="Earnings"
          subtitle="Ticket sales from confirmed bookings · dates in IST"
          actions={<button onClick={() => { setLoading(true); load(); }} disabled={loading} className={headerButton}><span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>Refresh</button>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="payments" tone="green" label="Total earnings" value={rupees(report?.totalRevenue)} sub="All time" loading={busy} />
          <StatCard icon="confirmation_number" tone="blue" label="Confirmed bookings" value={confirmed.toLocaleString('en-IN')} sub="All time" loading={busy} />
          <StatCard icon="receipt_long" tone="peach" label="Average booking" value={confirmed ? rupees(Number(report?.totalRevenue || 0) / confirmed) : '₹0'} loading={busy} />
          <StatCard icon="event_busy" tone={cancelRate >= 20 ? 'red' : 'amber'} label="Cancellation rate" value={`${cancelRate}%`} sub={`${Number(report?.totalCancelled || 0)} cancelled`} loading={busy} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900">Daily sales</h2>
          <FilterTabs options={[{ value: 7, label: '7 days' }, { value: 14, label: '14 days' }, { value: 30, label: '30 days' }]} value={range} onChange={setRange} label="Date range" />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Earnings" subtitle={`Last ${range} days`} icon="payments">
            <div className="px-5 pt-4">
              <p className="text-2xl font-black text-slate-900 tabular-nums">{rupees(sum(current, 'revenue'))}</p>
              <Delta current={sum(current, 'revenue')} previous={previous ? sum(previous, 'revenue') : null} />
            </div>
            <div className="h-56 px-2 pb-3 pt-2">
              {busy ? <div className="h-full rounded-xl bg-slate-50 animate-pulse" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={current} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="opRev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={REVENUE_COLOR} stopOpacity={0.14} /><stop offset="100%" stopColor={REVENUE_COLOR} stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="day" tickFormatter={dayLabel} interval={range === 30 ? 4 : range === 14 ? 1 : 0} tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={compact} tick={AXIS} axisLine={false} tickLine={false} width={52} allowDecimals={false} />
                    <Tooltip content={<Tip format={rupees} labelFormat={dayLabel} />} cursor={{ stroke: '#CBD5E1', strokeWidth: 1 }} />
                    <Area type="linear" dataKey="revenue" stroke={REVENUE_COLOR} strokeWidth={2} fill="url(#opRev)" dot={false} activeDot={{ r: 5, fill: REVENUE_COLOR, stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          <Card title="Bookings" subtitle={`Last ${range} days`} icon="confirmation_number">
            <div className="px-5 pt-4">
              <p className="text-2xl font-black text-slate-900 tabular-nums">{sum(current, 'bookings').toLocaleString('en-IN')}</p>
              <Delta current={sum(current, 'bookings')} previous={previous ? sum(previous, 'bookings') : null} />
            </div>
            <div className="h-56 px-2 pb-3 pt-2">
              {busy ? <div className="h-full rounded-xl bg-slate-50 animate-pulse" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={current} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="25%">
                    <CartesianGrid stroke={GRID} vertical={false} />
                    <XAxis dataKey="day" tickFormatter={dayLabel} interval={range === 30 ? 4 : range === 14 ? 1 : 0} tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                    <Tooltip content={<Tip format={(v) => `${v} bookings`} labelFormat={dayLabel} />} cursor={{ fill: '#F1F5F9' }} />
                    <Bar dataKey="bookings" fill={BOOKINGS_COLOR} radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>

        <Card title="Monthly earnings" icon="calendar_month" action={<FilterTabs options={[{ value: 3, label: '3 mo' }, { value: 6, label: '6 mo' }, { value: 12, label: '12 mo' }]} value={months} onChange={setMonths} label="Months" />}>
          <div className="h-60 px-2 pb-3 pt-4">
            {busy ? <div className="h-full rounded-xl bg-slate-50 animate-pulse" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={compact} tick={AXIS} axisLine={false} tickLine={false} width={52} allowDecimals={false} />
                  <Tooltip content={<Tip format={rupees} labelFormat={monthLabel} />} cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="revenue" fill={REVENUE_COLOR} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="By route" subtitle="All-time earnings" icon="route">
            {busy ? <div className="m-5 h-40 rounded-xl bg-slate-50 animate-pulse" /> : (
              <Ranked rows={byRoute} color={REVENUE_COLOR} format={rupees} empty="Shows up once a route has bookings."
                extra={(n) => (report?.bookingsByRoute?.[n] ? `${report.bookingsByRoute[n]} bookings` : '')} />
            )}
          </Card>
          <Card title="By bus" subtitle="All-time earnings" icon="directions_bus">
            {busy ? <div className="m-5 h-40 rounded-xl bg-slate-50 animate-pulse" /> : (
              <Ranked rows={byBus} color={REVENUE_COLOR} format={rupees} empty="Shows up once a bus has bookings." />
            )}
          </Card>
        </div>
      </div>
    </OperatorLayout>
  );
};

export default Earnings;
