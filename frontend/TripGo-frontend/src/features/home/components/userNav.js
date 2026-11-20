import { ROUTES } from '../../../shared/constants/routes';

// Single source for the traveller navigation (desktop sidebar, mobile drawer and bottom bar)
export const USER_NAV_SECTIONS = [
  {
    title: 'Travel',
    items: [
      { id: 'dashboard', icon: 'home', label: 'Overview', route: ROUTES.DASHBOARD },
      { id: 'search', icon: 'search', label: 'Search buses', route: ROUTES.SEARCH_RESULTS },
      { id: 'bookings', icon: 'confirmation_number', label: 'My bookings', route: ROUTES.USER_BOOKINGS },
      { id: 'ratings', icon: 'star', label: 'Ratings', route: ROUTES.USER_PROFILE },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'settings', icon: 'settings', label: 'Settings', route: ROUTES.USER_SETTINGS },
      { id: 'support', icon: 'support_agent', label: 'Support', route: ROUTES.USER_SUPPORT },
    ],
  },
];

// Phone bottom bar — the four most-used destinations
export const USER_BOTTOM_TABS = [
  { id: 'dashboard', icon: 'home', label: 'Home', route: ROUTES.DASHBOARD },
  { id: 'search', icon: 'search', label: 'Search', route: ROUTES.SEARCH_RESULTS },
  { id: 'bookings', icon: 'confirmation_number', label: 'Bookings', route: ROUTES.USER_BOOKINGS },
  { id: 'settings', icon: 'person', label: 'Account', route: ROUTES.USER_SETTINGS, alsoActive: ['ratings', 'support'] },
];
