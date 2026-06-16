import { useLocation } from 'react-router-dom';
import ThemeToggle from './ui/ThemeToggle';

const TITLES: { match: (path: string) => boolean; label: string }[] = [
  { match: p => p === '/', label: 'Dashboard' },
  { match: p => p.startsWith('/environments'), label: 'Environments' },
  { match: p => p.startsWith('/ai-providers'), label: 'AI Providers' },
  { match: p => /^\/analyses\/.+/.test(p), label: 'Analysis detail' },
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
    <header className="sticky top-0 z-20 h-14 border-b border-border-subtle bg-app/70 backdrop-blur-xl supports-[backdrop-filter]:bg-app/60">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-fg-muted font-medium">Observia</span>
          <span className="text-fg-muted/50">/</span>
          <span className="font-semibold text-fg tracking-tight">{title}</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
