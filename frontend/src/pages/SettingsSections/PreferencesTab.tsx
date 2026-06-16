import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import Card from '../../components/ui/Card';
import { useTheme } from '../../contexts/ThemeContext';

const selectClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent-ring focus:border-accent';

export default function PreferencesTab() {
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('UTC');
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="space-y-4">
      <Card title="Appearance">
        <label className="block text-sm text-fg-secondary mb-2">Theme</label>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          {(['light', 'dark'] as const).map(t => {
            const Icon = t === 'light' ? Sun : Moon;
            const active = theme === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm capitalize transition-all ${
                  active
                    ? 'border-accent bg-accent-soft text-accent font-medium'
                    : 'border-border text-fg-secondary hover:bg-fg/5'
                }`}
              >
                <Icon size={16} /> {t}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-fg-muted mt-2">Your choice is saved to this browser.</p>
      </Card>

      <Card title="Regional">
        <div className="space-y-3 max-w-sm">
          <div>
            <label className="block text-sm text-fg-secondary mb-1.5">Language</label>
            <select value={language} onChange={e => setLanguage(e.target.value)} className={selectClass}>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-fg-secondary mb-1.5">Timezone</label>
            <select value={timezone} onChange={e => setTimezone(e.target.value)} className={selectClass}>
              <option value="UTC">UTC</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
        </div>
      </Card>

      <Card title="Notifications">
        <label className="flex items-center gap-3 cursor-pointer text-sm text-fg-secondary">
          <input
            type="checkbox"
            checked={notifications}
            onChange={e => setNotifications(e.target.checked)}
            className="h-4 w-4 rounded accent-[rgb(var(--accent))]"
          />
          <span>Enable notifications</span>
        </label>
      </Card>
    </div>
  );
}
