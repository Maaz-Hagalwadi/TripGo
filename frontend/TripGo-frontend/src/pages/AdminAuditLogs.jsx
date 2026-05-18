import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { useAuth } from '../shared/contexts/AuthContext';
import { getAuditLogs } from '../api/adminAnalyticsService';
import { ROUTES } from '../shared/constants/routes';

const ACTION_COLORS = {
  APPROVE:  'bg-emerald-50 text-emerald-700',
  REJECT:   'bg-rose-50 text-rose-700',
  SUSPEND:  'bg-orange-50 text-orange-700',
  RESTORE:  'bg-sky-50 text-sky-700',
  CREATE:   'bg-blue-50 text-blue-700',
  UPDATE:   'bg-indigo-50 text-indigo-700',
  DELETE:   'bg-red-50 text-red-700',
  TOGGLE:   'bg-violet-50 text-violet-700',
  ASSIGN:   'bg-teal-50 text-teal-700',
  START:    'bg-cyan-50 text-cyan-700',
  COMPLETE: 'bg-emerald-50 text-emerald-700',
  CANCEL:   'bg-amber-50 text-amber-700',
};

const ActionBadge = ({ action }) => {
  const cls = ACTION_COLORS[action] || 'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      {action}
    </span>
  );
};

const StatusDot = ({ status }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${status === 'FAILED' ? 'text-rose-600' : 'text-emerald-600'}`}>
    <span className={`w-1.5 h-1.5 rounded-full ${status === 'FAILED' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
    {status}
  </span>
);

const ALL_ACTIONS = ['', 'APPROVE', 'REJECT', 'SUSPEND', 'RESTORE', 'CREATE', 'UPDATE', 'DELETE', 'TOGGLE', 'ASSIGN', 'CANCEL'];
const ALL_ENTITIES = ['', 'BUS', 'OPERATOR', 'USER', 'DISCOUNT', 'ROUTE', 'SAVED_ROUTE', 'BOOKING'];

const AdminAuditLogs = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [logs, setLogs]           = useState([]);
  const [totalElements, setTotal] = useState(0);
  const [totalPages, setPages]    = useState(0);
  const [busy, setBusy]           = useState(true);

  const [page,       setPage]       = useState(0);
  const [action,     setAction]     = useState('');
  const [entityType, setEntityType] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const fetchLogs = useCallback(async () => {
    try {
      setBusy(true);
      const res = await getAuditLogs({ page, size: 50, action: action || undefined, entityType: entityType || undefined, actorEmail: actorEmail || undefined });
      setLogs(res?.content || []);
      setTotal(res?.totalElements || 0);
      setPages(res?.totalPages || 0);
    } catch (e) {
      toast.error(e.message || 'Failed to load audit logs');
    } finally {
      setBusy(false);
    }
  }, [page, action, entityType, actorEmail]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const applyEmail = (e) => {
    if (e.key === 'Enter') { setActorEmail(emailInput); setPage(0); }
  };

  const resetFilters = () => {
    setAction('');
    setEntityType('');
    setActorEmail('');
    setEmailInput('');
    setPage(0);
  };

  const hasFilters = action || entityType || actorEmail;

  return (
    <AdminLayout activeItem="audit-logs" title="Audit Logs">
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Audit Logs</h1>
            <p className="text-sm text-slate-500 mt-0.5">All mutating actions performed on the platform</p>
          </div>
          <button
            onClick={fetchLogs}
            disabled={busy}
            className="flex items-center gap-2 rounded-2xl bg-[#002046] text-white px-4 py-2.5 text-sm font-bold hover:bg-[#003a80] transition-colors disabled:opacity-60"
          >
            {busy
              ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              : <span className="material-symbols-outlined text-base">refresh</span>
            }
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
          <select
            value={action}
            onChange={e => { setAction(e.target.value); setPage(0); }}
            className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-[#002046] cursor-pointer"
          >
            <option value="">All actions</option>
            {ALL_ACTIONS.filter(Boolean).map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={entityType}
            onChange={e => { setEntityType(e.target.value); setPage(0); }}
            className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 outline-none ring-1 ring-slate-200 focus:ring-[#002046] cursor-pointer"
          >
            <option value="">All entities</option>
            {ALL_ENTITIES.filter(Boolean).map(e => <option key={e} value={e}>{e}</option>)}
          </select>

          <div className="flex items-center gap-1.5 rounded-xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 flex-1 min-w-[180px]">
            <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
            <input
              value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={applyEmail}
              placeholder="Search actor email… (Enter)"
              className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          {hasFilters && (
            <button onClick={resetFilters} className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
              Clear
            </button>
          )}

          <p className="text-xs text-slate-400 ml-auto">{totalElements.toLocaleString()} entries</p>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          {busy ? (
            <div className="py-16 flex items-center justify-center gap-3 text-sm text-slate-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
              Loading logs…
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-4xl text-slate-200">history</span>
              <p className="text-sm font-semibold text-slate-500">No audit logs found</p>
              {hasFilters && <p className="text-xs text-slate-400">Try clearing the filters</p>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">Time</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-400 uppercase tracking-wider">Actor</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-400 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Entity</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Entity ID</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-400 uppercase tracking-wider hidden xl:table-cell">Details</th>
                    <th className="px-4 py-3.5 text-left font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id} className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${log.status === 'FAILED' ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800 max-w-[160px] truncate">
                        {log.actorEmail || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.actorRole ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">{log.actorRole}</span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-slate-600 font-medium">
                        {log.entityType || '—'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-slate-400 font-mono text-[10px] max-w-[120px] truncate" title={log.entityId}>
                        {log.entityId ? log.entityId.slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-slate-400 max-w-[180px] truncate" title={log.details}>
                        {log.details || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusDot status={log.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="border-t border-slate-100 px-4 py-3.5 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                Page {page + 1} of {totalPages} · {totalElements.toLocaleString()} entries
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(0)} disabled={page === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                  <span className="material-symbols-outlined text-sm">first_page</span>
                </button>
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                  <span className="material-symbols-outlined text-sm">chevron_left</span>
                </button>
                <span className="px-3 py-1 text-xs font-semibold text-slate-600">{page + 1}</span>
                <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                  <span className="material-symbols-outlined text-sm">chevron_right</span>
                </button>
                <button onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                  <span className="material-symbols-outlined text-sm">last_page</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
};

export default AdminAuditLogs;
