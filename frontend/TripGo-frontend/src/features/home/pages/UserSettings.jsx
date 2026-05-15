import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { changePassword, updateCurrentUser } from '../../../api/userService';

const NOTIF_KEY = 'tripgo_notif_prefs';
const DEFAULT_NOTIFS = {
  bookingConfirmation: true,
  tripReminder: true,
  cancellationUpdates: true,
  promotionalOffers: false,
  ratingReminders: true,
};

const loadNotifPrefs = () => {
  try {
    const stored = localStorage.getItem(NOTIF_KEY);
    return stored ? { ...DEFAULT_NOTIFS, ...JSON.parse(stored) } : DEFAULT_NOTIFS;
  } catch {
    return DEFAULT_NOTIFS;
  }
};

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${checked ? 'bg-[#002046]' : 'bg-slate-200'}`}
  >
    <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const UserSettings = () => {
  const navigate = useNavigate();
  const { user, loading, logout, updateUser } = useAuth();

  const [passwordModal, setPasswordModal] = useState({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const [editModal, setEditModal] = useState({ open: false, firstName: '', lastName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [notifPrefs, setNotifPrefs] = useState(loadNotifPrefs);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  const openEditModal = () => {
    const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || '';
    const parts = fullName.split(' ');
    setEditModal({
      open: true,
      firstName: parts[0] || '',
      lastName: parts.slice(1).join(' ') || '',
      phone: user?.phone || '',
    });
  };

  const handleSaveProfile = async () => {
    const firstName = editModal.firstName.trim();
    const lastName = editModal.lastName.trim();
    const phone = editModal.phone.trim();
    if (!firstName) return toast.error('First name is required');

    setSavingProfile(true);
    const t = toast.loading('Saving profile...');
    try {
      await updateCurrentUser({ firstName, lastName, phone });
      updateUser({ firstName, lastName, name: `${firstName} ${lastName}`.trim(), phone });
      toast.success('Profile updated', { id: t });
      setEditModal((p) => ({ ...p, open: false }));
    } catch (e) {
      toast.error(e.message || 'Failed to update profile', { id: t });
    } finally {
      setSavingProfile(false);
    }
  };

  const closePasswordModal = () =>
    setPasswordModal({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' });

  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordModal;
    if (!oldPassword.trim()) return toast.error('Current password is required');
    if (!newPassword.trim() || newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

    setChangingPassword(true);
    const t = toast.loading('Changing password...');
    try {
      await changePassword(oldPassword.trim(), newPassword.trim());
      toast.success('Password changed successfully', { id: t });
      closePasswordModal();
    } catch (e) {
      toast.error(e.message || 'Failed to change password', { id: t });
    } finally {
      setChangingPassword(false);
    }
  };

  const updateNotif = (key, value) => {
    setNotifPrefs((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
    toast.success(value ? 'Notification enabled' : 'Notification disabled');
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Traveler';

  const notifItems = [
    { key: 'bookingConfirmation', label: 'Booking Confirmations', desc: 'Get notified when a booking is confirmed or payment received' },
    { key: 'tripReminder', label: 'Trip Reminders', desc: 'Receive reminders 24 hours before your departure' },
    { key: 'cancellationUpdates', label: 'Cancellation Updates', desc: 'Alerts when a booking is cancelled or refund is processed' },
    { key: 'ratingReminders', label: 'Rating Reminders', desc: 'Prompted to rate a trip after it completes' },
    { key: 'promotionalOffers', label: 'Promotional Offers', desc: 'Discounts, deals, and seasonal promotions from TripGo' },
  ];

  return (
    <UserLayout activeItem="settings" title="Settings">
      <div className="space-y-5">

        <div>
          <h1 className="text-2xl font-black text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your profile, security, and notification preferences</p>
        </div>

        {/* Profile & Account */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Profile & Account</h2>
              <p className="text-xs text-slate-500 mt-0.5">Your personal details and account security</p>
            </div>
            <button
              onClick={openEditModal}
              className="flex items-center gap-1.5 rounded-xl bg-[#002046] text-white px-4 py-2 text-sm font-semibold hover:bg-[#003a80] transition-colors"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              Edit Profile
            </button>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                { label: 'Full Name', value: fullName, icon: 'person' },
                { label: 'Email', value: user?.email || '--', icon: 'mail' },
                { label: 'Phone', value: user?.phone || '--', icon: 'phone' },
                { label: 'Account Role', value: user?.role || 'USER', icon: 'badge' },
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

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => navigate(ROUTES.USER_PROFILE)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-base">star</span>
                My Ratings
              </button>
              <button
                onClick={() => setPasswordModal((p) => ({ ...p, open: true }))}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-base">lock</span>
                Change Password
              </button>
              <button
                onClick={() => { logout(); navigate(ROUTES.LOGIN); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors ml-auto"
              >
                <span className="material-symbols-outlined text-base">logout</span>
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900">Notification Preferences</h2>
            <p className="text-xs text-slate-500 mt-0.5">Choose which email notifications you receive from TripGo</p>
          </div>
          <div className="divide-y divide-slate-100">
            {notifItems.map((item) => (
              <div key={item.key} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                </div>
                <Toggle checked={notifPrefs[item.key]} onChange={(val) => updateNotif(item.key, val)} />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Edit Profile Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#002046]/60">Account</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Edit Profile</h2>
              </div>
              <button onClick={() => setEditModal((p) => ({ ...p, open: false }))} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name *</label>
                  <input
                    type="text"
                    value={editModal.firstName}
                    onChange={(e) => setEditModal((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name</label>
                  <input
                    type="text"
                    value={editModal.lastName}
                    onChange={(e) => setEditModal((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  value={editModal.phone}
                  onChange={(e) => setEditModal((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-400 outline-none ring-1 ring-slate-200 cursor-not-allowed"
                />
                <p className="text-[10px] text-slate-400 mt-1 ml-1">Email cannot be changed</p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditModal((p) => ({ ...p, open: false }))} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex-1 color-white rounded-2xl bg-[#002046] px-4 py-3 text-sm font-bold text-white hover:bg-[#003a80] disabled:opacity-60 transition-colors"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#002046]/60">Security</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Change Password</h2>
              </div>
              <button onClick={closePasswordModal} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-3">
              {[
                { key: 'oldPassword', label: 'Current Password', placeholder: 'Enter current password' },
                { key: 'newPassword', label: 'New Password', placeholder: 'Min. 8 characters' },
                { key: 'confirmPassword', label: 'Confirm Password', placeholder: 'Repeat new password' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label} *</label>
                  <input
                    type="password"
                    value={passwordModal[f.key]}
                    onChange={(e) => setPasswordModal((p) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closePasswordModal} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="flex-1 rounded-2xl bg-[#002046] px-4 py-3 text-sm font-bold text-white hover:bg-[#003a80] disabled:opacity-60 transition-colors"
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
