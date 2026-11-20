import { ROUTES } from '../constants/routes';
import { USER_NAV_SECTIONS, USER_BOTTOM_TABS } from '../../features/home/components/userNav';
import AppShell from './AppShell';

const UserLayout = ({ activeItem = 'dashboard', title = 'Dashboard', showHeaderTitle = true, showHeaderSearch = true, children }) => (
  <AppShell
    activeItem={activeItem}
    title={title}
    showHeaderTitle={showHeaderTitle}
    showHeaderSearch={showHeaderSearch}
    searchPlaceholder="Search routes, cities, or bookings..."
    roleLabel="Traveller"
    settingsRoute={ROUTES.USER_SETTINGS}
    profileRoute={ROUTES.USER_SETTINGS}
    sections={USER_NAV_SECTIONS}
    bottomTabs={USER_BOTTOM_TABS}
  >
    {children}
  </AppShell>
);

export default UserLayout;
