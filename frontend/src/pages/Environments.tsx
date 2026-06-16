import { useEffect, useState } from 'react';
import { useEnvironments } from '../contexts/EnvironmentsContext';
import type { EnvironmentCreate, EnvironmentType } from '../types';

export default function Environments() {
  const { environments, loading, fetchEnvironments, createEnvironment, deleteEnvironment, testConnection } = useEnvironments();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<EnvironmentCreate>({ name: '', url: '', token: '', env_type: 'saas' });
  const [testResults, setTestResults] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  useEffect(() => { fetchEnvironments(); }, [fetchEnvironments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createEnvironment(form);
      setShowForm(false);
      setForm({ name: '', url: '', token: '', env_type: 'saas' });
    } catch {
      setError('Failed to create environment. Check your details.');
    }
  };

  const handleTest = async (id: number) => {
    setTestResults(prev => ({ ...prev, [id]: 'testing...' }));
    try {
      const result = await testConnection(id);
      setTestResults(prev => ({ ...prev, [id]: `Connected (${result.available_tools} tools)` }));
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      setTestResults(prev => ({ ...prev, [id]: typeof detail === 'string' ? detail : 'Connection failed' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Environments</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded text-sm">
          + Add Environment
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <input required placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
          <input required placeholder="URL (e.g. https://abc.live.dynatrace.com)" value={form.url}
            onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
          <input required type="password" placeholder="API Token" value={form.token}
            onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500" />
          <select value={form.env_type} onChange={e => setForm(f => ({ ...f, env_type: e.target.value as EnvironmentType }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500">
            <option value="saas">SaaS</option>
            <option value="managed">Managed</option>
          </select>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded text-sm">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading && <p className="text-gray-400 text-sm">Loading...</p>}

      <div className="space-y-3">
        {environments.map(env => (
          <div key={env.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{env.name}</div>
              <div className="text-sm text-gray-400">{env.url}</div>
              <span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${env.env_type === 'saas' ? 'bg-blue-900 text-blue-300' : 'bg-orange-900 text-orange-300'}`}>
                {env.env_type.toUpperCase()}
              </span>
              {testResults[env.id] && (
                <span className={`ml-2 text-xs ${testResults[env.id].includes('Connected') ? 'text-green-400' : 'text-red-400'}`}>
                  {testResults[env.id]}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleTest(env.id)} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">Test</button>
              <button onClick={() => deleteEnvironment(env.id)} className="text-xs bg-red-900 hover:bg-red-800 px-3 py-1 rounded text-red-300">Delete</button>
            </div>
          </div>
        ))}
        {!loading && environments.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No environments configured. Add one to get started.</p>
        )}
      </div>
    </div>
  );
}
