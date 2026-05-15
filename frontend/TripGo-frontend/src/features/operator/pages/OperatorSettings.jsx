import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { changePassword, logoutAllSessions } from '../../../api/userService';
import { getOperatorProfile, updateOperatorProfile } from '../../../api/operatorService';

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
      <div className="space-y-5">

        {/* Page Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage your operator profile and account security.</p>
          </div>
        </div>

        {/* Operator Profile Card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#002046] text-lg">business</span>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Operator Profile</p>
              <p className="text-xs text-slate-400 mt-0.5">Update your operator details shown across admin and booking flows.</p>
            </div>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Operator Name *</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">store</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter operator name"
                    className="w-full rounded-xl bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Short Name</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">label</span>
                  <input
                    type="text"
                    value={form.shortName}
                    onChange={(e) => setForm(prev => ({ ...prev, shortName: e.target.value }))}
                    placeholder="Enter short name"
                    className="w-full rounded-xl bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Contact Phone</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">phone</span>
                  <input
                    type="text"
                    value={form.contactPhone}
                    onChange={(e) => setForm(prev => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="Enter contact phone"
                    className="w-full rounded-xl bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 transition-all"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-3.5 text-slate-400 text-base pointer-events-none">location_on</span>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Enter operator address"
                    rows={3}
                    className="w-full rounded-xl bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="rounded-2xl bg-[#002046] text-white px-4 sm:px-5 py-2.5 text-sm font-bold hover:bg-[#003a80] transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
              >
                {savingProfile ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Security Card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#002046] text-lg">lock</span>
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">Security</p>
              <p className="text-xs text-slate-400 mt-0.5">Manage your account security actions.</p>
            </div>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={openPasswordModal}
                className="rounded-2xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">key</span>
                Change Password
              </button>
              <button
                onClick={handleLogoutAllDevices}
                className="rounded-2xl border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                Logout From All Devices
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {passwordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm sm:max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200/70 max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#002046] text-base">lock_reset</span>
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Change Password</p>
                  <p className="text-xs text-slate-400 mt-0.5">Enter your current and new password.</p>
                </div>
              </div>
              <button
                onClick={closePasswordModal}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-slate-500 text-base">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="overflow-y-auto flex-1 min-h-0 px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Current Password *</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">lock</span>
                  <input
                    type="password"
                    value={passwordModal.oldPassword}
                    onChange={(e) => setPasswordModal(prev => ({ ...prev, oldPassword: e.target.value }))}
                    placeholder="Enter current password"
                    className="w-full rounded-xl bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">New Password *</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">key</span>
                  <input
                    type="password"
                    value={passwordModal.newPassword}
                    onChange={(e) => setPasswordModal(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Enter new password"
                    className="w-full rounded-xl bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">Confirm Password *</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">check_circle</span>
                  <input
                    type="password"
                    value={passwordModal.confirmPassword}
                    onChange={(e) => setPasswordModal(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirm new password"
                    className="w-full rounded-xl bg-slate-50 pl-10 pr-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-5 py-3 border-t border-slate-100">
              <button
                onClick={closePasswordModal}
                className="flex-1 rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="flex-1 rounded-2xl bg-[#002046] py-2.5 text-sm font-bold text-white hover:bg-[#003a80] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {changingPassword ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#002046]/30 border-t-[#002046]" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </OperatorLayout>
  );
};

export default OperatorSettings;
