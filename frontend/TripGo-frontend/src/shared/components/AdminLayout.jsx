import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import AdminSidebar from '../../features/admin/components/AdminSidebar';
import OperatorHeader from '../../shared/components/layout/OperatorHeader';
import { ROUTES } from '../constants/routes';

const MOBILE_NAV = [
  { id: 'overview',   icon: 'dashboard',      label: 'Overview',  route: ROUTES.ADMIN_DASHBOARD },
  { id: 'operators',  icon: 'business',       label: 'Operators', route: `${ROUTES.ADMIN_DASHBOARD}?tab=operators` },
  { id: 'buses',      icon: 'directions_bus', label: 'Buses',     route: `${ROUTES.ADMIN_DASHBOARD}?tab=buses` },
  { id: 'users',      icon: 'group',          label: 'Users',     route: `${ROUTES.ADMIN_DASHBOARD}?tab=users` },
  { id: 'reviews',    icon: 'reviews',        label: 'Reviews',   route: ROUTES.ADMIN_REVIEWS },
];

const AdminLayout = ({ title, activeItemOverride, children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const activeItem = activeItemOverride || (location.pathname === ROUTES.ADMIN_REVIEWS ? 'reviews' : (searchParams.get('tab') || 'overview'));
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-slate-50 text-slate-900">
      <OperatorHeader title={title} searchPlaceholder="Search operators, buses, users..." />

      <AdminSidebar
        activeItem={activeItem}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(p => !p)}
      />

      <main className={`flex-1 overflow-y-auto transition-all duration-200 p-4 lg:p-6 pb-20 md:pb-6 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="grid grid-cols-5 h-16">
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

export default AdminLayout;
