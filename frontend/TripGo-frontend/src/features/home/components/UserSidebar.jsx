import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';

const UserSidebar = ({ activeItem = 'dashboard', collapsed = false, onToggleCollapse }) => {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', icon: 'dashboard', label: 'Overview', route: ROUTES.DASHBOARD },
    { id: 'search', icon: 'search', label: 'Search Buses', route: ROUTES.SEARCH_RESULTS },
    { id: 'bookings', icon: 'confirmation_number', label: 'My Bookings', route: ROUTES.USER_BOOKINGS },
    { id: 'profile', icon: 'person', label: 'Profile', route: ROUTES.USER_PROFILE },
  ];
  const bottomItems = [
    { id: 'settings', icon: 'settings', label: 'Settings', route: ROUTES.USER_SETTINGS },
    { id: 'support', icon: 'support_agent', label: 'Support', route: ROUTES.USER_SUPPORT },
  ];

  return (
    <aside className={`bg-white dark:bg-op-sidebar border-r border-slate-200 dark:border-slate-800 flex flex-col fixed left-0 top-0 h-screen overflow-y-auto transition-all ${collapsed ? 'w-20' : 'w-64'}`}>
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!collapsed && (
            <>
              <div className="bg-primary p-2 rounded-lg flex items-center justify-center">
                <span className="material-symbols-outlined text-white">person</span>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">TripGo</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">User Dashboard</p>
              </div>
            </>
          )}
          {collapsed && (
            <div className="bg-primary p-2 rounded-lg flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-white">person</span>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 text-xl">menu_open</span>
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="mx-3 mb-4 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">menu</span>
        </button>
      )}

      <nav className="flex-1 px-3 py-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.route)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeItem === item.id
                ? 'text-primary bg-primary/10 border-l-4 border-primary rounded-r-lg'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-1">
        {bottomItems.map((item) => (
          <button
            key={item.id}
            onClick={() => navigate(item.route)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              activeItem === item.id
                ? 'text-primary bg-primary/10 border-l-4 border-primary rounded-r-lg'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            } ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {!collapsed && <span className="font-medium text-sm">{item.label}</span>}
          </button>
        ))}
      </div>
    </aside>
  );
};

export default UserSidebar;
