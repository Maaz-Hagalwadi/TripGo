import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';
import AdminLayout from '../shared/components/AdminLayout';
import {
  getOperators, approveOperator, rejectOperator, suspendOperator,
  getBuses, approveBus, rejectBus, getUsers
} from '../api/adminService';

const StatusBadge = ({ status }) => {
  const colors = {
    PENDING:   'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    APPROVED:  'bg-green-500/10 text-green-500 border-green-500/20',
    REJECTED:  'bg-red-500/10 text-red-500 border-red-500/20',
    SUSPENDED: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    ACTIVE:    'bg-green-500/10 text-green-500 border-green-500/20',
    INACTIVE:  'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  return (
    <span className={`px-2 py-1 rounded-lg text-xs font-bold border ${colors[status] || colors.INACTIVE}`}>
      {status}
    </span>
  );
};

const ConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
      <p className="font-semibold mb-6 text-center">{message}</p>
      <div className="flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold transition-all">
          Cancel
        </button>
        <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-primary text-black font-bold hover:bg-primary/90 transition-all">
          Confirm
        </button>
      </div>
    </div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading } = useAuth();

  const tabFromUrl = searchParams.get('tab');
  const activeItem = tabFromUrl || 'overview';

  const [operators, setOperators] = useState([]);
  const [buses, setBuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [operatorFilter, setOperatorFilter] = useState('ALL');
  const [busFilter, setBusFilter] = useState('ALL');
  const [showAllPendingBuses, setShowAllPendingBuses] = useState(false);
  const [showAllPendingOperators, setShowAllPendingOperators] = useState(false);
  const [dismissedBusIds, setDismissedBusIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('dismissedBusIds')) || []; }
    catch { return []; }
  });

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate(ROUTES.LOGIN); return; }
    if (user.role !== 'ADMIN') { navigate(ROUTES.HOME); return; }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    fetchTabData();
  }, [activeItem, operatorFilter, busFilter]);

  const fetchTabData = async () => {
    setDataLoading(true);
    setError(null);
    try {
      if (activeItem === 'operators' || activeItem === 'overview') {
        const data = await getOperators(operatorFilter === 'ALL' ? null : operatorFilter);
        setOperators(data);
      }
      if (activeItem === 'buses' || activeItem === 'overview') {
        const active = busFilter === 'ALL' ? null : busFilter === 'ACTIVE';
        const data = await getBuses(active);
        setBuses(data);
      }
      if (activeItem === 'users' || activeItem === 'overview') {
        const data = await getUsers();
        setUsers(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDataLoading(false);
    }
  };

  const confirm = (message, action, busIdToRemove = null, actionId = null, successMsg = null) => {
    setModal({
      message,
      onConfirm: async () => {
        setModal(null);
        setActionLoadingId(actionId);
        try {
          await action();
          toast.success(successMsg || 'Action completed successfully.');
          if (busIdToRemove) {
            setBuses(prev => prev.filter(b => b.id !== busIdToRemove));
            const updated = dismissedBusIds.filter(id => id !== busIdToRemove);
            setDismissedBusIds(updated);
            localStorage.setItem('dismissedBusIds', JSON.stringify(updated));
          } else {
            fetchTabData();
          }
        } catch (err) {
          setError(err.message);
          toast.error(err.message || 'Action failed');
        } finally {
          setActionLoadingId(null);
        }
      }
    });
  };

  const removeBusFromState = (busId) => {
    setBuses(prev => prev.filter(b => b.id !== busId));
  };

  const pendingOperators = operators.filter(o => o.status === 'PENDING').reverse();
  const approvedOperators = operators.filter(o => o.status === 'APPROVED');
  const inactiveBuses = buses.filter(b => !b.active && !dismissedBusIds.includes(b.id)).reverse();
  const allInactiveBuses = buses.filter(b => !b.active);

  if (loading) return (
    <div className="bg-op-bg min-h-screen flex items-center justify-center">
      <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
    </div>
  );

  const pageTitle = activeItem === 'overview' ? 'Overview' : activeItem.charAt(0).toUpperCase() + activeItem.slice(1);

  return (
    <AdminLayout activeItem={activeItem} title={pageTitle}>
      <div className="space-y-8">
        {dataLoading && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <span className="material-symbols-outlined animate-spin text-primary text-5xl">progress_activity</span>
          </div>
        )}

        {/* Overview Tab */}
        {activeItem === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=operators`)} className="bg-white dark:bg-op-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between hover:border-primary/30 transition-all cursor-pointer text-left">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Operators</p>
                  <h3 className="text-3xl font-bold mt-2">{dataLoading ? '...' : operators.length}</h3>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    {dataLoading ? '...' : `${pendingOperators.length} pending`}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg text-primary">
                  <span className="material-symbols-outlined">business</span>
                </div>
              </button>

              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=buses`)} className="bg-white dark:bg-op-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between hover:border-primary/30 transition-all cursor-pointer text-left">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Buses</p>
                  <h3 className="text-3xl font-bold mt-2">{dataLoading ? '...' : buses.length}</h3>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">info</span>
                    {dataLoading ? '...' : `${allInactiveBuses.length} pending approval`}
                  </p>
                </div>
                <div className="bg-green-500/10 p-3 rounded-lg text-green-500">
                  <span className="material-symbols-outlined">directions_bus</span>
                </div>
              </button>

              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=users`)} className="bg-white dark:bg-op-card p-6 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start justify-between hover:border-primary/30 transition-all cursor-pointer text-left">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Users</p>
                  <h3 className="text-3xl font-bold mt-2">{dataLoading ? '...' : users.length}</h3>
                  <p className="text-xs text-slate-400 mt-2">Registered users</p>
                </div>
                <div className="bg-orange-500/10 p-3 rounded-lg text-orange-500">
                  <span className="material-symbols-outlined">group</span>
                </div>
              </button>

              <button onClick={() => navigate(`${ROUTES.ADMIN_DASHBOARD}?tab=operators`)} className="bg-primary p-6 rounded-xl flex items-start justify-between relative overflow-hidden group cursor-pointer text-left">
                <div className="relative z-10">
                  <p className="text-sm font-medium text-white/80">Approved Operators</p>
                  <h3 className="text-3xl font-bold mt-2 text-white">{dataLoading ? '...' : approvedOperators.length}</h3>
                  <p className="text-xs text-white/60 mt-2">Active on platform</p>
                </div>
                <div className="bg-white/20 p-3 rounded-lg text-white relative z-10">
                  <span className="material-symbols-outlined">verified</span>
                </div>
                <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              <div className="xl:col-span-2 space-y-8">
                {/* Pending Operator Approvals */}
                <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight">Pending Operator Approvals</h3>
                  {pendingOperators.length > 5 && (
                    <button
                      onClick={() => setShowAllPendingOperators(p => !p)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      {showAllPendingOperators ? 'Show Less' : `View All (${pendingOperators.length})`}
                      <span className="material-symbols-outlined text-sm">{showAllPendingOperators ? 'expand_less' : 'expand_more'}</span>
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800">
                  {dataLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                    </div>
                  ) : pendingOperators.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                      <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">check_circle</span>
                      <p className="text-slate-500 font-medium">No pending approvals</p>
                      <p className="text-slate-400 text-sm mt-1">All operators have been reviewed.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(showAllPendingOperators ? pendingOperators : pendingOperators.slice(0, 5)).map(op => (
                        <div key={op.id} className="flex items-center justify-between px-6 py-4">
                          <div>
                            <p className="font-semibold text-sm">{op.name}</p>
                            <p className="text-xs text-slate-400">{op.contactEmail}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => confirm(`Approve "${op.name}"?`, () => approveOperator(op.id), null, `approve-op-${op.id}`, `Operator "${op.name}" has been approved.`)}
                              disabled={actionLoadingId === `approve-op-${op.id}`}
                              className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-500 rounded-lg text-xs font-bold transition-all disabled:opacity-60 flex items-center gap-1">
                              {actionLoadingId === `approve-op-${op.id}` ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : 'Approve'}
                            </button>
                            <button onClick={() => confirm(`Reject "${op.name}"?`, () => rejectOperator(op.id), null, `reject-op-${op.id}`, `Operator "${op.name}" has been rejected.`)}
                              disabled={actionLoadingId === `reject-op-${op.id}`}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-all disabled:opacity-60 flex items-center gap-1">
                              {actionLoadingId === `reject-op-${op.id}` ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : 'Reject'}
                            </button>
                          </div>
                        </div>
                      ))}
                      {!showAllPendingOperators && pendingOperators.length > 5 && (
                        <div className="px-6 py-3 text-center">
                          <button
                            onClick={() => setShowAllPendingOperators(true)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            + {pendingOperators.length - 5} more pending — View All
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>

                {/* Pending Bus Approvals */}
                <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold tracking-tight">Pending Bus Approvals</h3>
                  {inactiveBuses.length > 5 && (
                    <button
                      onClick={() => setShowAllPendingBuses(p => !p)}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      {showAllPendingBuses ? 'Show Less' : `View All (${inactiveBuses.length})`}
                      <span className="material-symbols-outlined text-sm">{showAllPendingBuses ? 'expand_less' : 'expand_more'}</span>
                    </button>
                  )}
                </div>
                <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800">
                  {dataLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <span className="material-symbols-outlined animate-spin text-primary text-4xl">progress_activity</span>
                    </div>
                  ) : inactiveBuses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                      <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-700 mb-3">check_circle</span>
                      <p className="text-slate-500 font-medium">No pending bus approvals</p>
                      <p className="text-slate-400 text-sm mt-1">All buses have been reviewed.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(showAllPendingBuses ? inactiveBuses : inactiveBuses.slice(0, 5)).map(bus => (
                        <div key={bus.id} className="flex items-center justify-between px-6 py-4">
                          <div>
                            <p className="font-semibold text-sm">{bus.name}</p>
                            <p className="text-xs text-slate-400">{bus.busType} · {bus.totalSeats} seats · {bus.vehicleNumber || 'No plate'}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => confirm(`Approve bus "${bus.name}"?`, () => approveBus(bus.id), bus.id, `approve-bus-${bus.id}`, `Bus "${bus.name}" has been approved.`)}
                              disabled={actionLoadingId === `approve-bus-${bus.id}`}
                              className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-500 rounded-lg text-xs font-bold transition-all disabled:opacity-60 flex items-center gap-1">
                              {actionLoadingId === `approve-bus-${bus.id}` ? <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span> : 'Approve'}
                            </button>
                            <button onClick={() => {
                              const updated = [...dismissedBusIds, bus.id];
                              setDismissedBusIds(updated);
                              localStorage.setItem('dismissedBusIds', JSON.stringify(updated));
                            }}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 transition-all">
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>
                        </div>
                      ))}
                      {!showAllPendingBuses && inactiveBuses.length > 5 && (
                        <div className="px-6 py-3 text-center">
                          <button
                            onClick={() => setShowAllPendingBuses(true)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            + {inactiveBuses.length - 5} more pending — View All
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold tracking-tight">Platform Stats</h3>
                <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Operator Status</h4>
                  {dataLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">Approved</span>
                          <span className="text-sm font-bold text-green-500">{approvedOperators.length} / {operators.length}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-green-500 h-full transition-all" style={{ width: operators.length ? `${(approvedOperators.length / operators.length) * 100}%` : '0%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">Pending</span>
                          <span className="text-sm font-bold text-yellow-500">{pendingOperators.length}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-yellow-500 h-full transition-all" style={{ width: operators.length ? `${(pendingOperators.length / operators.length) * 100}%` : '0%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">Rejected</span>
                          <span className="text-sm font-bold text-red-500">{operators.filter(o => o.status === 'REJECTED').length}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-red-500 h-full transition-all" style={{ width: operators.length ? `${(operators.filter(o => o.status === 'REJECTED').length / operators.length) * 100}%` : '0%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">Suspended</span>
                          <span className="text-sm font-bold text-orange-500">{operators.filter(o => o.status === 'SUSPENDED').length}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-orange-500 h-full transition-all" style={{ width: operators.length ? `${(operators.filter(o => o.status === 'SUSPENDED').length / operators.length) * 100}%` : '0%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">Active Buses</span>
                          <span className="text-sm font-bold text-primary">{buses.filter(b => b.active).length} / {buses.length}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-primary h-full transition-all" style={{ width: buses.length ? `${(buses.filter(b => b.active).length / buses.length) * 100}%` : '0%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">Inactive Buses</span>
                          <span className="text-sm font-bold text-slate-400">{allInactiveBuses.length}</span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-slate-400 h-full transition-all" style={{ width: buses.length ? `${(allInactiveBuses.length / buses.length) * 100}%` : '0%' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Operators Tab */}
        {activeItem === 'operators' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-xl font-bold tracking-tight">All Operators</h3>
              <div className="flex gap-2 flex-wrap">
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map(f => (
                  <button key={f} onClick={() => setOperatorFilter(f)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      operatorFilter === f
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-500 text-sm">{error}</div>}

            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {dataLoading ? (
                <div className="p-6 space-y-3 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 uppercase tracking-widest">
                        <th className="text-left px-6 py-4">Name</th>
                        <th className="text-left px-6 py-4">Short Name</th>
                        <th className="text-left px-6 py-4">Contact Email</th>
                        <th className="text-left px-6 py-4">Phone</th>
                        <th className="text-left px-6 py-4">Status</th>
                        <th className="text-left px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operators.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-12 text-slate-400">No operators found</td></tr>
                      ) : operators.map(op => (
                        <tr key={op.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-sm">{op.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{op.shortName || '—'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{op.contactEmail}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{op.contactPhone || '—'}</td>
                          <td className="px-6 py-4"><StatusBadge status={op.status} /></td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2 flex-wrap">
                              {op.status === 'PENDING' && <>
                                <button onClick={() => confirm(`Approve "${op.name}"?`, () => approveOperator(op.id), null, null, `Operator "${op.name}" has been approved.`)}
                                  className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-500 rounded-lg text-xs font-bold transition-all">Approve</button>
                                <button onClick={() => confirm(`Reject "${op.name}"?`, () => rejectOperator(op.id), null, null, `Operator "${op.name}" has been rejected.`)}
                                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-xs font-bold transition-all">Reject</button>
                              </>}
                              {op.status === 'APPROVED' && (
                                <button onClick={() => confirm(`Suspend "${op.name}"?`, () => suspendOperator(op.id), null, null, `Operator "${op.name}" has been suspended.`)}
                                  className="px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-500 rounded-lg text-xs font-bold transition-all">Suspend</button>
                              )}
                              {(op.status === 'REJECTED' || op.status === 'SUSPENDED') && (
                                <button onClick={() => confirm(`Re-approve "${op.name}"?`, () => approveOperator(op.id), null, null, `Operator "${op.name}" has been re-approved.`)}
                                  className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-500 rounded-lg text-xs font-bold transition-all">Re-approve</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Buses Tab */}
        {activeItem === 'buses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-xl font-bold tracking-tight">All Buses</h3>
              <div className="flex gap-2">
                {['ALL', 'ACTIVE', 'INACTIVE'].map(f => (
                  <button key={f} onClick={() => setBusFilter(f)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      busFilter === f
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-500 text-sm">{error}</div>}

            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {dataLoading ? (
                <div className="p-6 space-y-3 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 uppercase tracking-widest">
                        <th className="text-left px-6 py-4">Bus Name</th>
                        <th className="text-left px-6 py-4">Type</th>
                        <th className="text-left px-6 py-4">Vehicle Number</th>
                        <th className="text-left px-6 py-4">Seats</th>
                        <th className="text-left px-6 py-4">Status</th>
                        <th className="text-left px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buses.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-12 text-slate-400">No buses found</td></tr>
                      ) : buses.map(bus => (
                        <tr key={bus.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-sm">{bus.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{bus.busType}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{bus.vehicleNumber || '—'}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{bus.totalSeats}</td>
                          <td className="px-6 py-4"><StatusBadge status={bus.active ? 'ACTIVE' : 'INACTIVE'} /></td>
                          <td className="px-6 py-4">
                            {!bus.active ? (
                              <button onClick={() => confirm(`Approve bus "${bus.name}"?`, () => approveBus(bus.id), bus.id, null, `Bus "${bus.name}" has been approved.`)}
                                className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-500 rounded-lg text-xs font-bold transition-all">
                                Approve
                              </button>
                            ) : <span className="text-slate-400 text-xs">—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeItem === 'users' && (
          <div className="space-y-4">
            <h3 className="text-xl font-bold tracking-tight">All Users</h3>

            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-500 text-sm">{error}</div>}

            <div className="bg-white dark:bg-op-card rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              {dataLoading ? (
                <div className="p-6 space-y-3 animate-pulse">
                  {[1,2,3,4].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 text-xs text-slate-400 uppercase tracking-widest">
                        <th className="text-left px-6 py-4">Name</th>
                        <th className="text-left px-6 py-4">Email</th>
                        <th className="text-left px-6 py-4">Phone</th>
                        <th className="text-left px-6 py-4">Role</th>
                        <th className="text-left px-6 py-4">Verified</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-12 text-slate-400">No users found</td></tr>
                      ) : users.map(u => (
                        <tr key={u.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="px-6 py-4 font-semibold text-sm">{u.firstName} {u.lastName}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{u.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300">{u.phone || '—'}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-bold">
                              {u.roles?.[0]?.replace('ROLE_', '') || 'USER'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-bold ${u.emailVerified ? 'text-green-500' : 'text-red-500'}`}>
                              {u.emailVerified ? '✓ Verified' : '✗ Unverified'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ConfirmModal
          message={modal.message}
          onConfirm={modal.onConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
