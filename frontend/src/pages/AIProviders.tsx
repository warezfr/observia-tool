import { useEffect, useState } from 'react';
import { useAIProviders } from '../contexts/AIProvidersContext';
import type { AIProviderCreate, AIProviderType } from '../types';

const PROVIDER_MODELS: Record<AIProviderType, string[]> = {
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-4'],
  anthropic: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
  gemini: ['gemini-1.5-pro', 'gemini-1.5-flash'],
  azure_openai: ['gpt-4o', 'gpt-4-turbo'],
  aws_bedrock: ['anthropic.claude-3-5-sonnet-20241022-v2:0', 'amazon.titan-text-express-v1'],
  ollama: ['llama3', 'mistral', 'mixtral'],
};

export default function AIProviders() {
  const { providers, loading, fetchProviders, createProvider, deleteProvider } = useAIProviders();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AIProviderCreate>({
    name: '', provider_type: 'anthropic', model: 'claude-sonnet-4-6',
    api_key: '', is_default: false, fallback_order: 1,
  });
  const [error, setError] = useState('');

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createProvider(form);
      setShowForm(false);
      setForm({ name: '', provider_type: 'anthropic', model: 'claude-sonnet-4-6', api_key: '', is_default: false, fallback_order: 1 });
    } catch {
      setError('Failed to save provider.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">AI Providers</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded text-sm">
          + Add Provider
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <input required placeholder="Display Name" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <select value={form.provider_type}
            onChange={e => {
              const t = e.target.value as AIProviderType;
              setForm(f => ({ ...f, provider_type: t, model: PROVIDER_MODELS[t][0] }));
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
            {Object.keys(PROVIDER_MODELS).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm">
            {PROVIDER_MODELS[form.provider_type].map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input type="password" placeholder="API Key (leave empty for Ollama)" value={form.api_key}
            onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <input type="number" placeholder="Fallback order (1 = highest priority)" value={form.fallback_order}
            onChange={e => setForm(f => ({ ...f, fallback_order: Number(e.target.value) }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.is_default} onChange={e => setForm(f => ({ ...f, is_default: e.target.checked }))} />
            Set as default provider
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="bg-blue-700 hover:bg-blue-600 px-4 py-2 rounded text-sm">Save</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-700 px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {providers.map(p => (
          <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="font-medium flex items-center gap-2">
                {p.name}
                {p.is_default && <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">Default</span>}
              </div>
              <div className="text-sm text-gray-400">{p.provider_type} / {p.model}</div>
              <div className="text-xs text-gray-600">Fallback order: {p.fallback_order}</div>
            </div>
            <button onClick={() => deleteProvider(p.id)} className="text-xs bg-red-900 hover:bg-red-800 px-3 py-1 rounded text-red-300">Delete</button>
          </div>
        ))}
        {!loading && providers.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No AI providers configured. Add one to enable analysis.</p>
        )}
      </div>
    </div>
  );
}
