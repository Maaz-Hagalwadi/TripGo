import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { changePassword, logoutAllSessions } from '../../../api/userService';
import { getOperatorProfile, updateOperatorProfile } from '../../../api/operatorService';
import './OperatorDashboard.css';

const OperatorSettings = () => {
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const [form, setForm] = useState({
    name: '',
    shortName: '',
    contactPhone: '',
    address: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [passwordModal, setPasswordModal] = useState({
    open: false,
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'OPERATOR') {
      navigate(ROUTES.HOME);
      return;
    }
    fetchProfile();
  }, [user, loading, navigate]);

  const fetchProfile = async () => {
    try {
      const profile = await getOperatorProfile();
      setForm({
        name: profile?.name || '',
        shortName: profile?.shortName || '',
        contactPhone: profile?.contactPhone || '',
        address: profile?.address || ''
      });
    } catch (e) {
      toast.error(e.message || 'Failed to load operator profile');
      // Keep settings page usable even if backend profile endpoint auth is not configured yet.
      setForm(prev => ({
        ...prev,
        name: prev.name || user?.firstName || '',
        contactPhone: prev.contactPhone || user?.phone || ''
      }));
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await updateOperatorProfile(form);
      toast.success('Operator profile updated');
    } catch (e) {
      toast.error(e.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const openPasswordModal = () => {
    setPasswordModal({
      open: true,
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const closePasswordModal = () => {
    setPasswordModal({
      open: false,
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
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
    if (!newPassword) {
      toast.error('New password is required');
      return;
    }
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      toast.error('Password must be at least 8 characters with letters, numbers, and symbols');
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

  const handleLogoutAllDevices = async () => {
    const loadingToast = toast.loading('Logging out...');
    try {
      await logoutAllSessions();
      toast.success('Logged out from current device', { id: loadingToast });
    } catch (e) {
      toast.error(e.message || 'Logout failed', { id: loadingToast });
    } finally {
      logout();
      navigate(ROUTES.LOGIN);
    }
  };

  return (
    <OperatorLayout activeItem="settings" title="Settings">
      <div className="space-y-6">
        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">Operator Profile</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Update your operator details shown across admin and booking flows.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Operator Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter operator name"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Short Name</label>
              <input
                type="text"
                value={form.shortName}
                onChange={(e) => setForm(prev => ({ ...prev, shortName: e.target.value }))}
                placeholder="Enter short name"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Contact Phone</label>
              <input
                type="text"
                value={form.contactPhone}
                onChange={(e) => setForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                placeholder="Enter contact phone"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter operator address"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="px-4 py-2 bg-primary text-black font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <h3 className="text-lg font-bold mb-1">Security</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Manage your account security actions.</p>
          <div className="flex gap-3">
            <button
              onClick={openPasswordModal}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Change Password
            </button>
            <button
              onClick={handleLogoutAllDevices}
              className="px-4 py-2 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Logout From All Devices
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
    </OperatorLayout>
  );
};

export default OperatorSettings;
