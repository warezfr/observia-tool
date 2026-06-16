import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Bot,
  BarChart3,
  FileText,
  Settings,
  Zap,
  Plug,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  category: 'main' | 'tools' | 'system';
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={19} />, label: 'Dashboard', to: '/', category: 'main' },
  { icon: <Database size={19} />, label: 'Environments', to: '/environments', category: 'main' },
  { icon: <Bot size={19} />, label: 'AI Providers', to: '/ai-providers', category: 'main' },
  { icon: <BarChart3 size={19} />, label: 'Analyses', to: '/analyses', category: 'tools' },
  { icon: <FileText size={19} />, label: 'Reports', to: '/reports', category: 'tools' },
  { icon: <Zap size={19} />, label: 'Automation', to: '/automation', category: 'tools' },
  { icon: <Plug size={19} />, label: 'Integrations', to: '/integrations', category: 'system' },
  { icon: <Settings size={19} />, label: 'Settings', to: '/settings', category: 'system' },
];

const categoryLabels: Record<NavItem['category'], string> = {
  main: 'Main',
  tools: 'Tools',
  system: 'System',
};

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const categories = {
    main: navItems.filter(item => item.category === 'main'),
    tools: navItems.filter(item => item.category === 'tools'),
    system: navItems.filter(item => item.category === 'system'),
  };

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 bg-surface border-r border-border flex flex-col transition-all duration-300 ${
        collapsed ? 'w-[68px]' : 'w-60'
      }`}
    >
      <div className="h-16 px-4 flex items-center border-b border-border">
        <div className="flex items-center justify-between w-full">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-soft">
                <Activity size={18} />
              </span>
              <span className="text-base font-semibold tracking-tight text-fg">Observia</span>
            </div>
          ) : (
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-soft">
              <Activity size={18} />
            </span>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 text-fg-muted hover:text-fg hover:bg-fg/5 rounded-lg transition-colors"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={18} />
            </button>
          )}
        </div>
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mt-2 mx-auto p-1.5 text-fg-muted hover:text-fg hover:bg-fg/5 rounded-lg transition-colors"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen size={18} />
        </button>
      )}

      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {Object.entries(categories).map(([key, items]) => (
          <div key={key} className="space-y-1">
            {!collapsed && (
              <p className="px-3 py-1 text-[11px] font-semibold text-fg-muted uppercase tracking-wider">
                {categoryLabels[key as NavItem['category']]}
              </p>
            )}
            <div className="space-y-1">
              {items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'bg-accent-soft text-accent font-medium'
                        : 'text-fg-secondary hover:text-fg hover:bg-fg/5'
                    } ${collapsed ? 'justify-center' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-accent" />
                      )}
                      {item.icon}
                      {!collapsed && <span>{item.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        <div
          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent text-sm font-semibold">
            A
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">Admin</p>
              <p className="truncate text-xs text-fg-muted">Self-hosted</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
