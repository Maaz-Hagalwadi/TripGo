import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';
import { changePassword, uploadProfilePicture, updateCurrentUser } from '../api/userService';

const INPUT_CLASS = 'w-full rounded-xl bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40 transition-all';

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, loading, logout, updateUser } = useAuth();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);
  const [editModal, setEditModal] = useState({ open: false, firstName: '', lastName: '', phone: '' });
  const [savingPersonal, setSavingPersonal] = useState(false);
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
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#002046]/[0.08] flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[#002046] text-lg">manage_accounts</span>
              </div>
              <p className="text-sm font-black text-slate-900">Admin Account</p>
            </div>
            <button onClick={openEditModal} className="flex items-center gap-1.5 rounded-xl bg-[#002046] text-white px-4 py-2 text-sm font-semibold hover:bg-[#003a80] transition-colors">
              <span className="material-symbols-outlined text-base">edit</span>
              Edit
            </button>
          </div>
          <div className="px-5 py-5">
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative flex-shrink-0">
                {user?.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="Profile" className="w-20 h-20 rounded-full object-cover ring-2 ring-slate-200" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#002046] flex items-center justify-center ring-2 ring-slate-200">
                    <span className="text-2xl font-black text-white select-none">{(user?.firstName?.[0] || 'A').toUpperCase()}</span>
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
                <p className="text-base font-black text-slate-900">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin'}</p>
                <p className="text-sm text-slate-500 mt-0.5">{user?.email || ''}</p>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                  className="mt-2 text-xs font-semibold text-[#002046] hover:underline disabled:opacity-60">
                  {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-5">
              {[
                { label: 'Full Name', value: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin', icon: 'person' },
                { label: 'Email', value: user?.email || '--', icon: 'mail' },
                { label: 'Phone', value: user?.phone || '--', icon: 'phone' },
                { label: 'Role', value: user?.role || 'ADMIN', icon: 'badge' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#002046]/[0.07] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-sm text-[#002046]">{icon}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setPasswordModal((prev) => ({ ...prev, open: true }))} className="rounded-xl bg-[#002046] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#003a80] transition-colors">
                Change Password
              </button>
              <button onClick={() => { logout(); navigate(ROUTES.LOGIN); }} className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-100 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
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
