import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
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
import { PASSWORD_RULES, isPasswordValid } from '../../../shared/utils/passwordRules';
import { WALLET_ENABLED, REFERRALS_ENABLED } from '../../../shared/constants/features';
import { getWallet, getMyReferral } from '../../../api/travellerFeaturesService';

const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;
// Saved cards live in this browser only (read by the checkout page via the same key)
const SAVED_CARDS_KEY = 'tripgo_saved_cards';

const EMPTY_PASSENGER = { firstName: '', lastName: '', age: '', gender: '', phone: '' };

const inputCls = (err) =>
  `w-full rounded-xl bg-slate-50 border px-4 py-3 text-sm text-slate-900 outline-none focus:bg-white focus:border-[#FF8A65] focus:ring-4 focus:ring-[#FDBA74]/25 transition-all ${err ? 'border-red-500' : 'border-slate-200'}`;
const primaryBtn = 'inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-60 transition-colors';
const secondaryBtn = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-[#FF8A65] hover:text-primary transition-colors';

const normalizePhone = (value) => {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length > 10 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length > 10 && digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, 10);
};

/** "phone: Phone must be exactly 10 digits" → "Phone must be exactly 10 digits" */
const cleanServerMessage = (msg = '') => msg.replace(/^\w+:\s*/, '');

const BRAND_STYLES = {
  visa: { label: 'VISA', bg: 'from-[#1a1f71] to-[#0f5298]' },
  mastercard: { label: 'MC', bg: 'from-orange-600 to-red-600' },
  amex: { label: 'AMEX', bg: 'from-teal-700 to-teal-500' },
  discover: { label: 'DISC', bg: 'from-orange-400 to-yellow-400' },
};
const getBrand = (brand) => BRAND_STYLES[brand?.toLowerCase()] || { label: (brand || 'CARD').toUpperCase().slice(0, 4), bg: 'from-slate-700 to-slate-500' };

const Section = ({ icon, title, subtitle, action, children }) => (
  <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl bg-[#FDBA74]/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-[18px] text-orange-600">{icon}</span>
        </span>
        <div>
          <h2 className="text-base font-black text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Modal = ({ eyebrow, title, onClose, children, footer }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
      <div className="flex items-start justify-between gap-4 p-6 pb-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-orange-600">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">{title}</h2>
        </div>
        <button onClick={onClose} aria-label="Close" className="rounded-xl bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className="px-6 overflow-y-auto">{children}</div>
      <div className="flex gap-3 p-6 pt-5">{footer}</div>
    </div>
  </div>
);

const Field = ({ id, label, error, hint, children }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-semibold text-slate-900 mb-1.5">{label}</label>
    {children}
    {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
  </div>
);

const AddCardForm = ({ onSaved, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [cardError, setCardError] = useState('');

  const handleSave = async () => {
    if (!stripe || !elements) return;
    if (!name.trim()) { setCardError('Enter the name on the card'); return; }
    setSaving(true);
    setCardError('');
    const { paymentMethod, error } = await stripe.createPaymentMethod({
      type: 'card',
      card: elements.getElement(CardElement),
      billing_details: { name: name.trim() },
    });
    setSaving(false);
    if (error) { setCardError(error.message); return; }
    onSaved({
      id: paymentMethod.id,
      brand: paymentMethod.card.brand,
      last4: paymentMethod.card.last4,
      exp_month: paymentMethod.card.exp_month,
      exp_year: paymentMethod.card.exp_year,
      name: name.trim(),
    });
  };

  return (
    <div className="space-y-4">
      <Field id="card-name" label="Name on card">
        <input id="card-name" autoComplete="cc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="As printed on the card" className={inputCls()} />
      </Field>
      <div>
        <p className="block text-sm font-semibold text-slate-900 mb-1.5">Card details</p>
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3.5 focus-within:bg-white focus-within:border-[#FF8A65] transition-colors">
          <CardElement options={{ hidePostalCode: true, style: { base: { fontSize: '14px', color: '#0f172a', '::placeholder': { color: '#94a3b8' } } } }} />
        </div>
      </div>
      {cardError && <p className="text-xs text-red-600">{cardError}</p>}
      <div className="flex gap-3">
        <button onClick={onCancel} className={`${secondaryBtn} flex-1`}>Cancel</button>
        <button onClick={handleSave} disabled={saving || !stripe} className={`${primaryBtn} flex-1`}>{saving ? 'Saving...' : 'Save card'}</button>
      </div>
    </div>
  );
};

const UserSettings = () => {
  const navigate = useNavigate();
  const { user, loading, logout, updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const [editModal, setEditModal] = useState(null); // { firstName, lastName, phone, errors }
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [passwordModal, setPasswordModal] = useState(null); // { oldPassword, newPassword, confirmPassword, show, error }
  const [changingPassword, setChangingPassword] = useState(false);

  const [passengers, setPassengers] = useState([]);
  const [passengerForm, setPassengerForm] = useState(null); // { id?, ...fields, errors }
  const [savingPassenger, setSavingPassenger] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [savedCards, setSavedCards] = useState(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_CARDS_KEY) || '[]'); } catch { return []; }
  });
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [referral, setReferral] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== 'USER') navigate(ROUTES.HOME);
  }, [user, loading, navigate]);

  useEffect(() => {
    getSavedPassengerProfiles().then((d) => setPassengers(Array.isArray(d) ? d : [])).catch(() => {});
    if (WALLET_ENABLED) getWallet().then(setWallet).catch(() => setWallet(null));
    if (REFERRALS_ENABLED) getMyReferral().then(setReferral).catch(() => setReferral(null));
  }, []);

  const shareReferral = async () => {
    const link = `${window.location.origin}${ROUTES.REGISTER}?ref=${encodeURIComponent(referral.code)}`;
    const text = `Book bus tickets on TripGo with my code ${referral.code}${referral.friendRewardText ? ` — ${referral.friendRewardText}` : ''}: ${link}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Join me on TripGo', text, url: link }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); toast.success('Invite copied — paste it into WhatsApp or a message.'); } catch { toast.error('Couldn’t copy the invite.'); }
  };

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Traveller';
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'T';
  // Older API responses don't include hasPassword — assume a password account then
  const hasPassword = user?.hasPassword !== false;

  // ── Profile ──
  const handleSaveProfile = async () => {
    const firstName = editModal.firstName.trim();
    const lastName = editModal.lastName.trim();
    const phone = editModal.phone;
    const errors = {};
    if (!firstName) errors.firstName = 'First name is required';
    if (phone && phone.length !== 10) errors.phone = 'Enter a 10-digit mobile number';
    if (Object.keys(errors).length) return setEditModal((m) => ({ ...m, errors }));

    setSavingProfile(true);
    try {
      await updateCurrentUser({ firstName, lastName, phone: phone || null });
      updateUser({ firstName, lastName, name: `${firstName} ${lastName}`.trim(), phone });
      toast.success('Profile updated');
      setEditModal(null);
    } catch (e) {
      const msg = cleanServerMessage(e.message);
      if (/phone/i.test(msg)) setEditModal((m) => ({ ...m, errors: { phone: /in use/i.test(msg) ? 'Another account already uses this number' : msg } }));
      else toast.error(msg || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Use a JPG, PNG, WebP or GIF image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5 MB');
      return;
    }
    setUploadingAvatar(true);
    try {
      const result = await uploadProfilePicture(file);
      updateUser({ profilePictureUrl: result.profilePictureUrl });
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // ── Password ──
  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordModal;
    let error = '';
    if (!oldPassword) error = 'Enter your current password';
    else if (!isPasswordValid(newPassword)) error = 'Your new password doesn’t meet all the requirements';
    else if (newPassword !== confirmPassword) error = 'New passwords don’t match';
    if (error) return setPasswordModal((m) => ({ ...m, error }));

    setChangingPassword(true);
    try {
      // Passwords are sent exactly as typed — no trimming
      await changePassword(oldPassword, newPassword);
      // The backend signs out every session after a password change, including this one
      toast.success('Password changed. Please sign in with your new password.');
      setPasswordModal(null);
      logout();
      navigate(ROUTES.LOGIN, { replace: true });
    } catch (e) {
      setPasswordModal((m) => ({ ...m, error: cleanServerMessage(e.message) || 'Failed to change password' }));
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Saved travellers ──
  const handleSavePassenger = async () => {
    const f = passengerForm;
    const errors = {};
    if (!f.firstName.trim()) errors.firstName = 'First name is required';
    if (f.age !== '' && (Number(f.age) < 1 || Number(f.age) > 120)) errors.age = 'Enter an age between 1 and 120';
    if (f.phone && f.phone.length !== 10) errors.phone = 'Enter a 10-digit mobile number';
    if (Object.keys(errors).length) return setPassengerForm((p) => ({ ...p, errors }));

    setSavingPassenger(true);
    try {
      const payload = {
        firstName: f.firstName.trim(), lastName: f.lastName.trim(),
        age: f.age !== '' ? Number(f.age) : null, gender: f.gender, phone: f.phone,
      };
      if (f.id) {
        const updated = await updateSavedPassengerProfile(f.id, payload);
        setPassengers((prev) => prev.map((p) => (p.id === f.id ? updated : p)));
      } else {
        const created = await createSavedPassengerProfile(payload);
        setPassengers((prev) => [created, ...prev]);
      }
      toast.success(f.id ? 'Traveller updated' : 'Traveller saved');
      setPassengerForm(null);
    } catch (e) {
      toast.error(cleanServerMessage(e.message) || 'Failed to save traveller');
    } finally {
      setSavingPassenger(false);
    }
  };

  const handleDeletePassenger = async (p) => {
    if (!window.confirm(`Remove ${p.firstName} from your saved travellers?`)) return;
    setDeletingId(p.id);
    try {
      await deleteSavedPassengerProfile(p.id);
      setPassengers((prev) => prev.filter((x) => x.id !== p.id));
      toast.success('Traveller removed');
    } catch (e) {
      toast.error(e.message || 'Failed to remove traveller');
    } finally {
      setDeletingId(null);
    }
  };

  // ── Cards ──
  const persistCards = (cards) => {
    setSavedCards(cards);
    try { localStorage.setItem(SAVED_CARDS_KEY, JSON.stringify(cards)); } catch { /* storage unavailable */ }
  };

  const passwordStarted = Boolean(passwordModal?.newPassword);

  return (
    <UserLayout activeItem="settings" title="Settings" showHeaderTitle={false} showHeaderSearch={false}>
      <div className="space-y-6">

        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Your profile, sign-in and booking preferences.</p>
        </div>

        {/* ── Profile ── */}
        <section className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="relative bg-primary px-5 pt-5 pb-12">
            <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-[#FF8A65]/20 blur-3xl" aria-hidden="true" />
            <p className="relative text-xs font-bold uppercase tracking-widest text-[#FDBA74]">Your profile</p>
          </div>
          <div className="px-5 pb-5">
            {/* Only the avatar overlaps the navy band; name and actions sit below it */}
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="relative w-20 h-20 flex-shrink-0 -mt-10">
                {user?.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="" className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-md" />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FDBA74] to-[#FF8A65] ring-4 ring-white shadow-md flex items-center justify-center">
                    <span className="text-2xl font-black text-primary select-none">{initials}</span>
                  </div>
                )}
                <button
                  type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingAvatar}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center hover:border-[#FF8A65] disabled:opacity-60"
                >
                  {uploadingAvatar
                    ? <span className="w-3.5 h-3.5 rounded-full border-2 border-slate-200 border-t-[#FF8A65] animate-spin" />
                    : <span className="material-symbols-outlined text-[16px] text-slate-600">photo_camera</span>}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-black text-slate-900 truncate">{fullName}</p>
                <p className="text-sm text-slate-500 truncate">{user?.email}</p>
              </div>
              <button onClick={() => setEditModal({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: normalizePhone(user?.phone), errors: {} })} className={secondaryBtn}>
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Edit profile
              </button>
            </div>

            <dl className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { icon: 'mail', label: 'Email', value: user?.email || '—', badge: user?.emailVerified ? 'Verified' : 'Not verified', ok: user?.emailVerified },
                { icon: 'call', label: 'Mobile', value: user?.phone || 'Not added' },
                { icon: 'login', label: 'Sign-in method', value: hasPassword ? 'Email & password' : 'Google' },
              ].map((f) => (
                <div key={f.label} className="rounded-xl bg-slate-50 border border-slate-100 p-4 min-w-0">
                  <dt className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <span className="material-symbols-outlined text-[14px]">{f.icon}</span>{f.label}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-900 truncate">{f.value}</dd>
                  {f.badge && (
                    <span className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${f.ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      <span className="material-symbols-outlined text-[13px]">{f.ok ? 'verified' : 'error'}</span>{f.badge}
                    </span>
                  )}
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── Security ── */}
        <Section icon="lock" title="Sign-in & security" subtitle="Manage how you sign in to TripGo">
          <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {hasPassword ? (
              <>
                <div>
                  <p className="text-sm font-bold text-slate-900">Password</p>
                  <p className="text-xs text-slate-500">Changing it signs you out on all devices, including this one.</p>
                </div>
                <button onClick={() => setPasswordModal({ oldPassword: '', newPassword: '', confirmPassword: '', show: false, error: '' })} className={secondaryBtn}>
                  <span className="material-symbols-outlined text-[18px]">key</span>
                  Change password
                </button>
              </>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-900">You sign in with Google</p>
                <p className="text-xs text-slate-500">Your account doesn’t use a TripGo password — manage sign-in security from your Google account.</p>
              </div>
            )}
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Sign out</p>
              <p className="text-xs text-slate-500">Sign out of TripGo on this device.</p>
            </div>
            <button onClick={() => { logout(); navigate(ROUTES.LOGIN); }} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
              <span className="material-symbols-outlined text-[18px]">logout</span>
              Sign out
            </button>
          </div>
        </Section>

        {/* ── TripGo credit (spec §7) ── */}
        {WALLET_ENABLED && wallet && (
          <Section icon="account_balance_wallet" title="TripGo credit" subtitle="Instant refunds and rewards — use them on your next booking">
            <div className="p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-3xl font-black text-slate-900">₹{Math.round(Number(wallet.balance || 0)).toLocaleString('en-IN')}</p>
                <p className="text-xs text-slate-500">Available balance</p>
              </div>
              <button onClick={() => navigate(ROUTES.SEARCH_RESULTS)} className={secondaryBtn}>
                <span className="material-symbols-outlined text-[18px]">search</span>Use on a booking
              </button>
            </div>
            {Array.isArray(wallet.transactions) && wallet.transactions.length > 0 && (
              <ul className="border-t border-slate-100 divide-y divide-slate-100">
                {wallet.transactions.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{t.description}</p>
                      <p className="text-xs text-slate-400">{t.createdAt ? new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</p>
                    </div>
                    <span className={`font-black ${Number(t.amount) >= 0 ? 'text-green-700' : 'text-slate-900'}`}>
                      {Number(t.amount) >= 0 ? '+' : '−'}₹{Math.abs(Math.round(Number(t.amount))).toLocaleString('en-IN')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        {/* ── Invite friends (spec §8) ── */}
        {REFERRALS_ENABLED && referral?.code && (
          <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white">
            <div className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-[#FF8A65]/20 blur-3xl" aria-hidden="true" />
            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div>
                <p className="text-sm font-semibold text-[#FDBA74]">Invite friends</p>
                <h2 className="text-xl font-black mt-0.5">{referral.rewardText || 'You both get rewarded when a friend books their first trip'}</h2>
                <p className="text-sm text-slate-300 mt-1">
                  {Number(referral.successfulReferrals || 0)} friend{Number(referral.successfulReferrals || 0) !== 1 ? 's' : ''} joined
                  {referral.totalEarned ? ` · ₹${Math.round(Number(referral.totalEarned)).toLocaleString('en-IN')} earned` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-xl border-2 border-dashed border-[#FDBA74]/60 bg-white/5 px-4 py-2.5 font-mono font-black tracking-[0.2em]">{referral.code}</span>
                <button onClick={shareReferral} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#FDBA74] to-[#FF8A65] px-4 py-2.5 text-sm font-extrabold text-primary hover:brightness-105">
                  <span className="material-symbols-outlined text-[18px]">share</span>Invite
                </button>
              </div>
            </div>
          </section>
        )}

        {/* ── Saved travellers ── */}
        <Section
          icon="group" title="Saved travellers" subtitle="Fill in passenger details in one tap when you book"
          action={<button onClick={() => setPassengerForm({ ...EMPTY_PASSENGER, errors: {} })} className={primaryBtn}><span className="material-symbols-outlined text-[18px]">add</span>Add traveller</button>}
        >
          {passengers.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">No saved travellers yet</p>
              <p className="text-xs text-slate-400 mt-1">Add family or friends you often travel with.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {passengers.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="w-10 h-10 flex-shrink-0 rounded-xl bg-primary text-white text-sm font-black flex items-center justify-center">
                    {[(p.firstName?.[0] || ''), (p.lastName?.[0] || '')].join('').toUpperCase() || 'P'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-slate-500 truncate">{[p.gender, p.age ? `${p.age} yrs` : null, p.phone].filter(Boolean).join(' · ') || 'No other details'}</p>
                  </div>
                  <button onClick={() => setPassengerForm({ id: p.id, firstName: p.firstName || '', lastName: p.lastName || '', age: p.age ?? '', gender: p.gender || '', phone: normalizePhone(p.phone), errors: {} })}
                    aria-label={`Edit ${p.firstName}`} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-500 hover:border-[#FF8A65] hover:text-primary flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button onClick={() => handleDeletePassenger(p)} disabled={deletingId === p.id}
                    aria-label={`Remove ${p.firstName}`} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors disabled:opacity-50">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* ── Payment cards ── */}
        <Section
          icon="credit_card" title="Payment cards" subtitle="Cards are saved on this device only and handled securely by Stripe"
          action={!addCardOpen && stripePromise && <button onClick={() => setAddCardOpen(true)} className={secondaryBtn}><span className="material-symbols-outlined text-[18px]">add</span>Add card</button>}
        >
          {addCardOpen && stripePromise && (
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
              <Elements stripe={stripePromise}>
                <AddCardForm
                  onSaved={(card) => { persistCards([card, ...savedCards]); setAddCardOpen(false); toast.success('Card saved on this device'); }}
                  onCancel={() => setAddCardOpen(false)}
                />
              </Elements>
            </div>
          )}
          {savedCards.length === 0 && !addCardOpen ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-semibold text-slate-700">No saved cards</p>
              <p className="text-xs text-slate-400 mt-1">You can always pay with a new card at checkout.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {savedCards.map((card) => {
                const brand = getBrand(card.brand);
                return (
                  <li key={card.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className={`w-12 h-8 flex-shrink-0 rounded-lg bg-gradient-to-br ${brand.bg} flex items-center justify-center text-[10px] font-black text-white`}>{brand.label}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900">•••• {card.last4}</p>
                      <p className="text-xs text-slate-500 truncate">{card.name} · Expires {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}</p>
                    </div>
                    <button onClick={() => { persistCards(savedCards.filter((c) => c.id !== card.id)); toast.success('Card removed'); }}
                      aria-label={`Remove card ending ${card.last4}`} className="w-9 h-9 rounded-xl border border-slate-200 text-slate-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        {/* ── Notifications ── */}
        <Section icon="notifications" title="Notifications" subtitle="What we send you">
          <ul className="divide-y divide-slate-100">
            {[
              { icon: 'confirmation_number', title: 'Booking confirmations', sub: 'Your ticket details after every booking' },
              { icon: 'alarm', title: 'Trip reminders', sub: 'A reminder before your bus departs' },
              { icon: 'currency_exchange', title: 'Changes, cancellations & refunds', sub: 'Date changes, cancellations and refund updates' },
            ].map((n) => (
              <li key={n.title} className="flex items-center gap-3 px-5 py-3.5">
                <span className="material-symbols-outlined text-[20px] text-slate-400">{n.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.sub}</p>
                </div>
                <span className="text-xs font-bold text-green-700 bg-green-50 rounded-full px-2.5 py-1">Email · In app</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3 px-5 py-3.5 border-t border-slate-100 bg-slate-50/60">
            <span className="material-symbols-outlined text-[20px] text-slate-400">chat</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Tickets on WhatsApp &amp; SMS</p>
              <p className="text-xs text-slate-500">Get your ticket and trip updates on your phone</p>
            </div>
            <span className="text-xs font-bold text-orange-700 bg-[#FDBA74]/20 rounded-full px-2.5 py-1">Coming soon</span>
          </div>
          <p className="px-5 py-3 border-t border-slate-100 text-xs text-slate-400">
            These are essential messages about your trips. We don’t send marketing emails.
          </p>
        </Section>

        {/* ── App & language ── */}
        <Section icon="language" title="App & language">
          <ul className="divide-y divide-slate-100">
            {[
              { icon: 'translate', title: 'Language', sub: 'English · हिंदी and more Indian languages' },
              { icon: 'install_mobile', title: 'Install the TripGo app', sub: 'Add TripGo to your home screen and open tickets offline' },
            ].map((item) => (
              <li key={item.title} className="flex items-center gap-3 px-5 py-3.5">
                <span className="material-symbols-outlined text-[20px] text-slate-400">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.sub}</p>
                </div>
                <span className="text-xs font-bold text-orange-700 bg-[#FDBA74]/20 rounded-full px-2.5 py-1">Coming soon</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* ── Edit profile ── */}
      {editModal && (
        <Modal eyebrow="Profile" title="Edit profile" onClose={() => setEditModal(null)}
          footer={<>
            <button onClick={() => setEditModal(null)} className={`${secondaryBtn} flex-1`}>Cancel</button>
            <button onClick={handleSaveProfile} disabled={savingProfile} className={`${primaryBtn} flex-1`}>{savingProfile ? 'Saving...' : 'Save changes'}</button>
          </>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field id="edit-first" label="First name" error={editModal.errors.firstName}>
                <input id="edit-first" autoComplete="given-name" value={editModal.firstName} onChange={(e) => setEditModal((m) => ({ ...m, firstName: e.target.value, errors: { ...m.errors, firstName: '' } }))} className={inputCls(editModal.errors.firstName)} />
              </Field>
              <Field id="edit-last" label="Last name">
                <input id="edit-last" autoComplete="family-name" value={editModal.lastName} onChange={(e) => setEditModal((m) => ({ ...m, lastName: e.target.value }))} className={inputCls()} />
              </Field>
            </div>
            <Field id="edit-phone" label="Mobile number" error={editModal.errors.phone}>
              <input id="edit-phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="10-digit mobile" value={editModal.phone}
                onChange={(e) => setEditModal((m) => ({ ...m, phone: normalizePhone(e.target.value), errors: { ...m.errors, phone: '' } }))} className={inputCls(editModal.errors.phone)} />
            </Field>
            <Field id="edit-email" label="Email" hint="Your email address can’t be changed.">
              <input id="edit-email" value={user?.email || ''} disabled className="w-full rounded-xl bg-slate-100 border border-slate-200 px-4 py-3 text-sm text-slate-400 cursor-not-allowed" />
            </Field>
          </div>
        </Modal>
      )}

      {/* ── Change password ── */}
      {passwordModal && (
        <Modal eyebrow="Security" title="Change password" onClose={() => setPasswordModal(null)}
          footer={<>
            <button onClick={() => setPasswordModal(null)} className={`${secondaryBtn} flex-1`}>Cancel</button>
            <button onClick={handleChangePassword} disabled={changingPassword} className={`${primaryBtn} flex-1`}>{changingPassword ? 'Changing...' : 'Change password'}</button>
          </>}>
          <div className="space-y-4">
            {passwordModal.error && (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                <span className="material-symbols-outlined text-[18px]">error</span>{passwordModal.error}
              </p>
            )}
            {[
              { key: 'oldPassword', label: 'Current password', auto: 'current-password' },
              { key: 'newPassword', label: 'New password', auto: 'new-password' },
              { key: 'confirmPassword', label: 'Confirm new password', auto: 'new-password' },
            ].map((f) => (
              <Field key={f.key} id={`pw-${f.key}`} label={f.label}>
                <input id={`pw-${f.key}`} type={passwordModal.show ? 'text' : 'password'} autoComplete={f.auto} value={passwordModal[f.key]}
                  onChange={(e) => setPasswordModal((m) => ({ ...m, [f.key]: e.target.value, error: '' }))} className={inputCls()} />
              </Field>
            ))}
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
              {PASSWORD_RULES.map((rule) => {
                const ok = passwordStarted && rule.test(passwordModal.newPassword);
                return (
                  <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-700' : 'text-slate-500'}`}>
                    <span className="material-symbols-outlined text-[15px]" style={ok ? { fontVariationSettings: "'FILL' 1" } : undefined}>{ok ? 'check_circle' : 'radio_button_unchecked'}</span>
                    {rule.label}
                  </li>
                );
              })}
            </ul>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={passwordModal.show} onChange={(e) => setPasswordModal((m) => ({ ...m, show: e.target.checked }))} className="rounded border-slate-300 text-primary focus:ring-[#FDBA74]" />
              Show passwords
            </label>
          </div>
        </Modal>
      )}

      {/* ── Add / edit traveller ── */}
      {passengerForm && (
        <Modal eyebrow="Saved traveller" title={passengerForm.id ? 'Edit traveller' : 'Add traveller'} onClose={() => setPassengerForm(null)}
          footer={<>
            <button onClick={() => setPassengerForm(null)} className={`${secondaryBtn} flex-1`}>Cancel</button>
            <button onClick={handleSavePassenger} disabled={savingPassenger} className={`${primaryBtn} flex-1`}>{savingPassenger ? 'Saving...' : 'Save traveller'}</button>
          </>}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field id="tr-first" label="First name" error={passengerForm.errors.firstName}>
                <input id="tr-first" value={passengerForm.firstName} onChange={(e) => setPassengerForm((p) => ({ ...p, firstName: e.target.value, errors: { ...p.errors, firstName: '' } }))} className={inputCls(passengerForm.errors.firstName)} />
              </Field>
              <Field id="tr-last" label="Last name">
                <input id="tr-last" value={passengerForm.lastName} onChange={(e) => setPassengerForm((p) => ({ ...p, lastName: e.target.value }))} className={inputCls()} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field id="tr-age" label="Age" error={passengerForm.errors.age}>
                <input id="tr-age" type="number" inputMode="numeric" min="1" max="120" value={passengerForm.age} onChange={(e) => setPassengerForm((p) => ({ ...p, age: e.target.value, errors: { ...p.errors, age: '' } }))} className={inputCls(passengerForm.errors.age)} />
              </Field>
              <Field id="tr-gender" label="Gender">
                <select id="tr-gender" value={passengerForm.gender} onChange={(e) => setPassengerForm((p) => ({ ...p, gender: e.target.value }))} className={inputCls()}>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
            </div>
            <Field id="tr-phone" label="Mobile number (optional)" error={passengerForm.errors.phone}>
              <input id="tr-phone" type="tel" inputMode="numeric" placeholder="10-digit mobile" value={passengerForm.phone}
                onChange={(e) => setPassengerForm((p) => ({ ...p, phone: normalizePhone(e.target.value), errors: { ...p.errors, phone: '' } }))} className={inputCls(passengerForm.errors.phone)} />
            </Field>
          </div>
        </Modal>
      )}
    </UserLayout>
  );
};

export default UserSettings;
