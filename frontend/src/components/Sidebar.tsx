import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Database,
  Bot,
  BarChart3,
  Settings,
  Zap,
  Plug,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  icon: React.ReactNode;
  label: string;
  to: string;
  category: 'main' | 'tools' | 'system';
}

const navItems: NavItem[] = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', to: '/', category: 'main' },
  { icon: <Database size={20} />, label: 'Environments', to: '/environments', category: 'main' },
  { icon: <Bot size={20} />, label: 'AI Providers', to: '/ai-providers', category: 'main' },
  { icon: <BarChart3 size={20} />, label: 'Analyses', to: '/analyses', category: 'tools' },
  { icon: <BarChart3 size={20} />, label: 'Reports', to: '/reports', category: 'tools' },
  { icon: <Zap size={20} />, label: 'Automation', to: '/automation', category: 'tools' },
  { icon: <Plug size={20} />, label: 'Integrations', to: '/integrations', category: 'system' },
  { icon: <Settings size={20} />, label: 'Settings', to: '/settings', category: 'system' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  const categories = {
    main: navItems.filter(item => item.category === 'main'),
    tools: navItems.filter(item => item.category === 'tools'),
    system: navItems.filter(item => item.category === 'system'),
  };

  return (
    <aside className={`bg-slate-900 border-r border-slate-800 flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-56'}`}>
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <h1 className="text-lg font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Observia
            </h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 hover:bg-slate-800 rounded transition-colors"
          >
            <ChevronDown size={18} className={`transform transition-transform ${collapsed ? '-rotate-90' : 'rotate-0'}`} />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-8">
        {Object.entries(categories).map(([key, items]) => (
          <div key={key} className="space-y-2">
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {key === 'main' ? 'Main' : key === 'tools' ? 'Tools' : 'System'}
              </p>
            )}
            <div className="space-y-1">
              {items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded transition-all ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-lg'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`
                  }
                  title={collapsed ? item.label : undefined}
                >
                  {item.icon}
                  {!collapsed && <span className="text-sm">{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button className="w-full flex items-center gap-2 px-3 py-2 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
          <LogOut size={20} />
          {!collapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
