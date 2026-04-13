import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';
import { changePassword } from '../api/userService';

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
    if (!user || user.role !== 'ADMIN') {
      navigate(ROUTES.HOME);
    }
  }, [user, loading, navigate]);

  const closePasswordModal = () => {
    setPasswordModal({
      open: false,
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
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
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-op-card">
          <h3 className="mb-1 text-lg font-bold">Admin Account</h3>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">Manage your admin profile details and account access.</p>
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Full Name</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Admin'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Email</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{user?.email || '--'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Phone</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{user?.phone || '--'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Role</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{user?.role || 'ADMIN'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setPasswordModal((prev) => ({ ...prev, open: true }))}
              className="rounded-lg border border-slate-200 px-4 py-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Change Password
            </button>
            <button
              onClick={() => {
                logout();
                navigate(ROUTES.LOGIN);
              }}
              className="rounded-lg border border-red-300 px-4 py-2 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {passwordModal.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-op-card">
            <h3 className="mb-1 text-lg font-bold">Change Password</h3>
            <p className="mb-4 text-xs text-slate-500">Enter your current password and set a new password.</p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Current Password *</label>
                <input
                  type="password"
                  value={passwordModal.oldPassword}
                  onChange={(e) => setPasswordModal((prev) => ({ ...prev, oldPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">New Password *</label>
                <input
                  type="password"
                  value={passwordModal.newPassword}
                  onChange={(e) => setPasswordModal((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Confirm Password *</label>
                <input
                  type="password"
                  value={passwordModal.confirmPassword}
                  onChange={(e) => setPasswordModal((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={closePasswordModal}
                className="rounded-lg border border-slate-200 px-4 py-2 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-black transition-colors hover:bg-primary/90 disabled:opacity-60"
              >
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
