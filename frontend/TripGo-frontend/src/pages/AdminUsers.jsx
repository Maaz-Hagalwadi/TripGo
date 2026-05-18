import { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../shared/contexts/AuthContext';
import AdminLayout from '../shared/components/AdminLayout';
import { getUsers, suspendUser, unsuspendUser } from '../api/adminService';

const PAGE_SIZE = 15;

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const RoleBadge = ({ role }) => {
  const map = {
    ROLE_ADMIN:    'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
    ROLE_OPERATOR: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    ROLE_USER:     'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
  };
  const label = role.replace('ROLE_', '');
  return (
    <span className={`inline-flex rounded-lg px-2 py-0.5 text-[10px] font-bold ${map[role] || map.ROLE_USER}`}>
      {label}
    </span>
  );
};

const StatusBadge = ({ suspended }) => suspended ? (
  <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-600 ring-1 ring-red-200">
    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
    Suspended
  </span>
) : (
  <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
    Active
  </span>
);

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

const ROLE_FILTERS = ['ALL', 'USER', 'OPERATOR', 'ADMIN', 'SUSPENDED'];

const AdminUsers = () => {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState(null); // { id, name, action: 'suspend'|'unsuspend' }
  const [actioning, setActioning] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getUsers();
        setUsers(Array.isArray(data) ? data : []);
      } catch (e) {
        toast.error(e.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const roleMatch = roleFilter === 'ALL'
        ? true
        : roleFilter === 'SUSPENDED'
        ? u.isSuspended
        : u.roles?.some((r) => r.replace('ROLE_', '') === roleFilter);
      const searchMatch = !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
      return roleMatch && searchMatch;
    });
  }, [users, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, roleFilter]);

  const handleAction = async () => {
    if (!confirm) return;
    const { id, name, action } = confirm;
    setConfirm(null);
    setActioning(id);
    try {
      const result = action === 'suspend' ? await suspendUser(id) : await unsuspendUser(id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isSuspended: result.isSuspended } : u));
      toast.success(`${name} has been ${action === 'suspend' ? 'suspended' : 'reactivated'}.`);
    } catch (e) {
      toast.error(e.message || `Failed to ${action} user`);
    } finally {
      setActioning(null);
    }
  };

  return (
    <AdminLayout title="User Management" activeItemOverride="users">
      {confirm && (
        <ConfirmModal
          message={`${confirm.action === 'suspend' ? 'Suspend' : 'Reactivate'} ${confirm.name}?`}
          onConfirm={handleAction}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">View and manage all registered users</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Users',   value: users.length,                                                     icon: 'group' },
            { label: 'Active',        value: users.filter((u) => !u.isSuspended).length,                      icon: 'check_circle' },
            { label: 'Operators',     value: users.filter((u) => u.roles?.includes('ROLE_OPERATOR')).length,  icon: 'business' },
            { label: 'Suspended',     value: users.filter((u) => u.isSuspended).length,                       icon: 'block' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] p-5 text-white shadow-sm relative overflow-hidden">
              <div className="absolute -top-2 -right-2 opacity-10 select-none">
                <span className="material-symbols-outlined text-5xl">{icon}</span>
              </div>
              <p className="text-[10px] font-semibold opacity-60 uppercase tracking-wider mb-2">{label}</p>
              <p className="text-3xl font-black">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1.5 ring-1 ring-slate-200 shadow-sm flex-wrap">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setRoleFilter(f)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${roleFilter === f ? 'bg-[#002046] text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-base">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white ring-1 ring-slate-200 text-sm outline-none focus:ring-2 focus:ring-[#002046]/30 shadow-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 flex items-center justify-center gap-3 text-sm text-slate-500">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
              Loading users...
            </div>
          ) : paginated.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-5xl text-slate-300">group</span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">No users found</h2>
              <p className="mt-2 text-sm text-slate-500">Try adjusting your search or filter.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80">
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">User</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Email</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3.5 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                      <th className="px-5 py-3.5 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {paginated.map((u) => {
                      const isSelf = u.id === authUser?.id;
                      const isLoading = actioning === u.id;
                      return (
                        <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#002046]/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {u.profilePictureUrl ? (
                                  <img src={u.profilePictureUrl} alt="" className="w-9 h-9 object-cover" />
                                ) : (
                                  <span className="material-symbols-outlined text-[#002046] text-base">person</span>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-900">{u.firstName} {u.lastName}</p>
                                <p className="text-xs text-slate-400 md:hidden">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className="text-sm text-slate-600">{u.email}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1">
                              {(u.roles || []).map((r) => <RoleBadge key={r} role={r} />)}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <StatusBadge suspended={u.isSuspended} />
                          </td>
                          <td className="px-5 py-4 hidden lg:table-cell">
                            <span className="text-sm text-slate-500">{formatDate(u.createdAt)}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            {isSelf ? (
                              <span className="text-xs text-slate-400 italic">You</span>
                            ) : isLoading ? (
                              <div className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-500" />
                                Processing...
                              </div>
                            ) : u.isSuspended ? (
                              <button
                                onClick={() => setConfirm({ id: u.id, name: `${u.firstName} ${u.lastName}`, action: 'unsuspend' })}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors ring-1 ring-emerald-200"
                              >
                                <span className="material-symbols-outlined text-sm">lock_open</span>
                                Reactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirm({ id: u.id, name: `${u.firstName} ${u.lastName}`, action: 'suspend' })}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition-colors ring-1 ring-red-200"
                              >
                                <span className="material-symbols-outlined text-sm">block</span>
                                Suspend
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filtered.length > PAGE_SIZE && (
                <div className="border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-4">
                  <p className="text-sm text-slate-400">
                    Showing {page * PAGE_SIZE + 1}–{Math.min(filtered.length, (page + 1) * PAGE_SIZE)} of {filtered.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const n = totalPages <= 5 ? i : Math.max(0, Math.min(totalPages - 5, page - 2)) + i;
                      return (
                        <button key={n} onClick={() => setPage(n)}
                          className={`w-8 h-8 rounded-lg text-sm font-semibold transition-colors ${page === n ? 'bg-[#002046] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                          {n + 1}
                        </button>
                      );
                    })}
                    <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors">
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminUsers;
