import { useState } from 'react';
import Card from '../../components/ui/Card';

export default function PreferencesTab() {
  const [theme, setTheme] = useState('dark');
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('UTC');
  const [notifications, setNotifications] = useState(true);

  return (
    <div className="space-y-4">
      <Card>
        <h3 className="font-semibold mb-4">Appearance</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-2">Theme</label>
            <select
              value={theme}
              onChange={e => setTheme(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">Regional</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-2">Language</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">Timezone</label>
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              className="w-full px-3 py-2 rounded bg-slate-700 border border-slate-600 text-white"
            >
              <option value="UTC">UTC</option>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="America/New_York">America/New_York</option>
            </select>
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">Notifications</h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={notifications}
            onChange={e => setNotifications(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          <span>Enable notifications</span>
        </label>
      </Card>
    </div>
  );
}
