import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';
import AdminLayout from '../shared/components/AdminLayout';
import CenterScreenLoader from '../shared/components/ui/CenterScreenLoader';
import {
  getOperators, approveOperator, rejectOperator, suspendOperator,
  getBuses, approveBus, getUsers,
} from '../api/adminService';

const PAGE_SIZE = 10;
const OPERATOR_STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
const BUS_STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE'];

const StatusBadge = ({ status }) => {
  const colors = {
    PENDING: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    APPROVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    REJECTED: 'bg-red-50 text-red-600 ring-1 ring-red-200',
    SUSPENDED: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    INACTIVE: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  };
  return <span className={`inline-flex rounded-lg px-2 py-1 text-xs font-bold ${colors[status] || colors.INACTIVE}`}>{status}</span>;
};

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
      <p className="mb-6 text-center font-semibold text-slate-900">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
        <button onClick={onConfirm} className="flex-1 rounded-xl bg-[#002046] py-2.5 text-sm font-bold text-white hover:bg-[#003a80] transition-colors">Confirm</button>
      </div>
    </div>
  </div>
);

const ViewToggle = ({ viewMode, onChange }) => (
  <div className="hidden sm:flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
    {[{ id: 'list', icon: 'view_list', label: 'List' }, { id: 'grid', icon: 'grid_view', label: 'Grid' }].map(mode => (
      <button key={mode.id} type="button" onClick={() => onChange(mode.id)}
        className={`rounded-xl px-3 py-2 text-sm font-semibold transition-all flex items-center gap-1.5 ${viewMode === mode.id ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
        <span className="material-symbols-outlined text-base">{mode.icon}</span>
        {mode.label}
      </button>
    ))}
  </div>
);

const InlinePagination = ({ page, total, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (total <= PAGE_SIZE) return null;
  return (
    <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-4">
      <p className="text-sm text-slate-400">
        Showing {page * PAGE_SIZE + 1}–{Math.min(total, (page + 1) * PAGE_SIZE)} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(Math.max(0, page - 1))} disabled={page === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <span className="material-symbols-outlined text-sm">chevron_left</span>
        </button>
        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const n = totalPages <= 5 ? i : Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
          return (
            <button key={n} onClick={() => onPageChange(n)} className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${page === n ? 'bg-[#002046] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {n + 1}
            </button>
          );
        })}
        <button onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
          <span className="material-symbols-outlined text-sm">chevron_right</span>
        </button>
      </div>
    </div>
  );
};

const SectionCard = ({ icon, title, headerExtra, children }) => (
  <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
    <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-[#002046] text-lg">{icon}</span>
        </div>
        <p className="text-sm font-black text-slate-900">{title}</p>
      </div>
      {headerExtra}
    </div>
    {children}
  </div>
);

const Spinner = () => (
  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/20 border-t-[#002046]" />
);

const paginate = (items, page) => items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  const activeItem = searchParams.get('tab') || 'overview';
  const requestedStatus = String(searchParams.get('status') || '').toUpperCase();
  const requestedOperatorId = String(searchParams.get('operatorId') || '').trim();
  const requestedBusId = String(searchParams.get('busId') || '').trim();

  const [operators, setOperators] = useState([]);
  const [buses, setBuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionLoadingLabel, setActionLoadingLabel] = useState('');

  const [operatorFilter, setOperatorFilter] = useState('ALL');
  const [busFilter, setBusFilter] = useState('ALL');
  const [showAllPendingBuses, setShowAllPendingBuses] = useState(false);
  const [showAllPendingOperators, setShowAllPendingOperators] = useState(false);

  const [operatorPage, setOperatorPage] = useState(0);
  const [busPage, setBusPage] = useState(0);
  const [userPage, setUserPage] = useState(0);

  const [selectedId, setSelectedId] = useState(null);
  const [viewMode, setViewMode] = useState('list');

  const [dismissedBusIds, setDismissedBusIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissedBusIds')) || []; } catch { return []; }
  });

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(ROUTES.LOGIN); return; }
    if (user.role !== 'ADMIN') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => {
    if (activeItem === 'operators' && OPERATOR_STATUS_FILTERS.includes(requestedStatus)) setOperatorFilter(requestedStatus);
    if (activeItem === 'buses' && BUS_STATUS_FILTERS.includes(requestedStatus)) setBusFilter(requestedStatus);
  }, [activeItem, requestedStatus]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    const fetchTabData = async () => {
      setDataLoading(true); setError(null);
      try {
        const needsOperators = activeItem === 'operators' || activeItem === 'overview';
        const needsBuses     = activeItem === 'buses'     || activeItem === 'overview';
        const needsUsers     = activeItem === 'users'     || activeItem === 'overview';

        const [operatorsData, busesData, usersData] = await Promise.all([
          needsOperators ? getOperators(operatorFilter === 'ALL' ? null : operatorFilter) : Promise.resolve(null),
          needsBuses     ? getBuses(busFilter === 'ALL' ? null : busFilter === 'ACTIVE')  : Promise.resolve(null),
          needsUsers     ? getUsers()                                                      : Promise.resolve(null),
        ]);

        if (operatorsData !== null) setOperators(Array.isArray(operatorsData) ? operatorsData : []);
        if (busesData     !== null) setBuses(Array.isArray(busesData)         ? busesData     : []);
        if (usersData     !== null) setUsers(Array.isArray(usersData)         ? usersData     : []);
      } catch (err) { setError(err.message); }
      finally { setDataLoading(false); }
    };
    fetchTabData();
  }, [activeItem, busFilter, operatorFilter, user]);

  useEffect(() => { setOperatorPage(0); setSelectedId(null); }, [operatorFilter]);
  useEffect(() => { setBusPage(0); setSelectedId(null); }, [busFilter]);
  useEffect(() => { setSelectedId(null); }, [activeItem]);

  const pendingOperators = useMemo(() => operators.filter(o => o.status === 'PENDING').reverse(), [operators]);
  const approvedOperators = useMemo(() => operators.filter(o => o.status === 'APPROVED'), [operators]);
  const inactiveBuses = useMemo(() => buses.filter(b => !b.active && !dismissedBusIds.includes(b.id)).reverse(), [buses, dismissedBusIds]);
  const allInactiveBuses = useMemo(() => buses.filter(b => !b.active), [buses]);

  const visibleOperators = useMemo(() => {
    if (!requestedOperatorId || activeItem !== 'operators') return operators;
    return operators.filter(o => String(o.id) === requestedOperatorId);
  }, [activeItem, operators, requestedOperatorId]);

  const visibleBuses = useMemo(() => {
    if (!requestedBusId || activeItem !== 'buses') return buses;
    return buses.filter(b => String(b.id) === requestedBusId);
  }, [activeItem, buses, requestedBusId]);

  const paginatedOperators = useMemo(() => paginate(visibleOperators, operatorPage), [operatorPage, visibleOperators]);
  const paginatedBuses = useMemo(() => paginate(visibleBuses, busPage), [busPage, visibleBuses]);
  const paginatedUsers = useMemo(() => paginate(users, userPage), [userPage, users]);

  const selectedOperator = selectedId && activeItem === 'operators' ? visibleOperators.find(o => String(o.id) === selectedId) : null;
  const selectedBus = selectedId && activeItem === 'buses' ? visibleBuses.find(b => String(b.id) === selectedId) : null;

  const refetchForActiveTab = async () => {
    if (activeItem === 'operators' || activeItem === 'overview') {
      const data = await getOperators(operatorFilter === 'ALL' ? null : operatorFilter);
      setOperators(Array.isArray(data) ? data : []);
    }
    if (activeItem === 'buses' || activeItem === 'overview') {
      const data = await getBuses(busFilter === 'ALL' ? null : busFilter === 'ACTIVE');
      setBuses(Array.isArray(data) ? data : []);
    }
    if (activeItem === 'users' || activeItem === 'overview') {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    }
  };

  const confirm = (message, action, busIdToRemove = null, actionId = null, successMsg = null, loadingLabel = 'Processing...') => {
    setModal({
      message,
      onConfirm: async () => {
        setModal(null); setActionLoadingId(actionId); setActionLoadingLabel(loadingLabel);
        try {
          await action();
          toast.success(successMsg || 'Done.');
          if (busIdToRemove) {
            setBuses(prev => prev.filter(b => b.id !== busIdToRemove));
            const updated = dismissedBusIds.filter(id => id !== busIdToRemove);
            setDismissedBusIds(updated);
            localStorage.setItem('dismissedBusIds', JSON.stringify(updated));
          } else { await refetchForActiveTab(); }
        } catch (err) { setError(err.message); toast.error(err.message || 'Action failed'); }
        finally { setActionLoadingId(null); setActionLoadingLabel(''); }
      },
    });
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#002046]/20 border-t-[#002046]" />
    </div>
  );

  const pageTitle = activeItem === 'overview' ? 'Overview' : activeItem.charAt(0).toUpperCase() + activeItem.slice(1);

  return (
    <AdminLayout activeItem={activeItem} title={pageTitle}>
      <div className="space-y-5">
        {dataLoading && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
          </div>
        )}
        {actionLoadingId && <CenterScreenLoader label={actionLoadingLabel || 'Processing...'} description="Please wait." />}

        {/* ── OVERVIEW ── */}
        {activeItem === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=operators`)} className="text-left transition-transform hover:scale-[1.02]">
                <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden h-full">
                  <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold opacity-60">Total Operators</p>
                      <p className="mt-2 text-3xl font-black">{dataLoading ? '…' : operators.length}</p>
                      <p className="mt-1 text-xs opacity-60">{dataLoading ? '…' : `${pendingOperators.length} pending`}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-white">business</span>
                    </div>
                  </div>
                </div>
              </button>
              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=buses`)} className="text-left transition-transform hover:scale-[1.02]">
                <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5 h-full">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Total Buses</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{dataLoading ? '…' : buses.length}</p>
                      <p className="mt-1 text-xs text-slate-400">{dataLoading ? '…' : `${allInactiveBuses.length} awaiting approval`}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#002046]/[0.07] flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[#002046]">directions_bus</span>
                    </div>
                  </div>
                </div>
              </button>
              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=users`)} className="text-left transition-transform hover:scale-[1.02]">
                <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-5 h-full">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-slate-500">Total Users</p>
                      <p className="mt-2 text-3xl font-black text-slate-900">{dataLoading ? '…' : users.length}</p>
                      <p className="mt-1 text-xs text-slate-400">Registered platform users</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-emerald-600">group</span>
                    </div>
                  </div>
                </div>
              </button>
              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=operators`)} className="text-left transition-transform hover:scale-[1.02]">
                <div className="rounded-2xl bg-gradient-to-br from-[#1e1b4b] via-[#3730a3] to-[#0f0c29] p-5 text-white shadow-sm relative overflow-hidden h-full">
                  <div className="absolute -top-2 -right-2 text-5xl opacity-10 select-none">★</div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold opacity-60">Approved Operators</p>
                      <p className="mt-2 text-3xl font-black">{dataLoading ? '…' : approvedOperators.length}</p>
                      <p className="mt-1 text-xs opacity-60">Active on platform</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-white">verified</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <SectionCard icon="business" title="Pending Operator Approvals"
                  headerExtra={pendingOperators.length > 5 ? (
                    <button onClick={() => setShowAllPendingOperators(p => !p)} className="flex items-center gap-1 text-xs font-semibold text-[#002046] hover:underline">
                      {showAllPendingOperators ? 'Show Less' : `View All (${pendingOperators.length})`}
                      <span className="material-symbols-outlined text-sm">{showAllPendingOperators ? 'expand_less' : 'expand_more'}</span>
                    </button>
                  ) : null}>
                  {dataLoading ? <div className="flex justify-center py-10"><Spinner /></div>
                    : pendingOperators.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <span className="material-symbols-outlined mb-3 text-4xl text-slate-200">check_circle</span>
                        <p className="font-semibold text-slate-500">No pending approvals</p>
                        <p className="mt-1 text-sm text-slate-400">All operators have been reviewed.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {(showAllPendingOperators ? pendingOperators : pendingOperators.slice(0, 5)).map(op => (
                          <div key={op.id} className="flex items-center justify-between px-5 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{op.name}</p>
                              <p className="text-xs text-slate-400">{op.contactEmail}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => confirm(`Approve "${op.name}"?`, () => approveOperator(op.id), null, `approve-op-${op.id}`, `Operator "${op.name}" approved.`, `Approving...`)} disabled={Boolean(actionLoadingId)} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-60 transition-colors">Approve</button>
                              <button onClick={() => confirm(`Reject "${op.name}"?`, () => rejectOperator(op.id), null, `reject-op-${op.id}`, `Operator "${op.name}" rejected.`, `Rejecting...`)} disabled={Boolean(actionLoadingId)} className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-100 disabled:opacity-60 transition-colors">Reject</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </SectionCard>

                <SectionCard icon="directions_bus" title="Pending Bus Approvals"
                  headerExtra={inactiveBuses.length > 5 ? (
                    <button onClick={() => setShowAllPendingBuses(p => !p)} className="flex items-center gap-1 text-xs font-semibold text-[#002046] hover:underline">
                      {showAllPendingBuses ? 'Show Less' : `View All (${inactiveBuses.length})`}
                      <span className="material-symbols-outlined text-sm">{showAllPendingBuses ? 'expand_less' : 'expand_more'}</span>
                    </button>
                  ) : null}>
                  {dataLoading ? <div className="flex justify-center py-10"><Spinner /></div>
                    : inactiveBuses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                        <span className="material-symbols-outlined mb-3 text-4xl text-slate-200">check_circle</span>
                        <p className="font-semibold text-slate-500">No pending bus approvals</p>
                        <p className="mt-1 text-sm text-slate-400">All buses have been reviewed.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {(showAllPendingBuses ? inactiveBuses : inactiveBuses.slice(0, 5)).map(bus => (
                          <div key={bus.id} className="flex items-center justify-between px-5 py-4">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{bus.name}</p>
                              <p className="text-xs text-slate-400">{bus.busType} · {bus.totalSeats} seats · {bus.vehicleNumber || 'No plate'}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => confirm(`Approve bus "${bus.name}"?`, () => approveBus(bus.id), bus.id, `approve-bus-${bus.id}`, `Bus "${bus.name}" approved.`, `Approving...`)} disabled={Boolean(actionLoadingId)} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:opacity-60 transition-colors">Approve</button>
                              <button onClick={() => { const u = [...dismissedBusIds, bus.id]; setDismissedBusIds(u); localStorage.setItem('dismissedBusIds', JSON.stringify(u)); }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                                <span className="material-symbols-outlined text-base">close</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </SectionCard>
              </div>

              <SectionCard icon="bar_chart" title="Platform Stats">
                <div className="px-5 py-4 space-y-4">
                  {dataLoading ? <div className="flex justify-center py-8"><Spinner /></div> : (
                    <>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Operator status</p>
                      {[
                        { label: 'Approved', value: approvedOperators.length, total: operators.length, bar: 'bg-emerald-500', text: 'text-emerald-600' },
                        { label: 'Pending', value: pendingOperators.length, total: operators.length, bar: 'bg-amber-400', text: 'text-amber-600' },
                        { label: 'Rejected', value: operators.filter(o => o.status === 'REJECTED').length, total: operators.length, bar: 'bg-red-500', text: 'text-red-600' },
                        { label: 'Suspended', value: operators.filter(o => o.status === 'SUSPENDED').length, total: operators.length, bar: 'bg-orange-400', text: 'text-orange-600' },
                        { label: 'Active Buses', value: buses.filter(b => b.active).length, total: buses.length, bar: 'bg-[#002046]', text: 'text-[#002046]' },
                        { label: 'Inactive Buses', value: allInactiveBuses.length, total: buses.length, bar: 'bg-slate-400', text: 'text-slate-500' },
                      ].map(stat => (
                        <div key={stat.label}>
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-sm text-slate-600">{stat.label}</span>
                            <span className={`text-sm font-bold ${stat.text}`}>{stat.value}{stat.total ? ` / ${stat.total}` : ''}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                            <div className={`${stat.bar} h-full rounded-full transition-all`} style={{ width: stat.total ? `${(stat.value / stat.total) * 100}%` : '0%' }} />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </SectionCard>
            </div>
          </>
        )}

        {/* ── OPERATORS TAB ── */}
        {activeItem === 'operators' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">Operators</h1>
                <p className="hidden sm:block text-sm text-slate-500 mt-0.5">Review, approve, reject, or suspend operator accounts</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm flex-wrap">
                {OPERATOR_STATUS_FILTERS.map(f => (
                  <button key={f} type="button" onClick={() => setOperatorFilter(f)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${operatorFilter === f ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <ViewToggle viewMode={viewMode} onChange={m => { setViewMode(m); setSelectedId(null); }} />
            </div>

            {requestedOperatorId && (
              <div className="flex items-center gap-2 rounded-xl bg-sky-50 ring-1 ring-sky-200 px-4 py-3 text-sm text-sky-700">
                <span className="material-symbols-outlined text-base">notifications</span>
                Opened from a notification — showing the relevant operator below.
              </div>
            )}
            {error && <div className="rounded-xl bg-red-50 ring-1 ring-red-200 p-4 text-sm text-red-600">{error}</div>}

            {/* Action bar */}
            {selectedOperator && (
              <div className="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3 shadow-sm flex-wrap">
                <span className="text-sm font-bold text-slate-900 mr-1">{selectedOperator.name}</span>
                <StatusBadge status={selectedOperator.status} />
                <span className="flex-1" />
                {selectedOperator.status === 'PENDING' && (
                  <>
                    <button onClick={() => { setSelectedId(null); confirm(`Approve "${selectedOperator.name}"?`, () => approveOperator(selectedOperator.id), null, `approve-op-${selectedOperator.id}`, `Operator "${selectedOperator.name}" approved.`, `Approving...`); }} disabled={Boolean(actionLoadingId)} className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-4 py-2 text-sm font-semibold hover:bg-emerald-100 disabled:opacity-60 transition-colors">
                      <span className="material-symbols-outlined text-base">check_circle</span> Approve
                    </button>
                    <button onClick={() => { setSelectedId(null); confirm(`Reject "${selectedOperator.name}"?`, () => rejectOperator(selectedOperator.id), null, `reject-op-${selectedOperator.id}`, `Operator "${selectedOperator.name}" rejected.`, `Rejecting...`); }} disabled={Boolean(actionLoadingId)} className="flex items-center gap-1.5 rounded-xl bg-red-50 text-red-600 ring-1 ring-red-200 px-4 py-2 text-sm font-semibold hover:bg-red-100 disabled:opacity-60 transition-colors">
                      <span className="material-symbols-outlined text-base">cancel</span> Reject
                    </button>
                  </>
                )}
                {selectedOperator.status === 'APPROVED' && (
                  <button onClick={() => { setSelectedId(null); confirm(`Suspend "${selectedOperator.name}"?`, () => suspendOperator(selectedOperator.id), null, `suspend-op-${selectedOperator.id}`, `Operator suspended.`, `Suspending...`); }} disabled={Boolean(actionLoadingId)} className="flex items-center gap-1.5 rounded-xl bg-orange-50 text-orange-700 ring-1 ring-orange-200 px-4 py-2 text-sm font-semibold hover:bg-orange-100 disabled:opacity-60 transition-colors">
                    <span className="material-symbols-outlined text-base">block</span> Suspend
                  </button>
                )}
                {(selectedOperator.status === 'REJECTED' || selectedOperator.status === 'SUSPENDED') && (
                  <button onClick={() => { setSelectedId(null); confirm(`Re-approve "${selectedOperator.name}"?`, () => approveOperator(selectedOperator.id), null, `reapprove-op-${selectedOperator.id}`, `Operator re-approved.`, `Re-approving...`); }} disabled={Boolean(actionLoadingId)} className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-4 py-2 text-sm font-semibold hover:bg-emerald-100 disabled:opacity-60 transition-colors">
                    <span className="material-symbols-outlined text-base">restart_alt</span> Re-approve
                  </button>
                )}
                <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors">
                  <span className="material-symbols-outlined text-sm text-slate-500">close</span>
                </button>
              </div>
            )}

            {/* Main card */}
            <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
              {dataLoading ? (
                <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-500"><Spinner /> Loading operators...</div>
              ) : visibleOperators.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-300">business</span>
                  <p className="mt-3 text-sm text-slate-500">{requestedOperatorId ? 'No matching operator found.' : 'No operators found for this filter.'}</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedOperators.map(op => {
                    const isSel = selectedId === String(op.id);
                    return (
                      <div key={op.id} onClick={() => setSelectedId(p => p === String(op.id) ? null : String(op.id))}
                        className={`rounded-xl ring-1 p-4 cursor-pointer hover:shadow-md transition-all ${isSel ? 'bg-slate-50 ring-[#002046]/40 shadow-sm' : 'bg-white ring-slate-200'}`}>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 truncate">{op.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{op.shortName || '—'}</p>
                          </div>
                          <StatusBadge status={op.status} />
                        </div>
                        <div className="space-y-1.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-slate-300 text-sm">mail</span><span className="truncate">{op.contactEmail}</span></div>
                          <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-slate-300 text-sm">phone</span><span>{op.contactPhone || '—'}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="pl-5 pr-2 py-3.5 w-10" />
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Operator</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Phone</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedOperators.map(op => {
                        const isSel = selectedId === String(op.id);
                        return (
                          <tr key={op.id} className={`transition-colors ${isSel ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                            <td className="pl-5 pr-2 py-4">
                              <div onClick={() => setSelectedId(p => p === String(op.id) ? null : String(op.id))}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${isSel ? 'bg-[#002046] border-[#002046]' : 'bg-white border-slate-300 hover:border-[#002046]/50'}`}>
                                {isSel && <span className="material-symbols-outlined text-white" style={{ fontSize: '12px' }}>check</span>}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-slate-900">{op.name}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{op.shortName || '—'}</p>
                            </td>
                            <td className="px-5 py-4 hidden sm:table-cell"><span className="text-sm text-slate-600">{op.contactEmail}</span></td>
                            <td className="px-5 py-4 hidden md:table-cell"><span className="text-sm text-slate-500">{op.contactPhone || '—'}</span></td>
                            <td className="px-5 py-4"><StatusBadge status={op.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <InlinePagination page={operatorPage} total={visibleOperators.length} onPageChange={setOperatorPage} />
            </div>
          </div>
        )}

        {/* ── BUSES TAB ── */}
        {activeItem === 'buses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">Buses</h1>
                <p className="hidden sm:block text-sm text-slate-500 mt-0.5">Approve and manage buses registered on the platform</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm">
                {BUS_STATUS_FILTERS.map(f => (
                  <button key={f} type="button" onClick={() => setBusFilter(f)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all whitespace-nowrap ${busFilter === f ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <ViewToggle viewMode={viewMode} onChange={m => { setViewMode(m); setSelectedId(null); }} />
            </div>

            {requestedBusId && (
              <div className="flex items-center gap-2 rounded-xl bg-sky-50 ring-1 ring-sky-200 px-4 py-3 text-sm text-sky-700">
                <span className="material-symbols-outlined text-base">notifications</span>
                Opened from a notification — showing the relevant bus below.
              </div>
            )}
            {error && <div className="rounded-xl bg-red-50 ring-1 ring-red-200 p-4 text-sm text-red-600">{error}</div>}

            {/* Action bar */}
            {selectedBus && (
              <div className="flex items-center gap-2 bg-white ring-1 ring-slate-200 rounded-2xl px-4 py-3 shadow-sm flex-wrap">
                <span className="text-sm font-bold text-slate-900 mr-1">{selectedBus.name}</span>
                <span className={`rounded-lg px-2 py-1 text-xs font-bold ${selectedBus.active ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'}`}>{selectedBus.active ? 'Active' : 'Pending'}</span>
                <span className="flex-1" />
                {!selectedBus.active && (
                  <button onClick={() => { setSelectedId(null); confirm(`Approve bus "${selectedBus.name}"?`, () => approveBus(selectedBus.id), selectedBus.id, `approve-bus-${selectedBus.id}`, `Bus approved.`, `Approving...`); }} disabled={Boolean(actionLoadingId)} className="flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-4 py-2 text-sm font-semibold hover:bg-emerald-100 disabled:opacity-60 transition-colors">
                    <span className="material-symbols-outlined text-base">check_circle</span> Approve
                  </button>
                )}
                <button onClick={() => setSelectedId(null)} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center flex-shrink-0 transition-colors">
                  <span className="material-symbols-outlined text-sm text-slate-500">close</span>
                </button>
              </div>
            )}

            <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
              {dataLoading ? (
                <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-500"><Spinner /> Loading buses...</div>
              ) : visibleBuses.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-300">directions_bus</span>
                  <p className="mt-3 text-sm text-slate-500">{requestedBusId ? 'No matching bus found.' : 'No buses found for this filter.'}</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedBuses.map(bus => {
                    const isSel = selectedId === String(bus.id);
                    return (
                      <div key={bus.id} onClick={() => setSelectedId(p => p === String(bus.id) ? null : String(bus.id))}
                        className={`rounded-xl ring-1 p-4 cursor-pointer hover:shadow-md transition-all ${isSel ? 'bg-slate-50 ring-[#002046]/40 shadow-sm' : 'bg-white ring-slate-200'}`}>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-slate-900 truncate">{bus.name}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{bus.busCode || '—'}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${bus.active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{bus.active ? 'Active' : 'Pending'}</span>
                        </div>
                        <div className="space-y-1.5 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-slate-300 text-sm">tag</span><span className="truncate">{bus.vehicleNumber || '—'}</span></div>
                          <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-slate-300 text-sm">category</span><span>{(bus.busType || '—').replace(/_/g, ' ')} · {bus.totalSeats}s</span></div>
                          <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-slate-300 text-sm">badge</span><span className="truncate">{bus.operatorName || bus.operator?.name || '—'}</span></div>
                        </div>
                        {bus.amenities?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-3">
                            {bus.amenities.slice(0, 3).map(a => <span key={a.id || a.code} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{a.code || a}</span>)}
                            {bus.amenities.length > 3 && <span className="text-[10px] text-slate-400">+{bus.amenities.length - 3}</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="pl-5 pr-2 py-3.5 w-10" />
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Bus</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Type / Seats</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Vehicle No</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Operator</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedBuses.map(bus => {
                        const isSel = selectedId === String(bus.id);
                        return (
                          <tr key={bus.id} className={`transition-colors ${isSel ? 'bg-slate-50' : 'hover:bg-slate-50/70'}`}>
                            <td className="pl-5 pr-2 py-4">
                              <div onClick={() => setSelectedId(p => p === String(bus.id) ? null : String(bus.id))}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${isSel ? 'bg-[#002046] border-[#002046]' : 'bg-white border-slate-300 hover:border-[#002046]/50'}`}>
                                {isSel && <span className="material-symbols-outlined text-white" style={{ fontSize: '12px' }}>check</span>}
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-slate-900">{bus.name}</p>
                              <p className="sm:hidden text-xs text-slate-400 mt-0.5 truncate">{bus.vehicleNumber} · {(bus.busType || '').replace(/_/g, ' ')}</p>
                              <p className="hidden sm:block text-xs text-slate-400 mt-0.5">{bus.busCode || '—'}</p>
                            </td>
                            <td className="px-5 py-4 hidden sm:table-cell"><span className="text-sm text-slate-600">{(bus.busType || '—').replace(/_/g, ' ')} · {bus.totalSeats}s</span></td>
                            <td className="px-5 py-4 hidden md:table-cell"><span className="text-sm text-slate-500 font-mono">{bus.vehicleNumber || '—'}</span></td>
                            <td className="px-5 py-4 hidden lg:table-cell"><span className="text-sm text-slate-500">{bus.operatorName || bus.operator?.name || '—'}</span></td>
                            <td className="px-5 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${bus.active ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${bus.active ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                {bus.active ? 'Active' : 'Pending'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <InlinePagination page={busPage} total={visibleBuses.length} onPageChange={setBusPage} />
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {activeItem === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">Users</h1>
                <p className="hidden sm:block text-sm text-slate-500 mt-0.5">All registered users on the platform</p>
              </div>
              <ViewToggle viewMode={viewMode} onChange={m => { setViewMode(m); setSelectedId(null); }} />
            </div>

            {error && <div className="rounded-xl bg-red-50 ring-1 ring-red-200 p-4 text-sm text-red-600">{error}</div>}

            <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
              {dataLoading ? (
                <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-500"><Spinner /> Loading users...</div>
              ) : users.length === 0 ? (
                <div className="p-12 text-center">
                  <span className="material-symbols-outlined text-5xl text-slate-300">group</span>
                  <p className="mt-3 text-sm text-slate-500">No users found.</p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="p-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {paginatedUsers.map(u => (
                    <div key={u.id} className="rounded-xl ring-1 ring-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 truncate">{`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unnamed user'}</p>
                          <span className="rounded-lg bg-[#002046]/[0.08] px-2 py-0.5 text-[10px] font-bold text-[#002046]">{u.roles?.[0]?.replace('ROLE_', '') || 'USER'}</span>
                        </div>
                        <span className={`text-xs font-bold flex-shrink-0 ${u.emailVerified ? 'text-emerald-600' : 'text-red-500'}`}>{u.emailVerified ? 'Verified' : 'Unverified'}</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-slate-300 text-sm">mail</span><span className="truncate">{u.email || '—'}</span></div>
                        <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-slate-300 text-sm">phone</span><span>{u.phone || '—'}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/80">
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">User</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden sm:table-cell">Email</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Phone</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                        <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Verified</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-slate-900">{`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unnamed user'}</p>
                            <p className="sm:hidden text-xs text-slate-400 mt-0.5 truncate">{u.email}</p>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell"><span className="text-sm text-slate-600">{u.email || '—'}</span></td>
                          <td className="px-5 py-4 hidden lg:table-cell"><span className="text-sm text-slate-500">{u.phone || '—'}</span></td>
                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-[#002046]/[0.08] px-2 py-1 text-xs font-bold text-[#002046]">{u.roles?.[0]?.replace('ROLE_', '') || 'USER'}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`text-sm font-bold ${u.emailVerified ? 'text-emerald-600' : 'text-red-500'}`}>{u.emailVerified ? 'Verified' : 'Unverified'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <InlinePagination page={userPage} total={users.length} onPageChange={setUserPage} />
            </div>
          </div>
        )}
      </div>

      {modal && <ConfirmModal message={modal.message} onConfirm={modal.onConfirm} onCancel={() => setModal(null)} />}
    </AdminLayout>
  );
};

export default AdminDashboard;
