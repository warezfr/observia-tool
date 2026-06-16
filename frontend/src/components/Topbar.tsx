import { useLocation } from 'react-router-dom';
import ThemeToggle from './ui/ThemeToggle';

const TITLES: { match: (path: string) => boolean; label: string }[] = [
  { match: p => p === '/', label: 'Dashboard' },
  { match: p => p.startsWith('/environments'), label: 'Environments' },
  { match: p => p.startsWith('/ai-providers'), label: 'AI Providers' },
  { match: p => /^\/analyses\/.+/.test(p), label: 'Analysis Detail' },
  { match: p => p.startsWith('/analyses'), label: 'Analyses' },
  { match: p => p.startsWith('/reports'), label: 'Reports' },
  { match: p => p.startsWith('/automation'), label: 'Automation' },
  { match: p => p.startsWith('/integrations'), label: 'Integrations' },
  { match: p => p.startsWith('/settings'), label: 'Settings' },
];

export default function Topbar() {
  const { pathname } = useLocation();
  const title = TITLES.find(t => t.match(pathname))?.label ?? 'Observia';

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border bg-app/80 backdrop-blur-md">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-fg-muted">Observia</span>
          <span className="text-fg-muted">/</span>
          <span className="font-medium text-fg">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
