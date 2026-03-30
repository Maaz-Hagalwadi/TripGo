import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OperatorSidebar from '../../features/operator/components/OperatorSidebar';
import OperatorHeader from './layout/OperatorHeader';
import { ROUTES } from '../constants/routes';

const MOBILE_NAV = [
  { icon: 'dashboard', label: 'Overview', route: ROUTES.OPERATOR_DASHBOARD },
  { icon: 'directions_bus', label: 'Buses', route: ROUTES.OPERATOR_MY_BUSES },
  { icon: 'add_circle', label: 'Add Bus', route: ROUTES.OPERATOR_ADD_BUS },
  { icon: 'calendar_month', label: 'Schedules', route: ROUTES.OPERATOR_SCHEDULES },
  { icon: 'confirmation_number', label: 'Bookings', route: null },
];

const OperatorLayout = ({ activeItem, title, searchPlaceholder, headerChildren, children }) => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="bg-background-light dark:bg-op-bg text-slate-900 dark:text-slate-100 min-h-screen flex">
      <div className="operator-sidebar">
        <OperatorSidebar
          activeItem={activeItem}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(p => !p)}
        />
      </div>

      <main className={`operator-main flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <OperatorHeader title={title} searchPlaceholder={searchPlaceholder}>
          {headerChildren}
        </OperatorHeader>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </div>
      </main>

      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 bg-white dark:bg-op-card border-t border-slate-200 dark:border-slate-800 z-50">
        <div className="grid grid-cols-5 h-16">
          {MOBILE_NAV.map((item) => (
            <button
              key={item.label}
              onClick={() => item.route && navigate(item.route)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                activeItem === item.label.toLowerCase().replace(' ', '-') ? 'text-primary' : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default OperatorLayout;
