import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import UserLayout from '../../../shared/components/UserLayout';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { ROUTES } from '../../../shared/constants/routes';
import { STRIPE_PUBLISHABLE_KEY } from '../../../config/env';
import { changePassword, updateCurrentUser, uploadProfilePicture } from '../../../api/userService';
import {
  getSavedPassengerProfiles,
  createSavedPassengerProfile,
  updateSavedPassengerProfile,
  deleteSavedPassengerProfile,
} from '../../../api/bookingService';

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
const SAVED_CARDS_KEY = 'tripgo_saved_cards';
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

const BRAND_STYLES = {
  visa:       { label: 'VISA',  bg: 'from-[#1a1f71] to-[#0f5298]' },
  mastercard: { label: 'MC',    bg: 'from-orange-600 to-red-600' },
  amex:       { label: 'AMEX', bg: 'from-teal-700 to-teal-500' },
  discover:   { label: 'DISC', bg: 'from-orange-400 to-yellow-400' },
};
const getBrand = (brand) => BRAND_STYLES[brand?.toLowerCase()] || { label: (brand || 'CARD').toUpperCase().slice(0, 4), bg: 'from-slate-700 to-slate-500' };

const CARD_ELEMENT_OPTS = {
  style: { base: { fontSize: '14px', color: '#0f172a', '::placeholder': { color: '#94a3b8' } } },
  hidePostalCode: true,
};

const AddCardForm = ({ cardholderName, setCardholderName, onSaved, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [cardError, setCardError] = useState('');

  const handleSave = async () => {
    if (!stripe || !elements) return;
    if (!cardholderName.trim()) { setCardError('Cardholder name is required'); return; }
    setSaving(true);
    setCardError('');
    const cardEl = elements.getElement(CardElement);
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardEl,
      billing_details: { name: cardholderName.trim() },
    });
    if (error) { setCardError(error.message); setSaving(false); return; }
    onSaved({
      id: paymentMethod.id,
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      exp_month: paymentMethod.card.exp_month,
      exp_year: paymentMethod.card.exp_year,
      name: cardholderName.trim(),
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Cardholder Name *</label>
        <input
          value={cardholderName}
          onChange={e => setCardholderName(e.target.value)}
          placeholder="Name on card"
          className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Card Details *</label>
        <div className="rounded-2xl bg-slate-50 px-4 py-3.5 ring-1 ring-slate-200 focus-within:ring-2 focus-within:ring-[#002046]/40 transition-shadow">
          <CardElement options={CARD_ELEMENT_OPTS} />
        </div>
      </div>
      {cardError && <p className="text-xs text-rose-500">{cardError}</p>}
      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving || !stripe} className="flex-1 rounded-2xl bg-[#002046] px-4 py-3 text-sm font-bold text-white hover:bg-[#003a80] transition-colors disabled:opacity-60">
          {saving ? 'Saving card...' : 'Save Card'}
        </button>
      </div>
    </div>
  );
};

const TABS = [
  { id: 'passengers', label: 'Saved Passengers', icon: 'group' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'cards', label: 'Payment Cards', icon: 'credit_card' },
];

const UserSettings = () => {
  const navigate = useNavigate();
  const { user, loading, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('notifications');

  const [savedCards, setSavedCards] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_CARDS_KEY) || '[]'); } catch { return []; }
  });
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [cardholderName, setCardholderName] = useState('');

  const [passwordModal, setPasswordModal] = useState({ open: false, oldPassword: '', newPassword: '', confirmPassword: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  const [editModal, setEditModal] = useState({ open: false, firstName: '', lastName: '', phone: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const [notifPrefs, setNotifPrefs] = useState(loadNotifPrefs);

  const EMPTY_PROFILE_FORM = { firstName: '', lastName: '', age: '', gender: '', phone: '' };
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [profileFormOpen, setProfileFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE_FORM);
  const [savingProfileEntry, setSavingProfileEntry] = useState(false);
  const [deletingProfileId, setDeletingProfileId] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => {
    getSavedPassengerProfiles().then(setSavedProfiles).catch(() => {});
  }, []);

  const openAddProfile = () => {
    setEditingProfile(null);
    setProfileForm(EMPTY_PROFILE_FORM);
    setProfileFormOpen(true);
  };

  const openEditProfile = (p) => {
    setEditingProfile(p);
    setProfileForm({ firstName: p.firstName, lastName: p.lastName || '', age: p.age ?? '', gender: p.gender || '', phone: p.phone || '' });
    setProfileFormOpen(true);
  };

  const handleSaveProfileEntry = async () => {
    if (!profileForm.firstName.trim()) return toast.error('First name is required');
    setSavingProfileEntry(true);
    const t = toast.loading(editingProfile ? 'Updating profile...' : 'Saving profile...');
    try {
      const payload = { ...profileForm, age: profileForm.age ? Number(profileForm.age) : null };
      if (editingProfile) {
        const updated = await updateSavedPassengerProfile(editingProfile.id, payload);
        setSavedProfiles((prev) => prev.map((p) => p.id === editingProfile.id ? updated : p));
      } else {
        const created = await createSavedPassengerProfile(payload);
        setSavedProfiles((prev) => [created, ...prev]);
      }
      toast.success(editingProfile ? 'Profile updated' : 'Profile saved', { id: t });
      setProfileFormOpen(false);
    } catch (e) {
      toast.error(e.message || 'Failed to save profile', { id: t });
    } finally {
      setSavingProfileEntry(false);
    }
  };

  const handleDeleteProfile = async (id) => {
    setDeletingProfileId(id);
    try {
      await deleteSavedPassengerProfile(id);
      setSavedProfiles((prev) => prev.filter((p) => p.id !== id));
      toast.success('Profile removed');
    } catch (e) {
      toast.error(e.message || 'Failed to delete profile');
    } finally {
      setDeletingProfileId(null);
    }
  };

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

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, WebP, or GIF images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB');
      return;
    }

    setUploadingAvatar(true);
    const t = toast.loading('Uploading profile picture...');
    try {
      const result = await uploadProfilePicture(file);
      updateUser({ profilePictureUrl: result.profilePictureUrl });
      toast.success('Profile picture updated', { id: t });
    } catch (err) {
      toast.error(err.message || 'Failed to upload profile picture', { id: t });
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
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

  const handleCardSaved = (card) => {
    const updated = [card, ...savedCards];
    setSavedCards(updated);
    localStorage.setItem(SAVED_CARDS_KEY, JSON.stringify(updated));
    setAddCardOpen(false);
    setCardholderName('');
    toast.success('Card saved successfully');
  };

  const handleDeleteCard = (id) => {
    const updated = savedCards.filter(c => c.id !== id);
    setSavedCards(updated);
    localStorage.setItem(SAVED_CARDS_KEY, JSON.stringify(updated));
    toast.success('Card removed');
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
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative flex-shrink-0">
                {user?.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt={fullName}
                    className="w-20 h-20 rounded-full object-cover ring-2 ring-slate-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-[#002046] flex items-center justify-center ring-2 ring-slate-200">
                    <span className="text-2xl font-black text-white select-none">
                      {(user?.firstName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white ring-2 ring-slate-200 flex items-center justify-center shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-60"
                >
                  {uploadingAvatar ? (
                    <div className="w-3 h-3 rounded-full border border-[#002046]/20 border-t-[#002046] animate-spin" />
                  ) : (
                    <span className="material-symbols-outlined text-slate-600" style={{ fontSize: '14px' }}>photo_camera</span>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <p className="text-base font-black text-slate-900">{fullName}</p>
                <p className="text-sm text-slate-500 mt-0.5">{user?.email || ''}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="mt-2 text-xs font-semibold text-[#002046] hover:underline disabled:opacity-60"
                >
                  {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                </button>
              </div>
            </div>

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

        {/* Tab selector */}
        <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-1 p-1.5 border-b border-slate-100">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-[#002046] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-base">{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Saved Passengers panel */}
          {activeTab === 'passengers' && (
            <div>
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <p className="text-xs text-slate-500">Saved traveler details auto-fill during booking</p>
                <button
                  onClick={openAddProfile}
                  className="flex items-center gap-1.5 rounded-xl bg-[#002046] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#003a80] transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Add
                </button>
              </div>
              {savedProfiles.length === 0 ? (
                <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-slate-400">group</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">No saved passengers yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add a co-traveler to speed up future bookings</p>
                  </div>
                  <button onClick={openAddProfile} className="mt-1 text-sm font-semibold text-[#002046] hover:underline">
                    + Add your first passenger
                  </button>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                  {savedProfiles.map((p) => {
                    const initials = [(p.firstName?.[0] || ''), (p.lastName?.[0] || '')].join('').toUpperCase() || 'P';
                    const genderColor = p.gender === 'Female' ? 'bg-pink-100 text-pink-700' : p.gender === 'Male' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600';
                    return (
                      <div key={p.id} className="group relative rounded-2xl ring-1 ring-slate-200 bg-slate-50 p-4 flex items-start gap-3 hover:ring-[#002046]/30 hover:bg-white transition-all">
                        <div className="w-11 h-11 rounded-xl bg-[#002046] flex items-center justify-center flex-shrink-0 shadow-sm">
                          <span className="text-sm font-black text-white select-none">{initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{p.firstName} {p.lastName}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {p.gender && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${genderColor}`}>{p.gender}</span>}
                            {p.age && <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{p.age} yrs</span>}
                            {p.phone && <span className="text-[10px] text-slate-400 truncate">{p.phone}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <button onClick={() => openEditProfile(p)} className="w-7 h-7 rounded-lg bg-white ring-1 ring-slate-200 text-slate-500 flex items-center justify-center hover:text-[#002046] hover:ring-[#002046]/30 transition-colors shadow-sm">
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
                          </button>
                          <button onClick={() => handleDeleteProfile(p.id)} disabled={deletingProfileId === p.id} className="w-7 h-7 rounded-lg bg-white ring-1 ring-slate-200 text-slate-400 flex items-center justify-center hover:text-rose-500 hover:ring-rose-200 hover:bg-rose-50 transition-colors shadow-sm disabled:opacity-50">
                            {deletingProfileId === p.id
                              ? <div className="w-3 h-3 rounded-full border border-rose-300 border-t-rose-500 animate-spin" />
                              : <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                            }
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Notifications panel */}
          {activeTab === 'notifications' && (
            <div className="divide-y divide-slate-100">
              {notifItems.map((item) => (
                <div key={item.key} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-2.5">
                    <span className={`text-[10px] font-bold ${notifPrefs[item.key] ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {notifPrefs[item.key] ? 'On' : 'Off'}
                    </span>
                    <Toggle checked={notifPrefs[item.key]} onChange={(val) => updateNotif(item.key, val)} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payment Cards panel */}
          {activeTab === 'cards' && (
            <div>
              <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                <p className="text-xs text-slate-500">Saved cards appear at checkout for one-click payment</p>
                {!addCardOpen && stripePromise && (
                  <button
                    onClick={() => setAddCardOpen(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-[#002046] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#003a80] transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Add Card
                  </button>
                )}
              </div>

              {/* Add card form — inside Elements wrapper */}
              {addCardOpen && stripePromise && (
                <div className="px-5 py-5 border-b border-slate-100 bg-slate-50/40">
                  <p className="text-sm font-bold text-slate-900 mb-4">Add new card</p>
                  <Elements stripe={stripePromise}>
                    <AddCardForm
                      cardholderName={cardholderName}
                      setCardholderName={setCardholderName}
                      onSaved={handleCardSaved}
                      onCancel={() => { setAddCardOpen(false); setCardholderName(''); }}
                    />
                  </Elements>
                </div>
              )}

              {!addCardOpen && savedCards.length === 0 && (
                <div className="px-5 py-12 flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl text-slate-400">credit_card_off</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">No saved cards yet</p>
                    <p className="text-xs text-slate-400 mt-1">Add a card to pay faster at checkout</p>
                  </div>
                  {stripePromise && (
                    <button onClick={() => setAddCardOpen(true)} className="mt-1 text-sm font-semibold text-[#002046] hover:underline">
                      + Add your first card
                    </button>
                  )}
                </div>
              )}

              {savedCards.length > 0 && (
                <div className="p-4 space-y-3">
                  {savedCards.map(card => {
                    const brand = getBrand(card.brand);
                    const expiry = `${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year).slice(-2)}`;
                    return (
                      <div key={card.id} className="group flex items-center gap-4 rounded-2xl ring-1 ring-slate-200 p-4 bg-white hover:ring-[#002046]/30 transition-all">
                        {/* Card visual */}
                        <div className={`w-14 h-10 rounded-xl bg-gradient-to-br ${brand.bg} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <span className="text-[10px] font-black text-white tracking-wider">{brand.label}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900">•••• •••• •••• {card.last4}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{card.name} · Expires {expiry}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteCard(card.id)}
                          className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Add / Edit Passenger Profile Modal */}
      {profileFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl ring-1 ring-slate-200/70">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#002046]/60">Passenger</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">{editingProfile ? 'Edit Profile' : 'New Profile'}</h2>
              </div>
              <button onClick={() => setProfileFormOpen(false)} className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">First Name *</label>
                  <input type="text" value={profileForm.firstName} onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name" className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Last Name</label>
                  <input type="text" value={profileForm.lastName} onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Age</label>
                  <input type="number" min="1" max="120" value={profileForm.age} onChange={(e) => setProfileForm((p) => ({ ...p, age: e.target.value }))} placeholder="Enter your age" className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Gender</label>
                  <select value={profileForm.gender} onChange={(e) => setProfileForm((p) => ({ ...p, gender: e.target.value }))} className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40">
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Phone</label>
                <input type="tel" value={profileForm.phone} onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Enter phone number" className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#002046]/40" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setProfileFormOpen(false)} className="flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200">Cancel</button>
              <button onClick={handleSaveProfileEntry} disabled={savingProfileEntry} className="flex-1 rounded-2xl bg-[#002046] px-4 py-3 text-sm font-bold text-white hover:bg-[#003a80] disabled:opacity-60">
                {savingProfileEntry ? 'Saving...' : editingProfile ? 'Save Changes' : 'Save Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  placeholder="Enter phone number"
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
