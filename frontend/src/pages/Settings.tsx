import { useState } from 'react';
import UsersTab from './SettingsSections/UsersTab';
import PreferencesTab from './SettingsSections/PreferencesTab';

type TabType = 'users' | 'permissions' | 'api-keys' | 'preferences' | 'security';

const tabs: { id: TabType; label: string }[] = [
  { id: 'users', label: 'Users & Teams' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'security', label: 'Security' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-fg">Settings</h1>
        <p className="text-fg-muted text-sm mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 -mb-px border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-accent text-fg'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'preferences' && <PreferencesTab />}
        {(activeTab === 'permissions' || activeTab === 'api-keys' || activeTab === 'security') && (
          <div className="text-fg-muted text-sm">Coming soon…</div>
        )}
      </div>
    </div>
  );
}
