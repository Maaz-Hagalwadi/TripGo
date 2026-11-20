import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants/routes';
import UserSidebar, { NavItem } from '../../features/home/components/UserSidebar';
import OperatorHeader from './layout/OperatorHeader';
import { useAuth } from '../contexts/AuthContext';
import TripGoIcon from '../../assets/icons/TripGoIcon';

/**
 * Page frame shared by the traveller and admin areas: header, collapsible sidebar,
 * phone drawer with the same items, and an optional phone bottom bar.
 * `sections`: [{ title, items: [{ id, icon, label, route }] }]; `badges`: { [itemId]: count }.
 */
const AppShell = ({
  activeItem, title, showHeaderTitle = true, showHeaderSearch = false, searchPlaceholder,
  roleLabel, settingsRoute, profileRoute, sections, bottomTabs = [], badges = {}, children,
}) => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const go = (route) => { navigate(route); setMobileOpen(false); };
  const hasBottomBar = bottomTabs.length > 0;

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-900">
      <OperatorHeader
        title={title}
        showTitle={showHeaderTitle}
        showSearch={showHeaderSearch}
        searchPlaceholder={searchPlaceholder}
        roleLabel={roleLabel}
        settingsRoute={settingsRoute}
        profileRoute={profileRoute}
        onMenuToggle={() => setMobileOpen((p) => !p)}
      />

      <UserSidebar
        activeItem={activeItem}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((p) => !p)}
        sections={sections}
        badges={badges}
      />

      {/* Mobile drawer — same items as the desktop sidebar */}
      <div className={`fixed inset-0 z-50 md:hidden ${mobileOpen ? '' : 'pointer-events-none'}`} aria-hidden={!mobileOpen}>
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${mobileOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileOpen(false)}
        />
        <aside className={`absolute left-0 top-0 h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <TripGoIcon className="w-5 h-4 text-white" />
              </div>
              <span className="font-black text-lg text-primary tracking-tight">TripGo</span>
              {roleLabel && <span className="rounded-full bg-[#FDBA74]/25 px-2 py-0.5 text-[10px] font-bold text-orange-700">{roleLabel}</span>}
            </div>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-slate-500">close</span>
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto" aria-label="Main">
            {sections.map((section) => (
              <div key={section.title}>
                <p className="px-3 mb-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-400">{section.title}</p>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <NavItem key={item.id} item={item} open active={activeItem === item.id} badge={badges[item.id]} onClick={() => go(item.route)} />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-100 p-3">
            <button
              onClick={() => { logout(); navigate(ROUTES.LOGIN); }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              Sign out
            </button>
          </div>
        </aside>
      </div>

      <main className={`flex-1 overflow-y-auto transition-all duration-200 px-4 pt-4 ${hasBottomBar ? 'pb-24' : 'pb-6'} md:pb-6 lg:px-6 lg:pt-6 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {children}
      </main>

      {hasBottomBar && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 pb-[env(safe-area-inset-bottom)]" aria-label="Quick navigation">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${bottomTabs.length}, minmax(0, 1fr))` }}>
            {bottomTabs.map((tab) => {
              const active = activeItem === tab.id || tab.alsoActive?.includes(activeItem);
              return (
                <button
                  key={tab.id}
                  onClick={() => navigate(tab.route)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold transition-colors ${active ? 'text-primary' : 'text-slate-400'}`}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] rounded-full px-4 py-0.5 transition-colors ${active ? 'bg-[#FDBA74]/25 text-orange-600' : ''}`}
                    style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
                  >
                    {tab.icon}
                  </span>
                  {badges[tab.id] > 0 && <span className="absolute top-1.5 right-[calc(50%-20px)] w-2 h-2 rounded-full bg-[#FF8A65] ring-2 ring-white" />}
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default AppShell;
