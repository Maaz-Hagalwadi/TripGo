import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../shared/contexts/AuthContext';
import AdminLayout from '../shared/components/AdminLayout';
import { getUsers, suspendUser, unsuspendUser } from '../api/adminService';
import {
  ActionButton, Avatar, Card, ConfirmDialog, EmptyState, FilterTabs, PageHeader, Pagination,
  SearchInput, SkeletonRows, StatCard, StatusPill,
} from '../shared/components/console/ConsoleUI';
import { headerButton } from '../shared/components/console/consoleStyles';

const PAGE_SIZE = 15;
const ROLE_LABEL = { ROLE_ADMIN: 'Admin', ROLE_OPERATOR: 'Operator', ROLE_USER: 'Traveller' };
const ROLE_TONE = { ROLE_ADMIN: 'peach', ROLE_OPERATOR: 'blue', ROLE_USER: 'slate' };

const fullName = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unnamed user';
const isAdmin = (u) => (u.roles || []).includes('ROLE_ADMIN');
const joined = (value) => (value
  ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
  : '—');

const FILTERS = [
  ['ALL', 'All', () => true],
  ['ROLE_USER', 'Travellers', (u) => (u.roles || []).includes('ROLE_USER') && !isAdmin(u) && !(u.roles || []).includes('ROLE_OPERATOR')],
  ['ROLE_OPERATOR', 'Operators', (u) => (u.roles || []).includes('ROLE_OPERATOR')],
  ['ROLE_ADMIN', 'Admins', isAdmin],
  ['SUSPENDED', 'Suspended', (u) => u.isSuspended],
  ['UNVERIFIED', 'Unverified email', (u) => !u.emailVerified],
];

const AdminUsers = () => {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error(e.message || 'Couldn’t load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const match = FILTERS.find(([value]) => value === filter)[2];
    return users
      .filter(match)
      .filter((u) => !q || [fullName(u), u.email, u.phone].some((v) => String(v || '').toLowerCase().includes(q)))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [users, filter, q]);
  const safePage = Math.min(page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
  const rows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  const runConfirmed = async () => {
    const { user, action } = confirm;
    setBusy(true);
    try {
      const result = action === 'suspend' ? await suspendUser(user.id) : await unsuspendUser(user.id);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isSuspended: result?.isSuspended ?? action === 'suspend' } : u)));
      toast.success(`${fullName(user)} ${action === 'suspend' ? 'suspended and signed out' : 'reactivated'}`);
      setConfirm(null);
    } catch (e) {
      toast.error(e.message || 'That didn’t work. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const actionFor = (u) => {
    if (u.id === me?.id) return <span className="text-xs font-semibold text-slate-400">You</span>;
    if (isAdmin(u)) return <span className="text-xs text-slate-400" title="Admin accounts can’t be suspended">—</span>;
    return u.isSuspended
      ? <ActionButton icon="lock_open" tone="approve" onClick={() => setConfirm({ user: u, action: 'unsuspend' })}>Reactivate</ActionButton>
      : <ActionButton icon="block" tone="danger" onClick={() => setConfirm({ user: u, action: 'suspend' })}>Suspend</ActionButton>;
  };

  const count = (pred) => users.filter(pred).length;

  return (
    <AdminLayout title="Users" activeItemOverride="users">
      <div className="space-y-5">
        <PageHeader
          title="Users"
          subtitle="Everyone with a TripGo account"
          actions={<button onClick={load} disabled={loading} className={headerButton}><span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>refresh</span>Refresh</button>}
        />

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon="group" tone="navy" label="All accounts" value={users.length.toLocaleString('en-IN')} loading={loading} />
          <StatCard icon="luggage" tone="blue" label="Travellers" value={count(FILTERS[1][2]).toLocaleString('en-IN')} loading={loading} onClick={() => { setFilter('ROLE_USER'); setPage(0); }} />
          <StatCard icon="domain" tone="peach" label="Operators" value={count(FILTERS[2][2]).toLocaleString('en-IN')} loading={loading} onClick={() => { setFilter('ROLE_OPERATOR'); setPage(0); }} />
          <StatCard icon="block" tone="red" label="Suspended" value={count((u) => u.isSuspended).toLocaleString('en-IN')} loading={loading} onClick={() => { setFilter('SUSPENDED'); setPage(0); }} />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <FilterTabs
            options={FILTERS.map(([value, label, pred]) => ({ value, label, count: count(pred) }))}
            value={filter}
            onChange={(v) => { setFilter(v); setPage(0); }}
            label="User type"
          />
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Search name, email or phone" className="lg:ml-auto lg:w-80" />
        </div>

        <Card>
          {loading ? <SkeletonRows /> : rows.length === 0 ? (
            <EmptyState icon="group" title="No users found" subtitle="Try a different filter or search." />
          ) : (
            <>
              <table className="hidden md:table w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">User</th>
                    <th className="px-5 py-3 hidden lg:table-cell">Phone</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 hidden xl:table-cell">Joined</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar name={fullName(u)} src={u.profilePictureUrl} />
                          <div className="min-w-0">
                            <p className="font-bold text-slate-900 truncate">{fullName(u)}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[260px]">
                              {u.email}
                              {!u.emailVerified && <span className="ml-1.5 text-amber-600 font-semibold">· unverified</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-600 hidden lg:table-cell">{u.phone || '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {(u.roles || []).map((r) => <StatusPill key={r} tone={ROLE_TONE[r] || 'slate'}>{ROLE_LABEL[r] || r.replace('ROLE_', '')}</StatusPill>)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">{u.isSuspended ? <StatusPill tone="red">Suspended</StatusPill> : <StatusPill tone="green">Active</StatusPill>}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 hidden xl:table-cell">{joined(u.createdAt)}</td>
                      <td className="px-5 py-3.5 text-right">{actionFor(u)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <ul className="md:hidden divide-y divide-slate-100">
                {rows.map((u) => (
                  <li key={u.id} className="flex items-start gap-3 px-4 py-4">
                    <Avatar name={fullName(u)} src={u.profilePictureUrl} />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900">{fullName(u)}</p>
                      <p className="text-xs text-slate-500 break-all">{u.email}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(u.roles || []).map((r) => <StatusPill key={r} tone={ROLE_TONE[r] || 'slate'}>{ROLE_LABEL[r] || r}</StatusPill>)}
                        {u.isSuspended && <StatusPill tone="red">Suspended</StatusPill>}
                      </div>
                    </div>
                    <div className="flex-shrink-0">{actionFor(u)}</div>
                  </li>
                ))}
              </ul>
            </>
          )}
          <Pagination page={safePage} total={filtered.length} pageSize={PAGE_SIZE} onChange={setPage} />
        </Card>
      </div>

      {confirm && (
        <ConfirmDialog
          title={confirm.action === 'suspend' ? `Suspend ${fullName(confirm.user)}?` : `Reactivate ${fullName(confirm.user)}?`}
          message={confirm.action === 'suspend'
            ? 'They’ll be signed out on every device and can’t sign in or book until reactivated. Existing bookings are not cancelled.'
            : 'They’ll be able to sign in and book again.'}
          confirmLabel={confirm.action === 'suspend' ? 'Suspend' : 'Reactivate'}
          tone={confirm.action === 'suspend' ? 'danger' : 'approve'}
          busy={busy}
          onConfirm={runConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
