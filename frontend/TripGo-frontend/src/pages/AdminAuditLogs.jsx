import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { getAuditLogs } from '../api/adminAnalyticsService';
import {
  Card, EmptyState, FilterTabs, PageHeader, Pagination, SearchInput, SkeletonRows, StatusPill,
} from '../features/admin/components/AdminUI';
import { headerButton } from '../features/admin/components/adminStyles';
import VisitorsPanel from '../features/admin/components/VisitorsPanel';

const PAGE_SIZE = 50;
const SELECT = 'rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

// Values come from AuditLoggingAspect: entity = controller name, action = derived from the method name
const ENTITIES = ['AUTH', 'BOOKING', 'PAYMENT', 'OPERATOR', 'BUS', 'USER', 'DISCOUNT', 'REVIEW', 'RATING', 'ROUTE', 'SAVED_ROUTES', 'NOTIFICATION'];
const ACTIONS = ['LOGIN', 'REGISTER', 'REFRESH', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'SUSPEND', 'RESTORE', 'TOGGLE', 'CANCEL', 'LOCK', 'CONFIRMBOOKINGAFTERPAYMENT', 'APPLYPROMO', 'RESETPASSWORD', 'FORGOTPASSWORD', 'SENDOTP', 'SUBMITRATING'];
const ACTION_LABELS = {
  CONFIRMBOOKINGAFTERPAYMENT: 'Confirm booking', APPLYPROMO: 'Apply promo', RESETPASSWORD: 'Reset password',
  FORGOTPASSWORD: 'Forgot password', SENDOTP: 'Send OTP', SUBMITRATING: 'Submit rating', MARKREAD: 'Mark read',
  UNSAVEROUTE: 'Unsave route', REFRESH: 'Token refresh',
};
const ACTION_TONE = {
  APPROVE: 'green', RESTORE: 'green', CREATE: 'blue', REGISTER: 'blue', UPDATE: 'blue', TOGGLE: 'blue',
  REJECT: 'red', DELETE: 'red', SUSPEND: 'amber', CANCEL: 'amber', LOGIN: 'slate', REFRESH: 'slate',
};

const titleCase = (s) => String(s || '').toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const actionLabel = (a) => ACTION_LABELS[a] || titleCase(a);
const when = (value) => new Date(value).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const whenFull = (value) => new Date(value).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Kolkata' });
const cleanIp = (ip) => (ip === '0:0:0:0:0:0:0:1' || ip === '::1' ? 'localhost' : ip || '—');

const ActivityLog = ({ reloadRef }) => {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [status, setStatus] = useState('ALL');
  const [emailInput, setEmailInput] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [expanded, setExpanded] = useState(null);

  // Search as you type, without a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => { setActorEmail(emailInput.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [emailInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({ page, size: PAGE_SIZE, action: action || undefined, entityType: entityType || undefined, actorEmail: actorEmail || undefined });
      setLogs(res?.content || []);
      setTotal(Number(res?.totalElements || 0));
    } catch (e) {
      toast.error(e.message || 'Couldn’t load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, action, entityType, actorEmail]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { reloadRef.current = { load, loading }; });

  // The API filters by action/entity/actor; success vs failure is filtered within the page
  const visible = status === 'ALL' ? logs : logs.filter((l) => (status === 'FAILED' ? l.status === 'FAILED' : l.status !== 'FAILED'));
  const failedOnPage = logs.filter((l) => l.status === 'FAILED').length;
  const hasFilters = action || entityType || actorEmail || status !== 'ALL';
  const options = (known, key) => [...new Set([...known, ...logs.map((l) => l[key]).filter(Boolean)])];

  const reset = () => { setAction(''); setEntityType(''); setEmailInput(''); setActorEmail(''); setStatus('ALL'); setPage(0); };

  return (
      <div className="space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(0); }} className={SELECT} aria-label="Area">
              <option value="">All areas</option>
              {options(ENTITIES, 'entityType').map((v) => <option key={v} value={v}>{titleCase(v)}</option>)}
            </select>
            <select value={action} onChange={(e) => { setAction(e.target.value); setPage(0); }} className={SELECT} aria-label="Action">
              <option value="">All actions</option>
              {options(ACTIONS, 'action').map((v) => <option key={v} value={v}>{actionLabel(v)}</option>)}
            </select>
            <FilterTabs
              options={[{ value: 'ALL', label: 'All' }, { value: 'SUCCESS', label: 'Succeeded' }, { value: 'FAILED', label: 'Failed', count: failedOnPage || null }]}
              value={status}
              onChange={setStatus}
              label="Result"
            />
            {hasFilters && <button onClick={reset} className="px-2 text-sm font-bold text-primary hover:text-[#FF8A65]">Clear filters</button>}
          </div>
          <SearchInput value={emailInput} onChange={setEmailInput} placeholder="Search by who did it (email)" className="xl:ml-auto xl:w-80" />
        </div>

        <Card>
          {loading ? <SkeletonRows rows={6} /> : visible.length === 0 ? (
            <EmptyState icon="history" title="No log entries" subtitle={hasFilters ? 'Try clearing a filter.' : 'Actions will appear here as people use TripGo.'} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 whitespace-nowrap">When</th>
                    <th className="px-5 py-3">Who</th>
                    <th className="px-5 py-3">What</th>
                    <th className="px-5 py-3 hidden lg:table-cell">Request</th>
                    <th className="px-5 py-3">Result</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((log) => {
                    const open = expanded === log.id;
                    const failed = log.status === 'FAILED';
                    return (
                      <Fragment key={log.id}>
                        <tr onClick={() => setExpanded(open ? null : log.id)} className={`cursor-pointer ${failed ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-slate-50/60'}`}>
                          <td className="px-5 py-3 whitespace-nowrap text-slate-500" title={whenFull(log.createdAt)}>{when(log.createdAt)}</td>
                          <td className="px-5 py-3">
                            <p className="font-semibold text-slate-800 truncate max-w-[220px]">{log.actorEmail || <span className="font-normal text-slate-400">Not signed in</span>}</p>
                            {log.actorRole && <p className="text-xs text-slate-400">{titleCase(String(log.actorRole).replace('ROLE_', ''))}</p>}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <StatusPill tone={ACTION_TONE[log.action] || 'slate'}>{actionLabel(log.action)}</StatusPill>
                              <span className="text-xs font-semibold text-slate-500">{titleCase(log.entityType)}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden lg:table-cell">
                            <code className="text-xs text-slate-500 truncate block max-w-[320px]">{log.details || '—'}</code>
                          </td>
                          <td className="px-5 py-3">{failed ? <StatusPill tone="red">Failed</StatusPill> : <StatusPill tone="green">OK</StatusPill>}</td>
                          <td className="pr-4 text-slate-400">
                            <span className={`material-symbols-outlined text-[20px] transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
                          </td>
                        </tr>
                        {open && (
                          <tr className="bg-slate-50/70">
                            <td colSpan={6} className="px-5 py-4">
                              <dl className="grid gap-x-8 gap-y-3 text-xs sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                  ['Time', whenFull(log.createdAt)],
                                  ['Request', log.details || '—'],
                                  ['Record ID', log.entityId || '—'],
                                  ['IP address', cleanIp(log.ipAddress)],
                                ].map(([k, v]) => (
                                  <div key={k} className="min-w-0">
                                    <dt className="font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                                    <dd className="mt-0.5 break-all font-mono text-slate-700">{v}</dd>
                                  </div>
                                ))}
                              </dl>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} onChange={(p) => { setPage(p); setExpanded(null); }} />
        </Card>
        {status !== 'ALL' && (
          <p className="px-1 text-xs text-slate-500">The result filter applies to the {PAGE_SIZE} entries on this page.</p>
        )}
      </div>
  );
};

const VIEWS = [{ value: 'activity', label: 'Activity' }, { value: 'visitors', label: 'Visitors' }];

const AdminAuditLogs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'visitors' ? 'visitors' : 'activity';
  const reloadRef = useRef({ load: () => {}, loading: false });

  return (
    <AdminLayout activeItem="audit-logs" title="Audit logs">
      <div className="space-y-5">
        <PageHeader
          title="Audit logs"
          subtitle={view === 'activity' ? 'Every change made through TripGo, newest first · times in IST' : 'Who visits TripGo, which pages they open and where they came from'}
          actions={view === 'activity' && (
            <button onClick={() => reloadRef.current.load()} className={headerButton}>
              <span className="material-symbols-outlined text-[18px]">refresh</span>Refresh
            </button>
          )}
        />
        <div className="flex">
          <FilterTabs options={VIEWS} value={view} onChange={(v) => setSearchParams(v === 'activity' ? {} : { view: v })} label="Audit view" />
        </div>
        {view === 'activity' ? <ActivityLog reloadRef={reloadRef} /> : <VisitorsPanel />}
      </div>
    </AdminLayout>
  );
};

export default AdminAuditLogs;
