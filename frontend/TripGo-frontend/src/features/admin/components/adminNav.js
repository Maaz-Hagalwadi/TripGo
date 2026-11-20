import { ROUTES } from '../../../shared/constants/routes';

// Single source for the admin navigation (desktop sidebar, phone drawer and bottom bar)
export const ADMIN_NAV_SECTIONS = [
  {
    title: 'Insights',
    items: [
      { id: 'overview', icon: 'space_dashboard', label: 'Overview', route: ROUTES.ADMIN_DASHBOARD },
      { id: 'analytics', icon: 'monitoring', label: 'Analytics', route: ROUTES.ADMIN_ANALYTICS },
    ],
  },
  {
    title: 'Manage',
    items: [
      { id: 'operators', icon: 'domain', label: 'Operators', route: `${ROUTES.ADMIN_DASHBOARD}?tab=operators` },
      { id: 'buses', icon: 'directions_bus', label: 'Buses', route: `${ROUTES.ADMIN_DASHBOARD}?tab=buses` },
      { id: 'users', icon: 'group', label: 'Users', route: ROUTES.ADMIN_USERS },
      { id: 'reviews', icon: 'reviews', label: 'Reviews', route: ROUTES.ADMIN_REVIEWS },
      { id: 'promos', icon: 'sell', label: 'Promo codes', route: ROUTES.ADMIN_PROMOS },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'audit-logs', icon: 'history', label: 'Audit logs', route: ROUTES.ADMIN_AUDIT_LOGS },
      { id: 'settings', icon: 'settings', label: 'Settings', route: ROUTES.ADMIN_SETTINGS },
      { id: 'support', icon: 'support_agent', label: 'Support', route: ROUTES.ADMIN_SUPPORT },
    ],
  },
];

export const ADMIN_BOTTOM_TABS = [
  { id: 'overview', icon: 'space_dashboard', label: 'Overview', route: ROUTES.ADMIN_DASHBOARD, alsoActive: ['analytics'] },
  { id: 'operators', icon: 'domain', label: 'Operators', route: `${ROUTES.ADMIN_DASHBOARD}?tab=operators` },
  { id: 'buses', icon: 'directions_bus', label: 'Buses', route: `${ROUTES.ADMIN_DASHBOARD}?tab=buses` },
  { id: 'users', icon: 'group', label: 'Users', route: ROUTES.ADMIN_USERS, alsoActive: ['reviews', 'promos', 'audit-logs'] },
];
