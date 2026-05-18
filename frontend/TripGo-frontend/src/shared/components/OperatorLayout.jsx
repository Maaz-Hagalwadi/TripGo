import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OperatorSidebar from '../../features/operator/components/OperatorSidebar';
import OperatorHeader from './layout/OperatorHeader';
import { ROUTES } from '../constants/routes';
import TripGoIcon from '../../assets/icons/TripGoIcon';

const MAIN_NAV = [
  { id: 'overview',  icon: 'dashboard',              label: 'Overview',  route: ROUTES.OPERATOR_DASHBOARD },
  { id: 'my-buses',  icon: 'directions_bus',         label: 'My Buses',  route: ROUTES.OPERATOR_MY_BUSES },
  { id: 'add-bus',   icon: 'add_circle',             label: 'Add Bus',   route: ROUTES.OPERATOR_ADD_BUS },
  { id: 'schedules', icon: 'calendar_month',         label: 'Schedules', route: ROUTES.OPERATOR_SCHEDULES },
  { id: 'policies',  icon: 'gavel',                  label: 'Policies',  route: ROUTES.OPERATOR_POLICIES },
  { id: 'bookings',  icon: 'confirmation_number',    label: 'Bookings',  route: ROUTES.OPERATOR_BOOKINGS },
  { id: 'reviews',   icon: 'star_rate',              label: 'Reviews',   route: ROUTES.OPERATOR_REVIEWS },
  { id: 'drivers',   icon: 'badge',                  label: 'Drivers',   route: ROUTES.OPERATOR_DRIVERS },
  { id: 'earnings',  icon: 'account_balance_wallet', label: 'Earnings',  route: ROUTES.OPERATOR_EARNINGS },
];

const BOTTOM_NAV = [
  { id: 'settings', icon: 'settings',      label: 'Settings', route: ROUTES.OPERATOR_SETTINGS },
  { id: 'support',  icon: 'support_agent', label: 'Support',  route: ROUTES.OPERATOR_SUPPORT },
];

const OperatorLayout = ({ activeItem, title, searchPlaceholder, headerChildren, children }) => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItemCls = (id) =>
    `w-full flex items-center gap-3 rounded-xl px-3 py-3 transition-colors ${
      activeItem === id
        ? 'bg-[#002046]/10 text-[#002046] border-l-[3px] border-[#002046] pl-[9px]'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`;

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900">
      <OperatorHeader
        title={title}
        searchPlaceholder={searchPlaceholder}
        onMenuToggle={() => setMobileOpen(p => !p)}
      >
        {headerChildren}
      </OperatorHeader>

      <OperatorSidebar
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
          </div>
        </aside>
      </div>

      <main className={`flex-1 overflow-y-auto transition-all duration-200 p-4 lg:p-6 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {children}
      </main>
    </div>
  );
};

export default OperatorLayout;
