import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AdminSidebar from '../../features/admin/components/AdminSidebar';
import OperatorHeader from '../../shared/components/layout/OperatorHeader';
import { ROUTES } from '../constants/routes';
import '../../features/operator/pages/OperatorDashboard.css';

const MOBILE_NAV = [
  { icon: 'dashboard',      label: 'Overview',  route: ROUTES.ADMIN_DASHBOARD },
  { icon: 'business',       label: 'Operators', route: `${ROUTES.ADMIN_DASHBOARD}?tab=operators` },
  { icon: 'directions_bus', label: 'Buses',     route: `${ROUTES.ADMIN_DASHBOARD}?tab=buses` },
  { icon: 'group',          label: 'Users',     route: `${ROUTES.ADMIN_DASHBOARD}?tab=users` },
];

const AdminLayout = ({ title, children }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeItem = searchParams.get('tab') || 'overview';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="bg-background-light dark:bg-op-bg text-slate-900 dark:text-slate-100 min-h-screen flex">
      <div className="operator-sidebar">
        <AdminSidebar
          activeItem={activeItem}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(p => !p)}
        />
      </div>

      <main className={`operator-main flex-1 flex flex-col min-w-0 overflow-hidden transition-all ${sidebarCollapsed ? 'ml-20' : 'ml-64'}`}>
        <OperatorHeader title={title} searchPlaceholder="Search operators, buses, users..." />
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </div>
      </main>

      <nav className="mobile-bottom-nav fixed bottom-0 left-0 right-0 bg-white dark:bg-op-card border-t border-slate-200 dark:border-slate-800 z-50">
        <div className="grid grid-cols-4 h-16">
          {MOBILE_NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                activeItem === item.id ? 'text-primary' : 'text-slate-400'
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

export default AdminLayout;
