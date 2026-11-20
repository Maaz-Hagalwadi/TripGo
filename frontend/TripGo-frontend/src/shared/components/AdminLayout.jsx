import { useLocation, useSearchParams } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import AppShell from './AppShell';
import { ADMIN_BOTTOM_TABS, ADMIN_NAV_SECTIONS } from '../../features/admin/components/adminNav';
import { usePendingCounts } from '../../features/admin/hooks/usePendingCounts';

const PATH_TO_ITEM = {
  [ROUTES.ADMIN_ANALYTICS]: 'analytics',
  [ROUTES.ADMIN_USERS]: 'users',
  [ROUTES.ADMIN_REVIEWS]: 'reviews',
  [ROUTES.ADMIN_PROMOS]: 'promos',
  [ROUTES.ADMIN_AUDIT_LOGS]: 'audit-logs',
  [ROUTES.ADMIN_SETTINGS]: 'settings',
  [ROUTES.ADMIN_SUPPORT]: 'support',
};

const AdminLayout = ({ title, activeItem: activeItemProp, activeItemOverride, children }) => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const pending = usePendingCounts();
  const activeItem = activeItemProp || activeItemOverride || PATH_TO_ITEM[location.pathname] || searchParams.get('tab') || 'overview';

  return (
    <AppShell
      activeItem={activeItem}
      title={title}
      roleLabel="Admin"
      settingsRoute={ROUTES.ADMIN_SETTINGS}
      profileRoute={ROUTES.ADMIN_SETTINGS}
      sections={ADMIN_NAV_SECTIONS}
      bottomTabs={ADMIN_BOTTOM_TABS}
      badges={{ operators: pending.operators, buses: pending.buses }}
    >
      {children}
    </AppShell>
  );
};

export default AdminLayout;
