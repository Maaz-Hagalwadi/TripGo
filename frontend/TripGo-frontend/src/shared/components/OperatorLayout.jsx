import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OperatorSidebar from '../../features/operator/components/OperatorSidebar';
import OperatorHeader from './layout/OperatorHeader';
import { ROUTES } from '../constants/routes';

const MOBILE_NAV = [
  { id: 'overview',  icon: 'dashboard',           label: 'Overview',  route: ROUTES.OPERATOR_DASHBOARD },
  { id: 'my-buses',  icon: 'directions_bus',      label: 'Buses',     route: ROUTES.OPERATOR_MY_BUSES },
  { id: 'add-bus',   icon: 'add_circle',          label: 'Add Bus',   route: ROUTES.OPERATOR_ADD_BUS },
  { id: 'schedules', icon: 'calendar_month',      label: 'Schedules', route: ROUTES.OPERATOR_SCHEDULES },
  { id: 'bookings',  icon: 'confirmation_number', label: 'Bookings',  route: ROUTES.OPERATOR_BOOKINGS },
];

const OperatorLayout = ({ activeItem, title, searchPlaceholder, headerChildren, children }) => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900">
      <OperatorHeader title={title} searchPlaceholder={searchPlaceholder}>
        {headerChildren}
      </OperatorHeader>

      <OperatorSidebar
        activeItem={activeItem}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      <main className={`flex-1 overflow-y-auto transition-all duration-200 p-4 lg:p-6 pb-20 md:pb-6 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {children}
      </main>

      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 md:hidden">
        <div className="grid grid-cols-5 h-14">
          {MOBILE_NAV.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              className={`flex flex-col items-center justify-center gap-0.5 py-1 transition-colors ${activeItem === item.id ? 'text-[#002046]' : 'text-slate-400'}`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default OperatorLayout;
