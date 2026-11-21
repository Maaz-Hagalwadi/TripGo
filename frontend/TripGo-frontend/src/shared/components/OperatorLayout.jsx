import { ROUTES } from '../constants/routes';
import AppShell from './AppShell';
import { OPERATOR_BOTTOM_TABS, OPERATOR_NAV_SECTIONS } from '../../features/operator/components/operatorNav';

const OperatorLayout = ({ activeItem, title, children }) => (
  <AppShell
    activeItem={activeItem}
    title={title}
    roleLabel="Operator"
    settingsRoute={ROUTES.OPERATOR_SETTINGS}
    profileRoute={ROUTES.OPERATOR_SETTINGS}
    sections={OPERATOR_NAV_SECTIONS}
    bottomTabs={OPERATOR_BOTTOM_TABS}
  >
    {children}
  </AppShell>
);

export default OperatorLayout;
