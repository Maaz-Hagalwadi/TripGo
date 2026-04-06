import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { changePassword } from '../../../api/userService';

const UserSettings = () => {
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
    if (!user || user.role !== 'USER') {
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

    if (!oldPassword) {
      toast.error('Current password is required');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    const loadingToast = toast.loading('Changing password...');
    try {
      await changePassword(oldPassword, newPassword);
      toast.success('Password changed successfully', { id: loadingToast });
      closePasswordModal();
    } catch (e) {
      toast.error(e.message || 'Failed to change password', { id: loadingToast });
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <UserLayout activeItem="settings" title="Settings">
      <div className="space-y-6">
        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">Account Settings</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Manage your account security and profile access.</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(ROUTES.USER_PROFILE)}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Open Profile
            </button>
            <button
              onClick={() => setPasswordModal(prev => ({ ...prev, open: true }))}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Change Password
            </button>
            <button
              onClick={() => {
                logout();
                navigate(ROUTES.LOGIN);
              }}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {passwordModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-op-card rounded-xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-bold mb-1">Change Password</h3>
            <p className="text-xs text-slate-500 mb-4">Enter your current password and set a new password.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Current Password *</label>
                <input
                  type="password"
                  value={passwordModal.oldPassword}
                  onChange={(e) => setPasswordModal(prev => ({ ...prev, oldPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">New Password *</label>
                <input
                  type="password"
                  value={passwordModal.newPassword}
                  onChange={(e) => setPasswordModal(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  value={passwordModal.confirmPassword}
                  onChange={(e) => setPasswordModal(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button
                onClick={closePasswordModal}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="px-4 py-2 rounded-lg bg-primary text-black hover:bg-primary/90 transition-colors font-semibold disabled:opacity-60"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </UserLayout>
  );
};

export default UserSettings;
