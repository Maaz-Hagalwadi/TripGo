import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../shared/constants/routes';

const menuItems = [
  { id: 'overview',  icon: 'dashboard',      label: 'Overview',  route: ROUTES.ADMIN_DASHBOARD },
  { id: 'operators', icon: 'business',       label: 'Operators', route: `${ROUTES.ADMIN_DASHBOARD}?tab=operators` },
  { id: 'buses',     icon: 'directions_bus', label: 'Buses',     route: `${ROUTES.ADMIN_DASHBOARD}?tab=buses` },
  { id: 'users',     icon: 'group',          label: 'Users',     route: ROUTES.ADMIN_USERS },
  { id: 'reviews',   icon: 'reviews',        label: 'Reviews',   route: ROUTES.ADMIN_REVIEWS },
];

const bottomItems = [
  { id: 'settings', icon: 'settings',      label: 'Settings', route: ROUTES.ADMIN_SETTINGS },
  { id: 'support',  icon: 'support_agent', label: 'Support',  route: ROUTES.ADMIN_SUPPORT },
];

const AdminSidebar = ({ activeItem = 'overview', collapsed = true, onToggleCollapse }) => {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const isOpen = !collapsed || isHovered;

  return (
    <aside
      className={`
        fixed top-16 left-0 z-40 h-[calc(100vh-4rem)]
        bg-white border-r border-slate-200 flex flex-col
        transition-all duration-200 overflow-hidden hidden md:flex
        ${isOpen ? 'w-64' : 'w-20'}
        ${isHovered && collapsed ? 'shadow-xl z-50' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex items-center py-3 border-b border-slate-100 ${isOpen ? 'justify-end px-4' : 'justify-center px-2'}`}>
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          title={collapsed ? 'Pin open' : 'Collapse'}
        >
          <span className="material-symbols-outlined text-slate-500 text-xl">
            {collapsed ? 'menu' : 'menu_open'}
          </span>
        </button>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {menuItems.map(item => {
          const active = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              title={!isOpen ? item.label : ''}
              className={`
                w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors
                ${!isOpen ? 'justify-center' : ''}
                ${active
                  ? 'bg-[#002046]/10 text-[#002046] border-l-[3px] border-[#002046]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <span className="material-symbols-outlined text-xl flex-shrink-0">{item.icon}</span>
              {isOpen && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 px-2 py-3 space-y-0.5">
        {bottomItems.map(item => {
          const active = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.route)}
              title={!isOpen ? item.label : ''}
              className={`
                w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors
                ${!isOpen ? 'justify-center' : ''}
                ${active
                  ? 'bg-[#002046]/10 text-[#002046] border-l-[3px] border-[#002046]'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              <span className="material-symbols-outlined text-xl flex-shrink-0">{item.icon}</span>
              {isOpen && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default AdminSidebar;
