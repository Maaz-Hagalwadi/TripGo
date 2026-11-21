import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import AdminLayout from '../shared/components/AdminLayout';
import { useAuth } from '../shared/contexts/AuthContext';
import { ROUTES } from '../shared/constants/routes';
import { changePassword, uploadProfilePicture, updateCurrentUser } from '../api/userService';
import { PASSWORD_RULES, isPasswordValid } from '../shared/utils/passwordRules';
import { Avatar, Card, PageHeader } from '../shared/components/console/ConsoleUI';

const INPUT = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-slate-50 disabled:text-slate-500';
const LABEL = 'mb-1.5 block text-xs font-bold text-slate-600';
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const EMPTY_PASSWORDS = { oldPassword: '', newPassword: '', confirmPassword: '' };

const AdminSettings = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ firstName: '', lastName: '', phone: '' });
  const [profileError, setProfileError] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [pw, setPw] = useState(EMPTY_PASSWORDS);
  const [pwOpen, setPwOpen] = useState(false);
  const [pwError, setPwError] = useState('');
  const [savingPw, setSavingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Admin';
  // Older API responses don't include hasPassword — assume a password account then
  const hasPassword = user?.hasPassword !== false;

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!IMAGE_TYPES.includes(file.type)) return toast.error('Use a JPG, PNG, WebP or GIF image');
    if (file.size > 5 * 1024 * 1024) return toast.error('The image must be smaller than 5 MB');
    setUploading(true);
    try {
      const result = await uploadProfilePicture(file);
      updateUser({ profilePictureUrl: result.profilePictureUrl });
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.message || 'Couldn’t upload the photo');
    } finally {
      setUploading(false);
    }
  };

  const startEdit = () => {
    setProfile({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
    setProfileError('');
    setEditing(true);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    const next = { firstName: profile.firstName.trim(), lastName: profile.lastName.trim(), phone: profile.phone.trim() };
    if (!next.firstName) return setProfileError('First name is required');
    if (next.phone && !/^\d{10}$/.test(next.phone)) return setProfileError('Enter a 10-digit mobile number, or leave it empty');
    setSavingProfile(true);
    try {
      await updateCurrentUser(next);
      updateUser(next);
      toast.success('Profile updated');
      setEditing(false);
    } catch (err) {
      setProfileError(err.message || 'Couldn’t save your profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    // Passwords are sent exactly as typed — spaces are never trimmed
    if (!pw.oldPassword) return setPwError('Enter your current password');
    if (!isPasswordValid(pw.newPassword)) return setPwError('Your new password doesn’t meet all the requirements');
    if (pw.newPassword === pw.oldPassword) return setPwError('Choose a password different from your current one');
    if (pw.newPassword !== pw.confirmPassword) return setPwError('The new passwords don’t match');
    setSavingPw(true);
    try {
      await changePassword(pw.oldPassword, pw.newPassword);
      toast.success('Password changed');
      setPw(EMPTY_PASSWORDS);
      setPwOpen(false);
    } catch (err) {
      setPwError(err.message || 'Couldn’t change your password');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <AdminLayout activeItemOverride="settings" title="Settings">
      <div className="space-y-5">
        <PageHeader title="Settings" subtitle="Your admin profile and sign-in security" />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] xl:items-start">
          <Card title="Profile" icon="badge" action={!editing && (
            <button onClick={startEdit} className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-[#FF8A65]">
              <span className="material-symbols-outlined text-[18px]">edit</span>Edit
            </button>
          )}>
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar name={fullName} src={user?.profilePictureUrl} size="w-20 h-20 text-xl" />
                  <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} aria-label="Change profile photo"
                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:border-[#FF8A65] disabled:opacity-60">
                    {uploading
                      ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
                      : <span className="material-symbols-outlined text-[16px] text-slate-600">photo_camera</span>}
                  </button>
                  <input ref={fileInputRef} type="file" accept={IMAGE_TYPES.join(',')} className="hidden" onChange={onAvatar} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black text-slate-900 truncate">{fullName}</p>
                  <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                  <span className="mt-1.5 inline-flex rounded-full bg-[#FDBA74]/25 px-2.5 py-0.5 text-[11px] font-bold text-orange-700">Administrator</span>
                </div>
              </div>

              {editing ? (
                <form onSubmit={saveProfile} className="mt-6 space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL} htmlFor="first">First name</label>
                      <input id="first" className={INPUT} value={profile.firstName} autoComplete="given-name" onChange={(e) => { setProfile((p) => ({ ...p, firstName: e.target.value })); setProfileError(''); }} />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="last">Last name</label>
                      <input id="last" className={INPUT} value={profile.lastName} autoComplete="family-name" onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL} htmlFor="phone">Mobile number</label>
                      <input id="phone" className={INPUT} value={profile.phone} inputMode="numeric" autoComplete="tel-national"
                        onChange={(e) => { setProfile((p) => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })); setProfileError(''); }} placeholder="10-digit mobile" />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="email">Email <span className="font-normal text-slate-400">can’t be changed</span></label>
                      <input id="email" className={INPUT} value={user?.email || ''} disabled />
                    </div>
                  </div>
                  {profileError && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{profileError}</p>}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setEditing(false)} disabled={savingProfile} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                    <button type="submit" disabled={savingProfile} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-50">{savingProfile ? 'Saving…' : 'Save changes'}</button>
                  </div>
                </form>
              ) : (
                <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                  {[['Full name', fullName], ['Email', user?.email || '—'], ['Mobile number', user?.phone || 'Not added'], ['Role', 'Administrator']].map(([k, v]) => (
                    <div key={k} className="min-w-0">
                      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k}</dt>
                      <dd className="mt-0.5 text-sm font-semibold text-slate-900 truncate">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </Card>

          <div className="space-y-5">
            <Card title="Sign-in & security" icon="lock">
              <div className="p-5">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Sign-in method</p>
                    <p className="text-xs text-slate-500">{hasPassword ? 'Email and password' : 'Google account'}</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400">{hasPassword ? 'password' : 'account_circle'}</span>
                </div>

                {!hasPassword ? (
                  <p className="mt-4 text-sm text-slate-600">You sign in with Google, so there’s no TripGo password to change. Manage your password in your Google account.</p>
                ) : !pwOpen ? (
                  <button onClick={() => { setPwOpen(true); setPwError(''); }} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-[#FF8A65]">
                    <span className="material-symbols-outlined text-[18px]">key</span>Change password
                  </button>
                ) : (
                  <form onSubmit={savePassword} className="mt-4 space-y-3" noValidate>
                    {[['oldPassword', 'Current password', 'current-password'], ['newPassword', 'New password', 'new-password'], ['confirmPassword', 'Confirm new password', 'new-password']].map(([key, label, ac]) => (
                      <div key={key}>
                        <label className={LABEL} htmlFor={key}>{label}</label>
                        <input id={key} type={showPw ? 'text' : 'password'} autoComplete={ac} className={INPUT} value={pw[key]}
                          onChange={(e) => { setPw((p) => ({ ...p, [key]: e.target.value })); setPwError(''); }} />
                      </div>
                    ))}
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                      <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} className="accent-[#0B1F3A]" />Show passwords
                    </label>
                    {pw.newPassword && (
                      <ul className="grid gap-1 rounded-xl bg-slate-50 px-4 py-3 sm:grid-cols-2">
                        {PASSWORD_RULES.map((rule) => {
                          const ok = rule.test(pw.newPassword);
                          return (
                            <li key={rule.id} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-700' : 'text-slate-500'}`}>
                              <span className="material-symbols-outlined text-[16px]">{ok ? 'check_circle' : 'radio_button_unchecked'}</span>{rule.label}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {pwError && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{pwError}</p>}
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => { setPwOpen(false); setPw(EMPTY_PASSWORDS); }} disabled={savingPw} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
                      <button type="submit" disabled={savingPw} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-[#102A4C] disabled:opacity-50">{savingPw ? 'Saving…' : 'Update password'}</button>
                    </div>
                  </form>
                )}
              </div>
            </Card>

            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div>
                  <p className="font-bold text-slate-900">Sign out</p>
                  <p className="text-sm text-slate-500">End your session on this device.</p>
                </div>
                <button onClick={() => { logout(); navigate(ROUTES.LOGIN); }} className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50">
                  <span className="material-symbols-outlined text-[18px]">logout</span>Sign out
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
