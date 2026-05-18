import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import UserSidebar from '../../features/home/components/UserSidebar';
import OperatorHeader from './layout/OperatorHeader';
import { useAuth } from '../contexts/AuthContext';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const MAIN_NAV = [
  { id: 'dashboard', icon: 'dashboard',           label: 'Overview',     route: ROUTES.DASHBOARD },
  { id: 'search',    icon: 'search',              label: 'Search Buses', route: ROUTES.SEARCH_RESULTS },
  { id: 'bookings',  icon: 'confirmation_number', label: 'My Bookings',  route: ROUTES.USER_BOOKINGS },
  { id: 'ratings',   icon: 'star',                label: 'Ratings',      route: ROUTES.USER_PROFILE },
];

const BOTTOM_NAV = [
  { id: 'settings', icon: 'settings',      label: 'Settings', route: ROUTES.USER_SETTINGS },
  { id: 'support',  icon: 'support_agent', label: 'Support',  route: ROUTES.USER_SUPPORT },
];

const UserLayout = ({ activeItem = 'dashboard', title = 'Dashboard', showHeaderTitle = true, showHeaderSearch = true, children }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItemCls = (id) =>
    `w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
      activeItem === id
        ? 'bg-[#002046]/10 text-[#002046] border-l-[3px] border-[#002046] pl-[9px]'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900">
      <OperatorHeader
        title={title}
        showTitle={showHeaderTitle}
        showSearch={showHeaderSearch}
        searchPlaceholder="Search routes, cities, or bookings..."
        roleLabel="Traveler"
        settingsRoute={ROUTES.USER_SETTINGS}
        onMenuToggle={() => setMobileOpen(p => !p)}
      />

      <UserSidebar
        activeItem={activeItem}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-50 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        <aside className={`absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#002046] flex items-center justify-center">
                <TripGoIcon className="w-5 h-4 text-white" />
              </div>
              <span className="font-black text-lg text-[#002046] tracking-tight">TripGo</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-slate-500">close</span>
            </button>
          </div>

          <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
            {MAIN_NAV.map(item => (
              <button
                key={item.id}
                onClick={() => { navigate(item.route); setMobileOpen(false); }}
                className={navItemCls(item.id)}
              >
                <span className="material-symbols-outlined text-xl flex-shrink-0">{item.icon}</span>
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="border-t border-slate-100 px-2 py-3 space-y-0.5">
            {BOTTOM_NAV.map(item => (
              <button
                key={item.id}
                onClick={() => { navigate(item.route); setMobileOpen(false); }}
                className={navItemCls(item.id)}
              >
                <span className="material-symbols-outlined text-xl flex-shrink-0">{item.icon}</span>
                <span className="font-medium text-sm">{item.label}</span>
              </button>
            ))}
            <button
              onClick={() => { logout(); navigate(ROUTES.LOGIN); }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-colors text-red-500 hover:bg-red-50"
            >
              <span className="material-symbols-outlined text-xl flex-shrink-0">logout</span>
              <span className="font-medium text-sm">Logout</span>
            </button>
          </div>
        </aside>
      </div>

      <main className={`flex-1 overflow-y-auto transition-all duration-200 px-4 pt-4 pb-4 lg:px-6 lg:pt-6 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {children}
      </main>
    </div>
  );
};

export default UserLayout;
