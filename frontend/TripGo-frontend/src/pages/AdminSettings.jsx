import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';
import { changePassword } from '../api/userService';

const INPUT_CLASS = 'w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 transition-all';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [passwordModal, setPasswordModal] = useState({
    open: false,
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'ADMIN') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const closePasswordModal = () => {
    setPasswordModal({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleChangePassword = async () => {
    const oldPassword = passwordModal.oldPassword.trim();
    const newPassword = passwordModal.newPassword.trim();
    const confirmPassword = passwordModal.confirmPassword.trim();

    if (!oldPassword) return toast.error('Current password is required');
    if (!newPassword || newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

    setChangingPassword(true);
    const loadingToast = toast.loading('Changing password...');
    try {
      await changePassword(oldPassword, newPassword);
      toast.success('Password changed successfully', { id: loadingToast });
      closePasswordModal();
    } catch (error) {
      toast.error(error?.message || 'Failed to change password', { id: loadingToast });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <AdminLayout activeItemOverride="settings" title="Settings">
      <div className="space-y-5">

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-br from-[#002046] via-[#003a80] to-[#001224] px-5 py-5 text-white shadow-sm relative overflow-hidden">
          <div className="absolute -top-3 -right-3 text-7xl opacity-10 select-none">★</div>
          <p className="text-[10px] font-semibold opacity-60 uppercase tracking-widest mb-1">Admin</p>
          <h1 className="text-2xl font-black">Account Settings</h1>
          <p className="text-sm opacity-70 mt-1">Manage your admin profile details and account access.</p>
        </div>

        {/* Profile info */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#002046] text-lg">manage_accounts</span>
            </div>
            <p className="text-sm font-black text-slate-900">Admin Account</p>
          </div>
          <div className="px-5 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-5">
              {[
                { label: 'Full Name', value: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Admin' },
                { label: 'Email', value: user?.email || '--' },
                { label: 'Phone', value: user?.phone || '--' },
                { label: 'Role', value: user?.role || 'ADMIN' },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setPasswordModal((prev) => ({ ...prev, open: true }))}
                className="rounded-xl bg-[#002046] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#003a80] transition-colors"
              >
                Change Password
              </button>
              <button
                onClick={() => { logout(); navigate(ROUTES.LOGIN); }}
                className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {passwordModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Change Password</h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter your current password and set a new one.</p>
              </div>
              <button onClick={closePasswordModal} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200 transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Current Password *</label>
                <input type="password" value={passwordModal.oldPassword} onChange={(e) => setPasswordModal((prev) => ({ ...prev, oldPassword: e.target.value }))} placeholder="Enter current password" className={INPUT_CLASS} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">New Password *</label>
                <input type="password" value={passwordModal.newPassword} onChange={(e) => setPasswordModal((prev) => ({ ...prev, newPassword: e.target.value }))} placeholder="Enter new password" className={INPUT_CLASS} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Confirm Password *</label>
                <input type="password" value={passwordModal.confirmPassword} onChange={(e) => setPasswordModal((prev) => ({ ...prev, confirmPassword: e.target.value }))} placeholder="Confirm new password" className={INPUT_CLASS} />
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={closePasswordModal} className="flex-1 rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleChangePassword} disabled={changingPassword} className="flex-1 rounded-xl bg-[#002046] py-2.5 text-sm font-bold text-white hover:bg-[#003a80] transition-colors disabled:opacity-60">
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminLayout>
  );
};

export default AdminSettings;
