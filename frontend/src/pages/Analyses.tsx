import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalyses } from '../contexts/AnalysesContext';
import { useEnvironments } from '../contexts/EnvironmentsContext';
import { useAIProviders } from '../contexts/AIProvidersContext';
import type { AnalysisCreate, AnalysisType, AnalysisStatus } from '../types';

const STATUS_OPTIONS: AnalysisStatus[] = ['queued', 'running', 'completed', 'failed'];
const TYPE_OPTIONS: AnalysisType[] = ['performance', 'availability', 'security', 'cost'];

export default function Analyses() {
  const { analyses, loading, fetchAnalyses, createAnalysis, deleteAnalysis } = useAnalyses();
  const { environments } = useEnvironments();
  const { providers } = useAIProviders();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [form, setForm] = useState<AnalysisCreate>({
    environment_id: 0,
    ai_provider_id: 0,
    analysis_type: 'performance',
    time_range_hours: 24,
    parameters: {},
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalyses({ status: statusFilter || undefined, type: typeFilter || undefined });
  }, [fetchAnalyses, statusFilter, typeFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.environment_id || !form.ai_provider_id) {
      setError('Please select an environment and AI provider.');
      return;
    }
    try {
      await createAnalysis(form);
      setShowForm(false);
      setForm({ environment_id: 0, ai_provider_id: 0, analysis_type: 'performance', time_range_hours: 24, parameters: {} });
    } catch {
      setError('Failed to create analysis.');
    }
  };

  const getStatusColor = (status: AnalysisStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-900 text-green-300';
      case 'failed': return 'bg-red-900 text-red-300';
      case 'running': return 'bg-blue-900 text-blue-300';
      case 'queued': return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Analyses</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded text-sm">
          + New Analysis
        </button>
      </div>

      <div className="flex gap-4">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
        >
          <option value="">All Types</option>
          {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-3">
          <select
            required
            value={form.environment_id}
            onChange={e => setForm(f => ({ ...f, environment_id: Number(e.target.value) }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value={0}>Select Environment</option>
            {environments.map(env => <option key={env.id} value={env.id}>{env.name}</option>)}
          </select>
          <select
            required
            value={form.ai_provider_id}
            onChange={e => setForm(f => ({ ...f, ai_provider_id: Number(e.target.value) }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            <option value={0}>Select AI Provider</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.provider_type})</option>)}
          </select>
          <select
            required
            value={form.analysis_type}
            onChange={e => setForm(f => ({ ...f, analysis_type: e.target.value as AnalysisType }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            {TYPE_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <input
            type="number"
            placeholder="Time range (hours)"
            value={form.time_range_hours}
            onChange={e => setForm(f => ({ ...f, time_range_hours: Number(e.target.value) }))}
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" className="bg-purple-700 hover:bg-purple-600 px-4 py-2 rounded text-sm">Start Analysis</button>
            <button type="button" onClick={() => setShowForm(false)} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading && <p className="text-gray-400 text-sm">Loading...</p>}

      <div className="space-y-3">
        {analyses.map(analysis => (
          <div key={analysis.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4 flex items-center justify-between">
            <div className="cursor-pointer flex-1" onClick={() => navigate(`/analyses/${analysis.id}`)}>
              <div className="font-medium">{analysis.analysis_type.charAt(0).toUpperCase() + analysis.analysis_type.slice(1)} Analysis</div>
              <div className="text-sm text-gray-400">Environment: {environments.find(e => e.id === analysis.environment_id)?.name || `ID ${analysis.environment_id}`} | ID: {analysis.id}</div>
              <div className="text-xs text-gray-500 mt-1">
                {new Date(analysis.created_at).toLocaleString()}
                {analysis.completed_at && ` → ${new Date(analysis.completed_at).toLocaleString()}`}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(analysis.status)}`}>
                {analysis.status}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteAnalysis(analysis.id); }}
                className="text-xs bg-red-900 hover:bg-red-800 px-3 py-1 rounded text-red-300"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {!loading && analyses.length === 0 && (
          <p className="text-gray-500 text-sm text-center py-8">No analyses found. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
