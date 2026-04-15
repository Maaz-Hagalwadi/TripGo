import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';
import AdminLayout from '../shared/components/AdminLayout';
import PaginationControls from '../shared/components/ui/PaginationControls';
import CenterScreenLoader from '../shared/components/ui/CenterScreenLoader';
import {
  getOperators, approveOperator, rejectOperator, suspendOperator,
  getBuses, approveBus, getUsers
} from '../api/adminService';

const GRID_PAGE_SIZE = 9;
const OPERATOR_STATUS_FILTERS = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
const BUS_STATUS_FILTERS = ['ALL', 'ACTIVE', 'INACTIVE'];

const StatusBadge = ({ status }) => {
  const colors = {
    PENDING: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    APPROVED: 'bg-green-500/10 text-green-500 border-green-500/20',
    REJECTED: 'bg-red-500/10 text-red-500 border-red-500/20',
    SUSPENDED: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    ACTIVE: 'bg-green-500/10 text-green-500 border-green-500/20',
    INACTIVE: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  return (
    <span className={`inline-flex rounded-lg border px-2 py-1 text-xs font-bold ${colors[status] || colors.INACTIVE}`}>
      {status}
    </span>
  );
};

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
    <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-op-card">
      <p className="mb-6 text-center font-semibold">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2.5 font-semibold text-slate-600 transition-all hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
          Cancel
        </button>
        <button onClick={onConfirm} className="flex-1 rounded-xl bg-primary py-2.5 font-bold text-black transition-all hover:bg-primary/90">
          Confirm
        </button>
      </div>
    </div>
  </div>
);

const ViewToggle = ({ viewMode, onChange }) => (
  <div className="inline-flex rounded-2xl bg-slate-100 p-1 dark:bg-white/5">
    {['grid', 'list'].map((mode) => (
      <button
        key={mode}
        type="button"
        onClick={() => onChange(mode)}
        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${viewMode === mode ? 'bg-white text-slate-900 shadow-sm dark:bg-black/40 dark:text-white' : 'text-slate-500 dark:text-slate-300'}`}
      >
        {mode === 'grid' ? 'Grid' : 'List'}
      </button>
    ))}
  </div>
);

const paginate = (items, page, pageSize = GRID_PAGE_SIZE) => items.slice(page * pageSize, (page + 1) * pageSize);

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
  const [operatorViewMode, setOperatorViewMode] = useState('grid');
  const [busViewMode, setBusViewMode] = useState('grid');
  const [userViewMode, setUserViewMode] = useState('grid');
  const [operatorPage, setOperatorPage] = useState(0);
  const [busPage, setBusPage] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [dismissedBusIds, setDismissedBusIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('dismissedBusIds')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate(ROUTES.LOGIN);
      return;
    }
    if (user.role !== 'ADMIN') {
      navigate(ROUTES.HOME);
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (activeItem === 'operators' && OPERATOR_STATUS_FILTERS.includes(requestedStatus)) {
      setOperatorFilter(requestedStatus);
    }
    if (activeItem === 'buses' && BUS_STATUS_FILTERS.includes(requestedStatus)) {
      setBusFilter(requestedStatus);
    }
  }, [activeItem, requestedStatus]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    const fetchTabData = async () => {
      setDataLoading(true);
      setError(null);
      try {
        if (activeItem === 'operators' || activeItem === 'overview') {
          const data = await getOperators(operatorFilter === 'ALL' ? null : operatorFilter);
          setOperators(Array.isArray(data) ? data : []);
        }
        if (activeItem === 'buses' || activeItem === 'overview') {
          const active = busFilter === 'ALL' ? null : busFilter === 'ACTIVE';
          const data = await getBuses(active);
          setBuses(Array.isArray(data) ? data : []);
        }
        if (activeItem === 'users' || activeItem === 'overview') {
          const data = await getUsers();
          setUsers(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setDataLoading(false);
      }
    };

    fetchTabData();
  }, [activeItem, busFilter, operatorFilter, user]);

  useEffect(() => { setOperatorPage(0); }, [operatorFilter]);
  useEffect(() => { setBusPage(0); }, [busFilter]);

  const pendingOperators = useMemo(() => operators.filter((o) => o.status === 'PENDING').reverse(), [operators]);
  const approvedOperators = useMemo(() => operators.filter((o) => o.status === 'APPROVED'), [operators]);
  const inactiveBuses = useMemo(() => buses.filter((b) => !b.active && !dismissedBusIds.includes(b.id)).reverse(), [buses, dismissedBusIds]);
  const allInactiveBuses = useMemo(() => buses.filter((b) => !b.active), [buses]);

  const visibleOperators = useMemo(() => {
    if (!requestedOperatorId || activeItem !== 'operators') return operators;
    return operators.filter((operator) => String(operator.id) === requestedOperatorId);
  }, [activeItem, operators, requestedOperatorId]);

  const visibleBuses = useMemo(() => {
    if (!requestedBusId || activeItem !== 'buses') return buses;
    return buses.filter((bus) => String(bus.id) === requestedBusId);
  }, [activeItem, buses, requestedBusId]);

  const paginatedOperators = useMemo(() => paginate(visibleOperators, operatorPage), [operatorPage, visibleOperators]);
  const paginatedBuses = useMemo(() => paginate(visibleBuses, busPage), [busPage, visibleBuses]);
  const paginatedUsers = useMemo(() => paginate(users, userPage), [userPage, users]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(visibleOperators.length / GRID_PAGE_SIZE) - 1, 0);
    if (operatorPage > maxPage) setOperatorPage(maxPage);
  }, [operatorPage, visibleOperators.length]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(visibleBuses.length / GRID_PAGE_SIZE) - 1, 0);
    if (busPage > maxPage) setBusPage(maxPage);
  }, [busPage, visibleBuses.length]);

  useEffect(() => {
    const maxPage = Math.max(Math.ceil(users.length / GRID_PAGE_SIZE) - 1, 0);
    if (userPage > maxPage) setUserPage(maxPage);
  }, [userPage, users.length]);

  const refetchForActiveTab = async () => {
    if (activeItem === 'operators' || activeItem === 'overview') {
      const data = await getOperators(operatorFilter === 'ALL' ? null : operatorFilter);
      setOperators(Array.isArray(data) ? data : []);
    }
    if (activeItem === 'buses' || activeItem === 'overview') {
      const active = busFilter === 'ALL' ? null : busFilter === 'ACTIVE';
      const data = await getBuses(active);
      setBuses(Array.isArray(data) ? data : []);
    }
    if (activeItem === 'users' || activeItem === 'overview') {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    }
  };

  const confirm = (message, action, busIdToRemove = null, actionId = null, successMsg = null, loadingLabel = 'Processing your request...') => {
    setModal({
      message,
      onConfirm: async () => {
        setModal(null);
        setActionLoadingId(actionId);
        setActionLoadingLabel(loadingLabel);
        try {
          await action();
          toast.success(successMsg || 'Action completed successfully.');
          if (busIdToRemove) {
            setBuses((prev) => prev.filter((b) => b.id !== busIdToRemove));
            const updated = dismissedBusIds.filter((id) => id !== busIdToRemove);
            setDismissedBusIds(updated);
            localStorage.setItem('dismissedBusIds', JSON.stringify(updated));
          } else {
            await refetchForActiveTab();
          }
        } catch (err) {
          setError(err.message);
          toast.error(err.message || 'Action failed');
        } finally {
          setActionLoadingId(null);
          setActionLoadingLabel('');
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-op-bg">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  const pageTitle = activeItem === 'overview' ? 'Overview' : activeItem.charAt(0).toUpperCase() + activeItem.slice(1);

  return (
    <AdminLayout activeItem={activeItem} title={pageTitle}>
      <div className="space-y-8">
        {dataLoading && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
          </div>
        )}
        {actionLoadingId ? (
          <CenterScreenLoader
            label={actionLoadingLabel || 'Processing your request...'}
            description="Please wait while we update the admin dashboard."
          />
        ) : null}

        {activeItem === 'overview' && (
          <>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=operators`)} className="flex items-start justify-between rounded-xl border border-purple-100 dark:border-purple-900/50 border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-950/30 p-6 text-left transition-all hover:shadow-md">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Operators</p>
                  <h3 className="mt-2 text-3xl font-bold text-purple-700 dark:text-purple-300">{dataLoading ? '...' : operators.length}</h3>
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                    <span className="material-symbols-outlined text-xs">info</span>
                    {dataLoading ? '...' : `${pendingOperators.length} pending`}
                  </p>
                </div>
                <div className="rounded-lg bg-purple-500/10 p-3 text-purple-500">
                  <span className="material-symbols-outlined">business</span>
                </div>
              </button>

              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=buses`)} className="flex items-start justify-between rounded-xl border border-blue-100 dark:border-blue-900/50 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-950/30 p-6 text-left transition-all hover:shadow-md">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Buses</p>
                  <h3 className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-300">{dataLoading ? '...' : buses.length}</h3>
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                    <span className="material-symbols-outlined text-xs">info</span>
                    {dataLoading ? '...' : `${allInactiveBuses.length} pending approval`}
                  </p>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-3 text-blue-500">
                  <span className="material-symbols-outlined">directions_bus</span>
                </div>
              </button>

              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=users`)} className="flex items-start justify-between rounded-xl border border-orange-100 dark:border-orange-900/50 border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-950/30 p-6 text-left transition-all hover:shadow-md">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p>
                  <h3 className="mt-2 text-3xl font-bold text-orange-700 dark:text-orange-300">{dataLoading ? '...' : users.length}</h3>
                  <p className="mt-2 text-xs text-slate-400">Registered users</p>
                </div>
                <div className="rounded-lg bg-orange-500/10 p-3 text-orange-500">
                  <span className="material-symbols-outlined">group</span>
                </div>
              </button>

              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=operators`)} className="relative flex items-start justify-between overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 p-6 text-left">
                <div className="relative z-10">
                  <p className="text-sm font-medium text-white/80">Approved Operators</p>
                  <h3 className="mt-2 text-3xl font-bold text-white">{dataLoading ? '...' : approvedOperators.length}</h3>
                  <p className="mt-2 text-xs text-white/60">Active on platform</p>
                </div>
                <div className="relative z-10 rounded-lg bg-white/20 p-3 text-white">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
              <div className="space-y-8 xl:col-span-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight">Pending Operator Approvals</h3>
                    {pendingOperators.length > 5 && (
                      <button onClick={() => setShowAllPendingOperators((p) => !p)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        {showAllPendingOperators ? 'Show Less' : `View All (${pendingOperators.length})`}
                        <span className="material-symbols-outlined text-sm">{showAllPendingOperators ? 'expand_less' : 'expand_more'}</span>
                      </button>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-op-card">
                    {dataLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                      </div>
                    ) : pendingOperators.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <span className="material-symbols-outlined mb-3 text-5xl text-slate-300 dark:text-slate-700">check_circle</span>
                        <p className="font-medium text-slate-500">No pending approvals</p>
                        <p className="mt-1 text-sm text-slate-400">All operators have been reviewed.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(showAllPendingOperators ? pendingOperators : pendingOperators.slice(0, 5)).map((op) => (
                          <div key={op.id} className="flex items-center justify-between px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold">{op.name}</p>
                              <p className="text-xs text-slate-400">{op.contactEmail}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => confirm(`Approve "${op.name}"?`, () => approveOperator(op.id), null, `approve-op-${op.id}`, `Operator "${op.name}" has been approved.`, `Approving operator ${op.name}...`)} disabled={Boolean(actionLoadingId)} className="flex items-center gap-1 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-bold text-green-500 transition-all disabled:opacity-60 hover:bg-green-500/20">
                                Approve
                              </button>
                              <button onClick={() => confirm(`Reject "${op.name}"?`, () => rejectOperator(op.id), null, `reject-op-${op.id}`, `Operator "${op.name}" has been rejected.`, `Rejecting operator ${op.name}...`)} disabled={Boolean(actionLoadingId)} className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-500 transition-all disabled:opacity-60 hover:bg-red-500/20">
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold tracking-tight">Pending Bus Approvals</h3>
                    {inactiveBuses.length > 5 && (
                      <button onClick={() => setShowAllPendingBuses((p) => !p)} className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                        {showAllPendingBuses ? 'Show Less' : `View All (${inactiveBuses.length})`}
                        <span className="material-symbols-outlined text-sm">{showAllPendingBuses ? 'expand_less' : 'expand_more'}</span>
                      </button>
                    )}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-op-card">
                    {dataLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
                      </div>
                    ) : inactiveBuses.length === 0 ? (
                      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                        <span className="material-symbols-outlined mb-3 text-5xl text-slate-300 dark:text-slate-700">check_circle</span>
                        <p className="font-medium text-slate-500">No pending bus approvals</p>
                        <p className="mt-1 text-sm text-slate-400">All buses have been reviewed.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(showAllPendingBuses ? inactiveBuses : inactiveBuses.slice(0, 5)).map((bus) => (
                          <div key={bus.id} className="flex items-center justify-between px-6 py-4">
                            <div>
                              <p className="text-sm font-semibold">{bus.name}</p>
                              <p className="text-xs text-slate-400">{bus.busType} · {bus.totalSeats} seats · {bus.vehicleNumber || 'No plate'}</p>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => confirm(`Approve bus "${bus.name}"?`, () => approveBus(bus.id), bus.id, `approve-bus-${bus.id}`, `Bus "${bus.name}" has been approved.`, `Approving bus ${bus.name}...`)} disabled={Boolean(actionLoadingId)} className="flex items-center gap-1 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-xs font-bold text-green-500 transition-all disabled:opacity-60 hover:bg-green-500/20">
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  const updated = [...dismissedBusIds, bus.id];
                                  setDismissedBusIds(updated);
                                  localStorage.setItem('dismissedBusIds', JSON.stringify(updated));
                                }}
                                className="rounded-lg p-1.5 text-slate-400 transition-all hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                              >
                                <span className="material-symbols-outlined text-base">close</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold tracking-tight">Platform Stats</h3>
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-op-card">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Operator Status</h4>
                  {dataLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {[
                        { label: 'Approved', value: approvedOperators.length, total: operators.length, color: 'bg-green-500', textColor: 'text-green-500' },
                        { label: 'Pending', value: pendingOperators.length, total: operators.length, color: 'bg-yellow-500', textColor: 'text-yellow-500' },
                        { label: 'Rejected', value: operators.filter((o) => o.status === 'REJECTED').length, total: operators.length, color: 'bg-red-500', textColor: 'text-red-500' },
                        { label: 'Suspended', value: operators.filter((o) => o.status === 'SUSPENDED').length, total: operators.length, color: 'bg-orange-500', textColor: 'text-orange-500' },
                        { label: 'Active Buses', value: buses.filter((b) => b.active).length, total: buses.length, color: 'bg-primary', textColor: 'text-primary' },
                        { label: 'Inactive Buses', value: allInactiveBuses.length, total: buses.length, color: 'bg-slate-400', textColor: 'text-slate-400' },
                      ].map((stat) => (
                        <div key={stat.label}>
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-sm">{stat.label}</span>
                            <span className={`text-sm font-bold ${stat.textColor}`}>{stat.value}{stat.label === 'Inactive Buses' ? '' : ` / ${stat.total}`}</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className={`${stat.color} h-full transition-all`} style={{ width: stat.total ? `${(stat.value / stat.total) * 100}%` : '0%' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeItem === 'operators' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold tracking-tight">All Operators</h3>
              <div className="flex flex-wrap items-center gap-2">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setOperatorFilter(filter)}
                    className={`rounded-lg border px-4 py-1.5 text-xs font-bold transition-all ${operatorFilter === filter ? 'border-primary/30 bg-primary/10 text-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}
                  >
                    {filter}
                  </button>
                ))}
                <ViewToggle viewMode={operatorViewMode} onChange={setOperatorViewMode} />
              </div>
            </div>

            {requestedOperatorId ? (
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
                <span className="material-symbols-outlined text-base">notifications</span>
                Opened from a notification — showing the relevant operator below.
              </div>
            ) : null}

            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}

            {dataLoading ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-op-card">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : visibleOperators.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400 dark:border-slate-800 dark:bg-op-card">
                {requestedOperatorId ? 'No matching operator found' : 'No operators found'}
              </div>
            ) : (
              <>
                <div className={operatorViewMode === 'grid' ? 'grid gap-4 xl:grid-cols-3' : 'space-y-3'}>
                  {paginatedOperators.map((op) => (
                    <div key={op.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-op-card">
                      <div className={`flex gap-4 ${operatorViewMode === 'grid' ? 'h-full flex-col' : 'flex-col lg:flex-row lg:items-start lg:justify-between'}`}>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">{op.name}</h4>
                            <StatusBadge status={op.status} />
                          </div>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{op.shortName || 'No short name added'}</p>
                          <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
                            <p><span className="font-semibold text-slate-900 dark:text-white">Email:</span> {op.contactEmail}</p>
                            <p><span className="font-semibold text-slate-900 dark:text-white">Phone:</span> {op.contactPhone || '—'}</p>
                          </div>
                        </div>
                        <div className={`flex flex-wrap gap-2 ${operatorViewMode === 'grid' ? 'mt-auto border-t border-slate-200 pt-4 dark:border-slate-800' : 'lg:min-w-[240px] lg:justify-end'}`}>
                          {op.status === 'PENDING' && (
                            <>
                              <button onClick={() => confirm(`Approve "${op.name}"?`, () => approveOperator(op.id), null, `approve-op-${op.id}`, `Operator "${op.name}" has been approved.`, `Approving operator ${op.name}...`)} disabled={Boolean(actionLoadingId)} className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-500 hover:bg-green-500/20 disabled:opacity-60">
                                Approve
                              </button>
                              <button onClick={() => confirm(`Reject "${op.name}"?`, () => rejectOperator(op.id), null, `reject-op-${op.id}`, `Operator "${op.name}" has been rejected.`, `Rejecting operator ${op.name}...`)} disabled={Boolean(actionLoadingId)} className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500/20 disabled:opacity-60">
                                Reject
                              </button>
                            </>
                          )}
                          {op.status === 'APPROVED' && (
                            <button onClick={() => confirm(`Suspend "${op.name}"?`, () => suspendOperator(op.id), null, `suspend-op-${op.id}`, `Operator "${op.name}" has been suspended.`, `Suspending operator ${op.name}...`)} disabled={Boolean(actionLoadingId)} className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-500 hover:bg-orange-500/20 disabled:opacity-60">
                              Suspend
                            </button>
                          )}
                          {(op.status === 'REJECTED' || op.status === 'SUSPENDED') && (
                            <button onClick={() => confirm(`Re-approve "${op.name}"?`, () => approveOperator(op.id), null, `reapprove-op-${op.id}`, `Operator "${op.name}" has been re-approved.`, `Re-approving operator ${op.name}...`)} disabled={Boolean(actionLoadingId)} className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-500 hover:bg-green-500/20 disabled:opacity-60">
                              Re-approve
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls page={operatorPage} pageSize={GRID_PAGE_SIZE} totalItems={visibleOperators.length} onPageChange={setOperatorPage} itemLabel="operators" />
              </>
            )}
          </div>
        )}

        {activeItem === 'buses' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold tracking-tight">All Buses</h3>
              <div className="flex flex-wrap items-center gap-2">
                {['ALL', 'ACTIVE', 'INACTIVE'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setBusFilter(filter)}
                    className={`rounded-lg border px-4 py-1.5 text-xs font-bold transition-all ${busFilter === filter ? 'border-primary/30 bg-primary/10 text-primary' : 'border-slate-200 text-slate-500 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'}`}
                  >
                    {filter}
                  </button>
                ))}
                <ViewToggle viewMode={busViewMode} onChange={setBusViewMode} />
              </div>
            </div>

            {requestedBusId ? (
              <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-300">
                <span className="material-symbols-outlined text-base">notifications</span>
                Opened from a notification — showing the relevant bus below.
              </div>
            ) : null}

            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}

            {dataLoading ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-op-card">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : visibleBuses.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400 dark:border-slate-800 dark:bg-op-card">
                {requestedBusId ? 'No matching bus found' : 'No buses found'}
              </div>
            ) : (
              <>
                <div className={busViewMode === 'grid' ? 'grid gap-4 xl:grid-cols-3' : 'space-y-3'}>
                  {paginatedBuses.map((bus) => (
                    <div key={bus.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-op-card">
                      <div className={`flex gap-4 ${busViewMode === 'grid' ? 'h-full flex-col' : 'flex-col lg:flex-row lg:items-start lg:justify-between'}`}>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">{bus.name}</h4>
                            <StatusBadge status={bus.active ? 'ACTIVE' : 'INACTIVE'} />
                          </div>
                          <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
                            <p><span className="font-semibold text-slate-900 dark:text-white">Type:</span> {bus.busType || '—'}</p>
                            <p><span className="font-semibold text-slate-900 dark:text-white">Seats:</span> {bus.totalSeats || '—'}</p>
                            <p><span className="font-semibold text-slate-900 dark:text-white">Vehicle:</span> {bus.vehicleNumber || '—'}</p>
                            <p><span className="font-semibold text-slate-900 dark:text-white">Operator:</span> {bus.operatorName || bus.operator?.name || '—'}</p>
                          </div>
                        </div>
                        <div className={`flex flex-wrap gap-2 ${busViewMode === 'grid' ? 'mt-auto border-t border-slate-200 pt-4 dark:border-slate-800' : 'lg:min-w-[220px] lg:justify-end'}`}>
                          {!bus.active ? (
                            <button onClick={() => confirm(`Approve bus "${bus.name}"?`, () => approveBus(bus.id), bus.id, `approve-bus-${bus.id}`, `Bus "${bus.name}" has been approved.`, `Approving bus ${bus.name}...`)} disabled={Boolean(actionLoadingId)} className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-500 hover:bg-green-500/20 disabled:opacity-60">
                              Approve
                            </button>
                          ) : (
                            <span className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">Approved</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls page={busPage} pageSize={GRID_PAGE_SIZE} totalItems={visibleBuses.length} onPageChange={setBusPage} itemLabel="buses" />
              </>
            )}
          </div>
        )}

        {activeItem === 'users' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold tracking-tight">All Users</h3>
              <ViewToggle viewMode={userViewMode} onChange={setUserViewMode} />
            </div>

            {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-500">{error}</div>}

            {dataLoading ? (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-op-card">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />)}
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400 dark:border-slate-800 dark:bg-op-card">No users found</div>
            ) : (
              <>
                <div className={userViewMode === 'grid' ? 'grid gap-4 xl:grid-cols-3' : 'space-y-3'}>
                  {paginatedUsers.map((u) => (
                    <div key={u.id} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-op-card">
                      <div className={`flex gap-4 ${userViewMode === 'grid' ? 'h-full flex-col' : 'flex-col lg:flex-row lg:items-start lg:justify-between'}`}>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white">{`${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unnamed user'}</h4>
                            <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                              {u.roles?.[0]?.replace('ROLE_', '') || 'USER'}
                            </span>
                          </div>
                          <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
                            <p><span className="font-semibold text-slate-900 dark:text-white">Email:</span> {u.email || '—'}</p>
                            <p><span className="font-semibold text-slate-900 dark:text-white">Phone:</span> {u.phone || '—'}</p>
                          </div>
                        </div>
                        <div className={`flex items-center ${userViewMode === 'grid' ? 'mt-auto border-t border-slate-200 pt-4 dark:border-slate-800' : 'lg:min-w-[180px] lg:justify-end'}`}>
                          <span className={`text-sm font-bold ${u.emailVerified ? 'text-green-500' : 'text-red-500'}`}>
                            {u.emailVerified ? 'Verified' : 'Unverified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls page={userPage} pageSize={GRID_PAGE_SIZE} totalItems={users.length} onPageChange={setUserPage} itemLabel="users" />
              </>
            )}
          </div>
        )}
      </div>

      {modal ? (
        <ConfirmModal
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      ) : null}
    </AdminLayout>
  );
};

export default AdminDashboard;
