import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import UserSidebar from '../../features/home/components/UserSidebar';
import OperatorHeader from './layout/OperatorHeader';

const MOBILE_NAV = [
  { id: 'dashboard', icon: 'dashboard',           label: 'Home',     route: ROUTES.DASHBOARD },
  { id: 'search',    icon: 'search',              label: 'Search',   route: ROUTES.SEARCH_RESULTS },
  { id: 'bookings',  icon: 'confirmation_number', label: 'Bookings', route: ROUTES.USER_BOOKINGS },
  { id: 'ratings',   icon: 'star',                label: 'Ratings',  route: ROUTES.USER_PROFILE },
];

const UserLayout = ({ activeItem = 'dashboard', title = 'Dashboard', showHeaderTitle = true, showHeaderSearch = true, children }) => {
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900">
      {/* Full-width sticky header */}
      <OperatorHeader
        title={title}
        showTitle={showHeaderTitle}
        showSearch={showHeaderSearch}
        searchPlaceholder="Search routes, cities, or bookings..."
        roleLabel="Traveler"
      />

      {/* Fixed sidebar — desktop only */}
      <UserSidebar
        activeItem={activeItem}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      {/* Main content */}
      <main className={`flex-1 overflow-y-auto transition-all duration-200 px-4 pt-4 pb-20 md:pb-0 lg:px-6 lg:pt-6 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="grid grid-cols-4 h-16">
          {MOBILE_NAV.map(item => (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${activeItem === item.id ? 'text-[#002046]' : 'text-slate-400'}`}
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
