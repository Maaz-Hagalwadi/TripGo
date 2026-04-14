import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import useClickOutside from '../../hooks/useClickOutside';
import { updateCurrentUser } from '../../../api/userService';
import ThemeToggle from '../ui/ThemeToggle';
import NotificationBell from '../NotificationBell';

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
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-3xl">person</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-lg">{user?.firstName} {user?.lastName}</p>
            </div>
            <span className="px-2 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-bold">
              {user?.roles?.[0]?.replace('ROLE_', '') || user?.role || 'ADMIN'}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          {[
            { icon: 'mail',          label: 'Email',    value: user?.email },
            { icon: 'phone',         label: 'Phone',    value: user?.phone || '—' },
            { icon: 'verified_user', label: 'Verified', value: user?.emailVerified ? 'Yes' : 'No' },
          ].map(({ icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="material-symbols-outlined text-slate-400 text-lg">{icon}</span>
              <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-sm font-semibold">{value}</p>
              </div>
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
                className="flex-1 py-2 rounded-xl bg-primary text-black text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-60">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">edit</span>
            Edit Name
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
  showTitle = true,
  showSearch = true,
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
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-op-bg flex items-center justify-between px-4 lg:px-8 shrink-0">
      <div className="flex items-center gap-4 flex-1">
        {showTitle && title ? <h2 className="text-lg font-semibold capitalize">{title}</h2> : null}
        
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
            className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">person</span>
          </button>
          {showProfileDropdown && (
            <div className="absolute right-0 top-12 w-64 bg-white dark:bg-op-card border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-600 dark:text-slate-300 text-xl">person</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{user?.firstName} {user?.lastName}</p>
                    <p className="text-slate-500 dark:text-slate-400 text-xs">{user?.email}</p>
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
