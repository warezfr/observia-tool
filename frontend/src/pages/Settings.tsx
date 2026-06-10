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
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account and preferences</p>
      </div>

      <div className="flex gap-2 border-b border-slate-700 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 border-b-2 font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary-600 text-white'
                : 'border-transparent text-slate-400 hover:text-white'
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
          <div className="text-slate-400">Coming soon...</div>
        )}
      </div>
    </div>
  );
}
