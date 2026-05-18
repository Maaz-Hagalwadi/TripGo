import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import OperatorLayout from '../../../shared/components/OperatorLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { changePassword, logoutAllSessions, uploadProfilePicture, updateCurrentUser } from '../../../api/userService';
import { getOperatorProfile, updateOperatorProfile } from '../../../api/operatorService';

const OperatorSettings = () => {
  const navigate = useNavigate();
  const { user, loading, logout, updateUser } = useAuth();
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const [editModal, setEditModal] = useState({ open: false, firstName: '', lastName: '', phone: '' });
  const [savingPersonal, setSavingPersonal] = useState(false);

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

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) { toast.error('Only JPG, PNG, WebP, or GIF allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be smaller than 5MB'); return; }
    setUploadingAvatar(true);
    const t = toast.loading('Uploading profile picture...');
    try {
      const result = await uploadProfilePicture(file);
      updateUser({ profilePictureUrl: result.profilePictureUrl });
      toast.success('Profile picture updated', { id: t });
    } catch (err) {
      toast.error(err.message || 'Failed to upload', { id: t });
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const openEditModal = () => {
    setEditModal({ open: true, firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  };

  const handleSavePersonal = async () => {
    if (!editModal.firstName.trim()) return toast.error('First name is required');
    setSavingPersonal(true);
    const t = toast.loading('Saving...');
    try {
      await updateCurrentUser({ firstName: editModal.firstName.trim(), lastName: editModal.lastName.trim(), phone: editModal.phone.trim() });
      updateUser({ firstName: editModal.firstName.trim(), lastName: editModal.lastName.trim(), phone: editModal.phone.trim() });
      toast.success('Profile updated', { id: t });
      setEditModal(p => ({ ...p, open: false }));
    } catch (e) {
      toast.error(e.message || 'Failed to update', { id: t });
    } finally {
      setSavingPersonal(false);
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

        {/* Personal Profile Card */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#002046] text-lg">person</span>
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Personal Profile</p>
                <p className="text-xs text-slate-400 mt-0.5">Your name, photo and contact details</p>
              </div>
            </div>
            <button onClick={openEditModal} className="flex items-center gap-1.5 rounded-xl bg-[#002046] text-white px-4 py-2 text-sm font-semibold hover:bg-[#003a80] transition-colors">
              <span className="material-symbols-outlined text-base">edit</span>
              Edit
            </button>
          </div>
          <div className="p-5">
            <div className="flex items-center gap-4 mb-5">
              <div className="relative flex-shrink-0">
                {user?.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover ring-2 ring-slate-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#002046] flex items-center justify-center ring-2 ring-slate-200">
                    <span className="text-2xl font-black text-white select-none">{(user?.firstName?.[0] || 'O').toUpperCase()}</span>
                  </div>
                )}
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white ring-2 ring-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50 disabled:opacity-60">
                  {uploadingAvatar
                    ? <div className="w-3 h-3 rounded-full border border-[#002046]/20 border-t-[#002046] animate-spin" />
                    : <span className="material-symbols-outlined text-slate-600" style={{ fontSize: '14px' }}>photo_camera</span>}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div>
                <p className="text-base font-black text-slate-900">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Operator'}</p>
                <p className="text-sm text-slate-500 mt-0.5">{user?.email || ''}</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                  className="mt-2 text-xs font-semibold text-[#002046] hover:underline disabled:opacity-60">
                  {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Full Name', value: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || '--', icon: 'person' },
                { label: 'Email', value: user?.email || '--', icon: 'mail' },
                { label: 'Phone', value: user?.phone || '--', icon: 'phone' },
                { label: 'Role', value: 'OPERATOR', icon: 'badge' },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-slate-50 ring-1 ring-slate-200/80 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#002046]/[0.07] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-sm text-[#002046]">{f.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{f.label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Edit Personal Profile Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-xl font-black text-slate-900">Edit Profile</h2>
              <button onClick={() => setEditModal(p => ({ ...p, open: false }))} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name *</label>
                  <input type="text" value={editModal.firstName} onChange={e => setEditModal(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name</label>
                  <input type="text" value={editModal.lastName} onChange={e => setEditModal(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                <input type="tel" value={editModal.phone} onChange={e => setEditModal(p => ({ ...p, phone: e.target.value }))} placeholder="Phone number" className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                <input type="email" value={user?.email || ''} disabled className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-400 outline-none ring-1 ring-slate-200 cursor-not-allowed" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditModal(p => ({ ...p, open: false }))} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
              <button onClick={handleSavePersonal} disabled={savingPersonal} className="flex-1 rounded-2xl bg-[#002046] px-4 py-3 text-sm font-bold text-white hover:bg-[#003a80] disabled:opacity-60">
                {savingPersonal ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
