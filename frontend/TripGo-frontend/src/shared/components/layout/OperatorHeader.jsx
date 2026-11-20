import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import useClickOutside from '../../hooks/useClickOutside';
import { updateCurrentUser } from '../../../api/userService';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationBell from '../NotificationBell';
import TripGoIcon from '../../../assets/icons/TripGoIcon';

const ROLE_LABELS = { ROLE_ADMIN: 'Admin', ROLE_OPERATOR: 'Operator', ROLE_USER: 'Traveller', ADMIN: 'Admin', OPERATOR: 'Operator', USER: 'Traveller' };

const getRoleLabel = (user) => ROLE_LABELS[user?.role] || ROLE_LABELS[user?.roles?.[0]] || '';

const getInitials = (user) => [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

const Avatar = ({ user, size }) => (
  user?.profilePictureUrl ? (
    <img src={user.profilePictureUrl} alt="" className={`${size} rounded-full object-cover`} />
  ) : (
    <span className={`${size} rounded-full bg-gradient-to-br from-[#FDBA74] to-[#FF8A65] text-primary font-black flex items-center justify-center select-none`}>
      {getInitials(user)}
    </span>
  )
);

const ProfileModal = ({ user, onClose, onNameUpdate }) => {
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [saving, setSaving] = useState(false);
  useClickOutside(ref, onClose);

  const handleSave = async () => {
    try {
      setSaving(true);
      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();
      const response = await updateCurrentUser({ firstName: trimmedFirstName, lastName: trimmedLastName });
      onNameUpdate?.({
        firstName: response?.firstName || trimmedFirstName,
        lastName: response?.lastName || trimmedLastName,
        name: [response?.firstName || trimmedFirstName, response?.lastName || trimmedLastName].filter(Boolean).join(' '),
      });
      toast.success('Name updated successfully!');
      setEditing(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update name');
    } finally {
      setSaving(false);
    }
  };
  return (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div ref={ref} className="bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl">
      <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
        <h3 className="font-bold text-lg">My Profile</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <span className="material-symbols-outlined text-slate-500">close</span>
        </button>
      </div>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="w-16 h-16 text-xl shrink-0" />
          <div className="min-w-0">
            <p className="font-black text-lg text-slate-900 dark:text-white truncate">{user?.firstName} {user?.lastName}</p>
            {getRoleLabel(user) && (
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full bg-[#FDBA74]/20 text-orange-700 text-xs font-bold">
                {getRoleLabel(user)}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {[
            { icon: 'mail',  label: 'Email', value: user?.email, badge: user?.emailVerified ? 'Verified' : 'Not verified', ok: user?.emailVerified },
            { icon: 'call',  label: 'Phone', value: user?.phone || 'Not added' },
          ].map(({ icon, label, value, badge, ok }) => (
            <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-semibold truncate">{value}</p>
              </div>
              {badge && (
                <span className={`flex-shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${ok ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  <span className="material-symbols-outlined text-[13px]">{ok ? 'verified' : 'error'}</span>{badge}
                </span>
              )}
            </div>
          ))}
        </div>

        {editing ? (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">First Name</p>
                <input value={firstName} onChange={e => setFirstName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-400 mb-1">Last Name</p>
                <input value={lastName} onChange={e => setLastName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-bold hover:bg-[#102A4C] transition-all disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">edit</span>
            Edit name
          </button>
        )}
      </div>
    </div>
  </div>
  );
};

const OperatorHeader = ({
  title,
  searchPlaceholder = '',
  roleLabel = 'Fleet Manager',
  profileRoute = null,
  settingsRoute = null,
  showTitle = true,
  showSearch = true,
  onMenuToggle,
  children
}) => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  useClickOutside(profileRef, () => setShowProfileDropdown(false));

  return (
    <>
    <header className="sticky top-0 z-50 h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-op-bg flex items-center justify-between px-4 lg:px-8 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">menu</span>
          </button>
        )}
        <button className="flex items-center gap-2 group flex-shrink-0" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-xl bg-[#002046] flex items-center justify-center shadow-sm group-hover:bg-[#001533] transition-colors">
            <TripGoIcon className="w-5 h-4 text-white" />
          </div>
          <span className="text-base font-black text-[#002046] tracking-tight">TripGo</span>
        </button>
        {showTitle && title ? (
          <>
            <div className="w-px h-5 bg-slate-200 hidden md:block" />
            <h2 className="hidden md:block text-sm font-semibold text-slate-500 capitalize">{title}</h2>
          </>
        ) : null}
        {children}
      </div>

      <div className="flex items-center gap-6">
        <NotificationBell />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Profile */}
        <div className="flex items-center gap-3 pl-6 border-l border-slate-200 dark:border-slate-800 relative" ref={profileRef}>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
          <button
            onClick={() => setShowProfileDropdown(p => !p)}
            aria-label="Account menu"
            aria-expanded={showProfileDropdown}
            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-transparent hover:ring-[#FDBA74] transition-shadow"
          >
            <Avatar user={user} size="w-10 h-10 text-sm" />
          </button>
          {showProfileDropdown && (
            <div className="absolute right-0 top-12 w-64 bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Avatar user={user} size="w-12 h-12 text-base flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{user?.firstName} {user?.lastName}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="py-2">
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    if (profileRoute) {
                      navigate(profileRoute);
                      return;
                    }
                    setShowProfile(true);
                  }}
                  className="w-full px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                >
                  <span className="material-symbols-outlined text-lg">person</span>
                  My Profile
                </button>
                <button
                  onClick={() => { setShowProfileDropdown(false); navigate(settingsRoute || ROUTES.OPERATOR_SETTINGS); }}
                  className="w-full px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-3"
                >
                  <span className="material-symbols-outlined text-lg">settings</span>
                  Settings
                </button>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-800 p-2">
                <button
                  onClick={async () => { await logout(); navigate('/'); }}
                  className="w-full px-4 py-3 text-left text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-3 rounded-lg"
                >
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
    {showProfile && !profileRoute && <ProfileModal user={user} onClose={() => setShowProfile(false)} onNameUpdate={updateUser} />}
    </>
  );
};

export default OperatorHeader;
