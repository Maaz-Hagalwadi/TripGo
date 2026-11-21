import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';
import AdminLayout from '../shared/components/AdminLayout';
import {
  getOperators, approveOperator, rejectOperator, suspendOperator,
  getBuses, approveBus, rejectBus,
} from '../api/adminService';
import { getAdminAnalytics } from '../api/adminAnalyticsService';
import { refreshPendingCounts } from '../features/admin/hooks/usePendingCounts';
import {
  ActionButton, Avatar, Card, ConfirmDialog, EmptyState, FilterTabs, PageHeader, Pagination,
  SearchInput, SkeletonRows, StatCard, StatusPill,
} from '../shared/components/console/ConsoleUI';
import { headerButton } from '../shared/components/console/consoleStyles';

const PAGE_SIZE = 10;
// The backend has no "rejected" state for buses (reject = inactive, same as pending), so buses
// rejected from this browser are remembered locally to keep them out of the approval queue.
const REJECTED_BUSES_KEY = 'tripgo_admin_rejected_buses';

const OPERATOR_STATUS = {
  PENDING: { label: 'Pending', tone: 'amber' },
  APPROVED: { label: 'Approved', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
  SUSPENDED: { label: 'Suspended', tone: 'slate' },
};
const BUS_STATUS = {
  PENDING: { label: 'Awaiting approval', tone: 'amber' },
  ACTIVE: { label: 'Active', tone: 'green' },
  REJECTED: { label: 'Rejected', tone: 'red' },
};

const readRejected = () => {
  try { return JSON.parse(localStorage.getItem(REJECTED_BUSES_KEY)) || []; } catch { return []; }
};

const timeAgo = (value) => {
  const ms = Date.now() - new Date(value).getTime();
  if (!value || !Number.isFinite(ms)) return '—';
  const days = Math.floor(ms / 864e5);
  if (days < 1) {
    const hrs = Math.floor(ms / 36e5);
    return hrs < 1 ? 'Just now' : `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  }
  if (days < 30) return `${days} day${days > 1 ? 's' : ''} ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};
const fullDate = (value) => (value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '');
const prettyType = (value) => String(value || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bAc\b/, 'AC');
const rupees = (v) => `₹${Math.round(Number(v || 0)).toLocaleString('en-IN')}`;
const getGreeting = () => {
  const h = Number(new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const DashboardBody = ({ tab }) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [operators, setOperators] = useState([]);
  const [buses, setBuses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectedBusIds, setRejectedBusIds] = useState(readRejected);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ops, bs] = await Promise.all([getOperators(), getBuses()]);
      setOperators(Array.isArray(ops) ? ops : []);
      setBuses(Array.isArray(bs) ? bs : []);
    } catch (e) {
      setError(e.message || 'Couldn’t load data');
    } finally {
      setLoading(false);
    }
    getAdminAnalytics().then(setStats).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveRejected = (ids) => {
    setRejectedBusIds(ids);
    try { localStorage.setItem(REJECTED_BUSES_KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
  };

  const busStatus = useCallback((bus) => (bus.active ? 'ACTIVE' : rejectedBusIds.includes(bus.id) ? 'REJECTED' : 'PENDING'), [rejectedBusIds]);
  const pendingOperators = useMemo(() => operators.filter((o) => o.status === 'PENDING')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)), [operators]);
  const pendingBuses = useMemo(() => buses.filter((b) => busStatus(b) === 'PENDING')
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)), [buses, busStatus]);

  const ask = (config) => setConfirm(config);
  const runConfirmed = async () => {
    setBusy(true);
    try {
      await confirm.run();
      toast.success(confirm.success);
      setConfirm(null);
      await load();
      refreshPendingCounts();
    } catch (e) {
      toast.error(e.message || 'That didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const operatorActions = (op) => {
    const approve = { key: 'approve', icon: 'check', tone: 'approve', label: op.status === 'PENDING' ? 'Approve' : 'Re-approve',
      onClick: () => ask({ title: `Approve ${op.name}?`, message: 'They’ll be emailed and can start adding buses and schedules.', confirmLabel: 'Approve', tone: 'approve', run: () => approveOperator(op.id), success: `${op.name} approved` }) };
    if (op.status === 'PENDING') {
      return [approve, { key: 'reject', icon: 'close', tone: 'danger', label: 'Reject',
        onClick: () => ask({ title: `Reject ${op.name}?`, message: 'They’ll be emailed that their application wasn’t approved.', confirmLabel: 'Reject', tone: 'danger', run: () => rejectOperator(op.id), success: `${op.name} rejected` }) }];
    }
    if (op.status === 'APPROVED') {
      return [{ key: 'suspend', icon: 'block', tone: 'warn', label: 'Suspend',
        onClick: () => ask({ title: `Suspend ${op.name}?`, message: 'They’ll be signed out immediately and can’t manage buses or schedules until re-approved.', confirmLabel: 'Suspend', tone: 'danger', run: () => suspendOperator(op.id), success: `${op.name} suspended` }) }];
    }
    return [approve];
  };

  const busActions = (bus) => {
    const status = busStatus(bus);
    if (status === 'ACTIVE') return [];
    const approve = { key: 'approve', icon: 'check', tone: 'approve', label: 'Approve',
      onClick: () => ask({ title: `Approve ${bus.name}?`, message: 'The bus goes live and its operator is notified.', confirmLabel: 'Approve', tone: 'approve',
        run: async () => { await approveBus(bus.id); saveRejected(rejectedBusIds.filter((id) => id !== bus.id)); }, success: `${bus.name} is now active` }) };
    if (status === 'REJECTED') return [approve];
    return [approve, { key: 'reject', icon: 'close', tone: 'danger', label: 'Reject',
      onClick: () => ask({ title: `Reject ${bus.name}?`, message: 'The operator is emailed that the bus wasn’t approved.', confirmLabel: 'Reject', tone: 'danger',
        run: async () => { await rejectBus(bus.id); saveRejected([...new Set([...rejectedBusIds, bus.id])]); }, success: `${bus.name} rejected` }) }];
  };

  const setFilter = (status) => {
    const next = new URLSearchParams({ tab });
    if (status !== 'ALL') next.set('status', status);
    setSearchParams(next);
  };

  const shared = { loading, error, onRetry: load };

  return (
    <>
      {tab === 'overview' && (
        <Overview
          {...shared}
          user={user}
          operators={operators}
          buses={buses}
          stats={stats}
          pendingOperators={pendingOperators}
          pendingBuses={pendingBuses}
          operatorActions={operatorActions}
          busActions={busActions}
          navigate={navigate}
        />
      )}
      {tab === 'operators' && (
        <OperatorsTab
          {...shared}
          operators={operators}
          filter={(searchParams.get('status') || 'ALL').toUpperCase()}
          onFilter={setFilter}
          focusId={searchParams.get('operatorId')}
          actions={operatorActions}
        />
      )}
      {tab === 'buses' && (
        <BusesTab
          {...shared}
          buses={buses}
          busStatus={busStatus}
          filter={(searchParams.get('status') || 'ALL').toUpperCase()}
          onFilter={setFilter}
          focusId={searchParams.get('busId')}
          actions={busActions}
          onOperator={(id) => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=operators&operatorId=${id}`)}
        />
      )}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          tone={confirm.tone}
          busy={busy}
          onConfirm={runConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
};

const ErrorBanner = ({ error, onRetry }) => (error ? (
  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 border border-red-200 px-5 py-3">
    <p className="text-sm text-red-700"><span className="font-bold">Couldn’t load data.</span> {error}</p>
    <button onClick={onRetry} className="text-sm font-bold text-red-700 underline">Try again</button>
  </div>
) : null);

const Actions = ({ items }) => (
  <div className="flex flex-wrap justify-end gap-1.5">
    {items.map(({ key, label, ...rest }) => <ActionButton key={key} {...rest}>{label}</ActionButton>)}
  </div>
);

/* ── Overview ─────────────────────────────────────────────────────────────── */

const Overview = ({ loading, error, onRetry, user, operators, buses, stats, pendingOperators, pendingBuses, operatorActions, busActions, navigate }) => {
  const pendingTotal = pendingOperators.length + pendingBuses.length;
  const activeBuses = buses.filter((b) => b.active).length;
  const last7 = useMemo(() => {
    const days = Object.keys(stats?.dailyBookings || {}).sort().slice(-7);
    return {
      bookings: days.reduce((s, d) => s + Number(stats.dailyBookings[d] || 0), 0),
      revenue: days.reduce((s, d) => s + Number(stats.dailyRevenue?.[d] || 0), 0),
    };
  }, [stats]);
  const statusCounts = Object.keys(OPERATOR_STATUS).map((s) => ({ s, n: operators.filter((o) => o.status === s).length }));
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata' });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={`${getGreeting()}${user?.firstName ? `, ${user.firstName}` : ''}`}
        title="Admin overview"
        subtitle={loading ? today : `${today} · ${pendingTotal ? `${pendingTotal} item${pendingTotal > 1 ? 's' : ''} waiting for your review` : 'Nothing waiting for review'}`}
        actions={(
          <>
            <button onClick={onRetry} disabled={loading} className={headerButton}>
              <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              Refresh
            </button>
            <button onClick={() => navigate(ROUTES.ADMIN_ANALYTICS)} className={headerButton}>
              <span className="material-symbols-outlined text-[18px]">monitoring</span>
              Analytics
            </button>
          </>
        )}
      />
      <ErrorBanner error={error} onRetry={onRetry} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon="pending_actions" tone="peach" label="Waiting for approval" loading={loading} value={pendingTotal}
          sub={`${pendingOperators.length} operator${pendingOperators.length !== 1 ? 's' : ''} · ${pendingBuses.length} bus${pendingBuses.length !== 1 ? 'es' : ''}`}
          onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=${pendingOperators.length || !pendingBuses.length ? 'operators' : 'buses'}&status=PENDING`)} />
        <StatCard icon="payments" tone="green" label="Revenue (all time)" loading={!stats} value={rupees(stats?.totalRevenue)}
          sub={stats ? `${Number(stats.totalBookings || 0).toLocaleString('en-IN')} confirmed bookings` : undefined} onClick={() => navigate(ROUTES.ADMIN_ANALYTICS)} />
        <StatCard icon="group" tone="blue" label="Registered users" loading={!stats} value={Number(stats?.totalUsers || 0).toLocaleString('en-IN')}
          sub="Travellers, operators and admins" onClick={() => navigate(ROUTES.ADMIN_USERS)} />
        <StatCard icon="directions_bus" tone="navy" label="Active buses" loading={loading} value={activeBuses}
          sub={`of ${buses.length} registered`} onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=buses`)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] xl:items-start">
        <div className="space-y-5 min-w-0">
          <Card
            title="Operators awaiting approval"
            subtitle={loading ? undefined : pendingOperators.length ? 'Oldest applications first' : undefined}
            icon="domain"
            action={pendingOperators.length > 5 && (
              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=operators&status=PENDING`)} className="text-xs font-bold text-primary hover:text-[#FF8A65]">
                View all {pendingOperators.length}
              </button>
            )}
          >
            {loading ? <SkeletonRows rows={3} /> : pendingOperators.length === 0 ? (
              <EmptyState icon="task_alt" title="All caught up" subtitle="No operator applications to review." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingOperators.slice(0, 5).map((op) => (
                  <li key={op.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <Avatar name={op.name} />
                    <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-0">
                      <p className="font-bold text-slate-900 truncate">{op.name}</p>
                      <p className="text-xs text-slate-500 truncate">{[op.contactEmail, op.contactPhone].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="flex w-full items-center justify-between gap-3 pl-12 sm:w-auto sm:pl-0">
                      <span className="text-xs text-slate-400" title={fullDate(op.createdAt)}>Applied {timeAgo(op.createdAt).toLowerCase()}</span>
                      <Actions items={operatorActions(op)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Buses awaiting approval"
            subtitle={loading ? undefined : pendingBuses.length ? 'Oldest submissions first' : undefined}
            icon="directions_bus"
            action={pendingBuses.length > 5 && (
              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=buses&status=PENDING`)} className="text-xs font-bold text-primary hover:text-[#FF8A65]">
                View all {pendingBuses.length}
              </button>
            )}
          >
            {loading ? <SkeletonRows rows={3} /> : pendingBuses.length === 0 ? (
              <EmptyState icon="task_alt" title="All caught up" subtitle="No buses waiting for approval." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {pendingBuses.slice(0, 5).map((bus) => (
                  <li key={bus.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                    <span className="w-9 h-9 flex-shrink-0 rounded-full bg-primary/5 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px] text-primary">directions_bus</span>
                    </span>
                    <div className="min-w-0 flex-1 basis-[calc(100%-3rem)] sm:basis-0">
                      <p className="font-bold text-slate-900 truncate">{bus.name}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {[bus.operatorName, prettyType(bus.busType), bus.totalSeats && `${bus.totalSeats} seats`, bus.vehicleNumber].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="flex w-full items-center justify-between gap-3 pl-12 sm:w-auto sm:pl-0">
                      <span className="text-xs text-slate-400" title={fullDate(bus.createdAt)}>Submitted {timeAgo(bus.createdAt).toLowerCase()}</span>
                      <Actions items={busActions(bus)} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Last 7 days" icon="trending_up" action={(
            <button onClick={() => navigate(ROUTES.ADMIN_ANALYTICS)} className="text-xs font-bold text-primary hover:text-[#FF8A65]">Details</button>
          )}>
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              {[['Bookings', last7.bookings.toLocaleString('en-IN')], ['Revenue', rupees(last7.revenue)]].map(([label, value]) => (
                <div key={label} className="px-5 py-4">
                  <p className="text-xs font-bold text-slate-500">{label}</p>
                  {stats ? <p className="mt-0.5 text-xl font-black text-slate-900 tabular-nums">{value}</p> : <span className="mt-1.5 block h-6 w-16 rounded bg-slate-100 animate-pulse" />}
                </div>
              ))}
            </div>
          </Card>

          <Card title="Operators by status" icon="donut_small">
            <div className="px-5 py-4 space-y-3.5">
              {statusCounts.map(({ s, n }) => (
                <button key={s} onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=operators&status=${s}`)} className="block w-full text-left group">
                  <span className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-slate-600 group-hover:text-primary">{OPERATOR_STATUS[s].label}</span>
                    <span className="font-bold text-slate-900 tabular-nums">{loading ? '–' : n}</span>
                  </span>
                  <span className="block h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <span className={`block h-full rounded-full ${{ PENDING: 'bg-amber-400', APPROVED: 'bg-green-500', REJECTED: 'bg-red-400', SUSPENDED: 'bg-slate-400' }[s]}`}
                      style={{ width: operators.length ? `${(n / operators.length) * 100}%` : 0 }} />
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card title="Shortcuts" icon="bolt">
            <div className="grid grid-cols-3 gap-2 p-4">
              {[['sell', 'Promo codes', ROUTES.ADMIN_PROMOS], ['reviews', 'Reviews', ROUTES.ADMIN_REVIEWS], ['history', 'Audit logs', ROUTES.ADMIN_AUDIT_LOGS]].map(([icon, label, route]) => (
                <button key={label} onClick={() => navigate(route)} className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 px-2 py-3 text-xs font-bold text-slate-600 hover:border-[#FF8A65] hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[22px] text-orange-600">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

/* ── Operators ────────────────────────────────────────────────────────────── */

const FocusBanner = ({ label, onClear }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#FFF7F2] border border-[#FDBA74]/50 px-5 py-3 text-sm text-slate-700">
    <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-orange-600">filter_alt</span>{label}</span>
    <button onClick={onClear} className="font-bold text-primary hover:text-[#FF8A65]">Show all</button>
  </div>
);

const OperatorsTab = ({ loading, error, onRetry, operators, filter, onFilter, focusId, actions }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const q = search.trim().toLowerCase();
  const list = operators
    .filter((o) => !focusId || String(o.id) === focusId)
    .filter((o) => filter === 'ALL' || o.status === filter)
    .filter((o) => !q || [o.name, o.shortName, o.contactEmail, o.contactPhone].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const safePage = Math.min(page, Math.max(0, Math.ceil(list.length / PAGE_SIZE) - 1));
  const rows = list.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const tabs = [{ value: 'ALL', label: 'All', count: operators.length },
    ...Object.entries(OPERATOR_STATUS).map(([value, { label }]) => ({ value, label, count: operators.filter((o) => o.status === value).length }))];

  return (
    <div className="space-y-5">
      <PageHeader title="Operators" subtitle="Review applications and manage operator accounts"
        actions={<button onClick={onRetry} disabled={loading} className={headerButton}><span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>Refresh</button>} />
      <ErrorBanner error={error} onRetry={onRetry} />
      {focusId && <FocusBanner label="Showing one operator from a notification or bus" onClear={() => onFilter('ALL')} />}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <FilterTabs options={tabs} value={filter} onChange={(v) => { onFilter(v); setPage(0); }} label="Operator status" />
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search name, email or phone" className="lg:ml-auto lg:w-80" />
      </div>

      <Card>
        {loading ? <SkeletonRows /> : rows.length === 0 ? (
          <EmptyState icon="domain" title="No operators found" subtitle={q || filter !== 'ALL' ? 'Try a different filter or search.' : 'Operators appear here when they register.'} />
        ) : (
          <>
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Operator</th>
                  <th className="px-5 py-3">Contact</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Registered</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((op) => (
                  <tr key={op.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={op.name} />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 truncate">{op.name}</p>
                          {op.shortName && <p className="text-xs text-slate-400">{op.shortName}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm">
                      <p className="text-slate-700 truncate max-w-[240px]">{op.contactEmail || '—'}</p>
                      <p className="text-xs text-slate-400">{op.contactPhone || ''}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-slate-500 hidden lg:table-cell" title={fullDate(op.createdAt)}>{timeAgo(op.createdAt)}</td>
                    <td className="px-5 py-3.5"><StatusPill tone={OPERATOR_STATUS[op.status]?.tone}>{OPERATOR_STATUS[op.status]?.label || op.status}</StatusPill></td>
                    <td className="px-5 py-3.5"><Actions items={actions(op)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="md:hidden divide-y divide-slate-100">
              {rows.map((op) => (
                <li key={op.id} className="px-4 py-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar name={op.name} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900">{op.name}</p>
                      <p className="text-xs text-slate-500 break-all">{[op.contactEmail, op.contactPhone].filter(Boolean).join(' · ')}</p>
                    </div>
                    <StatusPill tone={OPERATOR_STATUS[op.status]?.tone}>{OPERATOR_STATUS[op.status]?.label || op.status}</StatusPill>
                  </div>
                  {actions(op).length > 0 && <Actions items={actions(op)} />}
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination page={safePage} total={list.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </Card>
    </div>
  );
};

/* ── Buses ────────────────────────────────────────────────────────────────── */

const BusesTab = ({ loading, error, onRetry, buses, busStatus, filter, onFilter, focusId, actions, onOperator }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const q = search.trim().toLowerCase();
  const list = buses
    .filter((b) => !focusId || String(b.id) === focusId)
    .filter((b) => filter === 'ALL' || busStatus(b) === filter)
    .filter((b) => !q || [b.name, b.busCode, b.vehicleNumber, b.operatorName, b.model].some((v) => String(v || '').toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const safePage = Math.min(page, Math.max(0, Math.ceil(list.length / PAGE_SIZE) - 1));
  const rows = list.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const tabs = [{ value: 'ALL', label: 'All', count: buses.length },
    ...Object.entries(BUS_STATUS).map(([value, { label }]) => ({ value, label: value === 'PENDING' ? 'Pending' : label, count: buses.filter((b) => busStatus(b) === value).length }))];

  return (
    <div className="space-y-5">
      <PageHeader title="Buses" subtitle="Approve new buses before they can be scheduled and booked"
        actions={<button onClick={onRetry} disabled={loading} className={headerButton}><span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>Refresh</button>} />
      <ErrorBanner error={error} onRetry={onRetry} />
      {focusId && <FocusBanner label="Showing one bus from a notification" onClear={() => onFilter('ALL')} />}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <FilterTabs options={tabs} value={filter} onChange={(v) => { onFilter(v); setPage(0); }} label="Bus status" />
        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search bus, number plate or operator" className="lg:ml-auto lg:w-80" />
      </div>

      <Card>
        {loading ? <SkeletonRows /> : rows.length === 0 ? (
          <EmptyState icon="directions_bus" title="No buses found" subtitle={q || filter !== 'ALL' ? 'Try a different filter or search.' : 'Buses appear here when operators add them.'} />
        ) : (
          <>
            <table className="hidden md:table w-full">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-3">Bus</th>
                  <th className="px-5 py-3">Operator</th>
                  <th className="px-5 py-3 hidden lg:table-cell">Type</th>
                  <th className="px-5 py-3 hidden xl:table-cell">Submitted</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((bus) => {
                  const status = busStatus(bus);
                  return (
                    <tr key={bus.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-900">{bus.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{[bus.vehicleNumber, bus.busCode].filter(Boolean).join(' · ') || '—'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm">
                        {bus.operatorId ? (
                          <button onClick={() => onOperator(bus.operatorId)} className="font-semibold text-slate-700 hover:text-[#FF8A65] text-left">{bus.operatorName}</button>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 hidden lg:table-cell">
                        {prettyType(bus.busType) || '—'}
                        {bus.totalSeats ? <span className="text-slate-400"> · {bus.totalSeats} seats</span> : null}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 hidden xl:table-cell" title={fullDate(bus.createdAt)}>{timeAgo(bus.createdAt)}</td>
                      <td className="px-5 py-3.5"><StatusPill tone={BUS_STATUS[status].tone}>{BUS_STATUS[status].label}</StatusPill></td>
                      <td className="px-5 py-3.5"><Actions items={actions(bus)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ul className="md:hidden divide-y divide-slate-100">
              {rows.map((bus) => {
                const status = busStatus(bus);
                return (
                  <li key={bus.id} className="px-4 py-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-900">{bus.name}</p>
                        <p className="text-xs text-slate-500">{[bus.operatorName, prettyType(bus.busType), bus.vehicleNumber].filter(Boolean).join(' · ')}</p>
                      </div>
                      <StatusPill tone={BUS_STATUS[status].tone}>{BUS_STATUS[status].label}</StatusPill>
                    </div>
                    {actions(bus).length > 0 && <Actions items={actions(bus)} />}
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <Pagination page={safePage} total={list.length} pageSize={PAGE_SIZE} onChange={setPage} />
      </Card>
      {filter === 'REJECTED' && (
        <p className="px-1 text-xs text-slate-500">Rejected buses are remembered on this device only — the server stores them the same way as pending ones.</p>
      )}
    </div>
  );
};

const TITLES = { overview: 'Overview', operators: 'Operators', buses: 'Buses' };

const AdminDashboard = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';
  // Users have their own page; old links to ?tab=users land there
  if (tab === 'users') return <Navigate to={ROUTES.ADMIN_USERS} replace />;
  const safeTab = TITLES[tab] ? tab : 'overview';
  return (
    <AdminLayout activeItem={safeTab} title={TITLES[safeTab]}>
      <DashboardBody tab={safeTab} />
    </AdminLayout>
  );
};

export default AdminDashboard;
