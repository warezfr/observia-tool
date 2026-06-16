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
  Radio,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  category: 'main' | 'tools' | 'system';
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={18} strokeWidth={1.75} />, label: 'Dashboard', to: '/', category: 'main' },
  { icon: <Database size={18} strokeWidth={1.75} />, label: 'Environments', to: '/environments', category: 'main' },
  { icon: <Bot size={18} strokeWidth={1.75} />, label: 'AI Providers', to: '/ai-providers', category: 'main' },
  { icon: <BarChart3 size={18} strokeWidth={1.75} />, label: 'Analyses', to: '/analyses', category: 'tools' },
  { icon: <FileText size={18} strokeWidth={1.75} />, label: 'Reports', to: '/reports', category: 'tools' },
  { icon: <Zap size={18} strokeWidth={1.75} />, label: 'Automation', to: '/automation', category: 'tools' },
  { icon: <Plug size={18} strokeWidth={1.75} />, label: 'Integrations', to: '/integrations', category: 'system' },
  { icon: <Settings size={18} strokeWidth={1.75} />, label: 'Settings', to: '/settings', category: 'system' },
];

const categoryLabels: Record<NavItem['category'], string> = {
  main: 'Overview',
  tools: 'Analysis',
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
      className={`sticky top-0 h-[100dvh] shrink-0 bg-surface/80 backdrop-blur-xl border-r border-border flex flex-col transition-[width] duration-300 ease-out ${
        collapsed ? 'w-[68px]' : 'w-64'
      }`}
    >
      <div className="h-14 px-4 flex items-center border-b border-border-subtle">
        <div className="flex items-center justify-between w-full">
          {!collapsed ? (
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-glow">
                <Radio size={17} strokeWidth={2} />
              </span>
              <span className="text-[15px] font-semibold tracking-tighter text-fg">Observia</span>
            </div>
          ) : (
            <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-glow">
              <Radio size={17} strokeWidth={2} />
            </span>
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1.5 text-fg-muted hover:text-fg hover:bg-fg/5 rounded-md transition-all duration-200 active:scale-95"
              title="Collapse sidebar"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose size={17} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mt-2 mx-auto p-1.5 text-fg-muted hover:text-fg hover:bg-fg/5 rounded-md transition-all duration-200 active:scale-95"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen size={17} strokeWidth={1.75} />
        </button>
      )}

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {Object.entries(categories).map(([key, items]) => (
          <div key={key} className="space-y-0.5">
            {!collapsed && (
              <p className="px-2.5 py-1.5 text-[10px] font-semibold text-fg-muted uppercase tracking-[0.08em]">
                {categoryLabels[key as NavItem['category']]}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `group relative flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? 'bg-accent-soft text-accent shadow-soft'
                        : 'text-fg-secondary hover:text-fg hover:bg-fg/[0.04]'
                    } ${collapsed ? 'justify-center' : ''}`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-accent" />
                      )}
                      <span className={isActive ? 'text-accent' : 'text-fg-muted group-hover:text-fg-secondary'}>
                        {item.icon}
                      </span>
                      {!collapsed && <span>{item.label}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border-subtle">
        <div
          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-fg/[0.02] ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent text-xs font-semibold">
            O
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-fg">Observia</p>
              <p className="truncate text-[11px] text-fg-muted">Self-hosted instance</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
