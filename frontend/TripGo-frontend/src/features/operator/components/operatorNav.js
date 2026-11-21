import { ROUTES } from '../../../shared/constants/routes';

// Single source for the operator navigation (desktop sidebar, phone drawer and bottom bar)
export const OPERATOR_NAV_SECTIONS = [
  {
    title: 'Business',
    items: [
      { id: 'overview', icon: 'space_dashboard', label: 'Overview', route: ROUTES.OPERATOR_DASHBOARD },
      { id: 'earnings', icon: 'account_balance_wallet', label: 'Earnings', route: ROUTES.OPERATOR_EARNINGS },
    ],
  },
  {
    title: 'Trips',
    items: [
      { id: 'schedules', icon: 'calendar_month', label: 'Routes & schedules', route: ROUTES.OPERATOR_SCHEDULES },
      { id: 'bookings', icon: 'confirmation_number', label: 'Bookings', route: ROUTES.OPERATOR_BOOKINGS },
      { id: 'reviews', icon: 'reviews', label: 'Reviews', route: ROUTES.OPERATOR_REVIEWS },
      { id: 'policies', icon: 'gavel', label: 'Trip policies', route: ROUTES.OPERATOR_POLICIES },
    ],
  },
  {
    title: 'Fleet',
    items: [
      { id: 'my-buses', icon: 'directions_bus', label: 'My buses', route: ROUTES.OPERATOR_MY_BUSES },
      { id: 'add-bus', icon: 'add_circle', label: 'Add a bus', route: ROUTES.OPERATOR_ADD_BUS },
      { id: 'drivers', icon: 'badge', label: 'Drivers', route: ROUTES.OPERATOR_DRIVERS },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'settings', icon: 'settings', label: 'Settings', route: ROUTES.OPERATOR_SETTINGS },
      { id: 'support', icon: 'support_agent', label: 'Support', route: ROUTES.OPERATOR_SUPPORT },
    ],
  },
];

export const OPERATOR_BOTTOM_TABS = [
  { id: 'overview', icon: 'space_dashboard', label: 'Overview', route: ROUTES.OPERATOR_DASHBOARD, alsoActive: ['earnings'] },
  { id: 'schedules', icon: 'calendar_month', label: 'Trips', route: ROUTES.OPERATOR_SCHEDULES, alsoActive: ['policies'] },
  { id: 'bookings', icon: 'confirmation_number', label: 'Bookings', route: ROUTES.OPERATOR_BOOKINGS, alsoActive: ['reviews'] },
  { id: 'my-buses', icon: 'directions_bus', label: 'Fleet', route: ROUTES.OPERATOR_MY_BUSES, alsoActive: ['add-bus', 'drivers'] },
];
