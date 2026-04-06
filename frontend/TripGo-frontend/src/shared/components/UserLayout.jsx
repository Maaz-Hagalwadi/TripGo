import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import UserSidebar from '../../features/home/components/UserSidebar';
import OperatorHeader from './layout/OperatorHeader';

const MOBILE_NAV = [
  { id: 'dashboard', icon: 'dashboard', label: 'Home', route: ROUTES.DASHBOARD },
  { id: 'search', icon: 'search', label: 'Search', route: ROUTES.SEARCH_RESULTS },
  { id: 'bookings', icon: 'confirmation_number', label: 'Bookings', route: ROUTES.USER_BOOKINGS },
  { id: 'ratings', icon: 'star', label: 'Ratings', route: ROUTES.USER_PROFILE },
];

const UserLayout = ({ activeItem = 'dashboard', title = 'Dashboard', children }) => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="bg-background-light dark:bg-op-bg text-slate-900 dark:text-slate-100 min-h-screen flex">
      <div className="operator-sidebar">
        <UserSidebar
          activeItem={activeItem}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        />
      </div>

      <main className={`operator-main flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <OperatorHeader
          title={title}
          searchPlaceholder="Search routes, cities, or bookings..."
          roleLabel="Traveler"
        />

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>

      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 bg-white dark:bg-op-card border-t border-slate-200 dark:border-slate-800 z-50 lg:hidden">
        <div className="grid grid-cols-4 h-16">
          {MOBILE_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeItem === item.id ? 'text-primary' : 'text-slate-400'}`}
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

export default UserLayout;
