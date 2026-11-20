import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { USER_NAV_SECTIONS } from './userNav';

export const NavItem = ({ item, active, open, onClick, badge }) => (
  <button
    onClick={onClick}
    title={!open ? item.label : undefined}
    aria-current={active ? 'page' : undefined}
    className={`relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${!open ? 'justify-center' : ''} ${
      active ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <span
      className={`material-symbols-outlined text-[20px] flex-shrink-0 ${active ? 'text-[#FDBA74]' : ''}`}
      style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
    >
      {item.icon}
    </span>
    {open && <span className="whitespace-nowrap">{item.label}</span>}
    {badge > 0 && (open ? (
      <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-black ${active ? 'bg-[#FDBA74] text-primary' : 'bg-[#FDBA74]/30 text-orange-700'}`}>{badge}</span>
    ) : (
      <span className="absolute right-3 top-2 w-2 h-2 rounded-full bg-[#FF8A65] ring-2 ring-white" aria-label={`${badge} pending`} />
    ))}
  </button>
);

const UserSidebar = ({ activeItem = 'dashboard', collapsed = true, onToggleCollapse, sections = USER_NAV_SECTIONS, badges = {} }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isHovered, setIsHovered] = useState(false);

  // Visually open when pinned open, or when collapsed but hovered
  const open = !collapsed || isHovered;
  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('').toUpperCase() || 'T';

  return (
    <aside
      className={`fixed top-16 left-0 z-40 h-[calc(100vh-4rem)] bg-white border-r border-slate-200 flex-col transition-all duration-200 overflow-hidden hidden md:flex ${
        open ? 'w-64' : 'w-20'
      } ${isHovered && collapsed ? 'shadow-xl z-50' : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto overflow-x-hidden" aria-label="Main">
        {sections.map((section) => (
          <div key={section.title}>
            {open ? (
              <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">{section.title}</p>
            ) : (
              <div className="mx-3 mb-2 border-t border-slate-100" aria-hidden="true" />
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={item.id} item={item} open={open} active={activeItem === item.id} badge={badges[item.id]} onClick={() => navigate(item.route)} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Signed-in user + collapse */}
      <div className="border-t border-slate-100 p-3 space-y-2">
        <div className={`flex items-center gap-3 rounded-xl ${open ? 'bg-slate-50 p-2.5' : 'justify-center'}`}>
          {user?.profilePictureUrl ? (
            <img src={user.profilePictureUrl} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
          ) : (
            <span className="w-9 h-9 flex-shrink-0 rounded-full bg-gradient-to-br from-[#FDBA74] to-[#FF8A65] text-primary text-xs font-black flex items-center justify-center">
              {initials}
            </span>
          )}
          {open && (
            <>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { logout(); navigate(ROUTES.LOGIN); }}
                title="Sign out"
                aria-label="Sign out"
                className="w-8 h-8 flex-shrink-0 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
              </button>
            </>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Keep sidebar open' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Keep sidebar open' : 'Collapse sidebar'}
          className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors ${!open ? 'justify-center' : ''}`}
        >
          <span className="material-symbols-outlined text-[18px]">{collapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'}</span>
          {open && <span>{collapsed ? 'Keep open' : 'Collapse'}</span>}
        </button>
      </div>
    </aside>
  );
};

export default UserSidebar;
