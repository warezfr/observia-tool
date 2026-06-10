import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnalyses } from '../contexts/AnalysesContext';
import type { Analysis } from '../types';

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAnalysis } = useAnalyses();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getAnalysis(Number(id))
      .then(setAnalysis)
      .catch(() => setError('Failed to load analysis'))
      .finally(() => setLoading(false));
  }, [id, getAnalysis]);

  if (loading) {
    return <div className="text-gray-400">Loading...</div>;
  }

  if (error || !analysis) {
    return (
      <div className="space-y-4">
        <p className="text-red-400">{error || 'Analysis not found'}</p>
        <button onClick={() => navigate('/analyses')} className="text-purple-400 hover:text-purple-300 text-sm">
          ← Back to Analyses
        </button>
      </div>
    );
  }

  const statusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-900 text-green-300';
      case 'failed': return 'bg-red-900 text-red-300';
      case 'running': return 'bg-blue-900 text-blue-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate('/analyses')} className="text-purple-400 hover:text-purple-300 text-sm">
        ← Back to Analyses
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">
            {analysis.analysis_type.charAt(0).toUpperCase() + analysis.analysis_type.slice(1)} Analysis
          </h2>
          <p className="text-gray-400 text-sm">
            Environment ID: {analysis.environment_id} | Created: {new Date(analysis.created_at).toLocaleString()}
          </p>
        </div>
        <span className={`text-sm px-3 py-1 rounded ${statusColor(analysis.status)}`}>
          {analysis.status}
        </span>
      </div>

      {analysis.error_message && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4">
          <h3 className="text-red-400 font-medium mb-2">Error</h3>
          <p className="text-red-300 text-sm">{analysis.error_message}</p>
        </div>
      )}

      {analysis.result && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Result Summary</h3>
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 whitespace-pre-wrap">{analysis.result.summary}</p>
          </div>
          {analysis.result.raw_data && analysis.result.raw_data.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Raw Data</h4>
              <pre className="bg-gray-950 border border-gray-800 rounded p-3 text-xs text-gray-300 overflow-x-auto">
                {JSON.stringify(analysis.result.raw_data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      {analysis.reasoning_steps && analysis.reasoning_steps.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Reasoning Steps</h3>
          <div className="space-y-3">
            {analysis.reasoning_steps.map((step, idx) => (
              <div key={idx} className="bg-gray-950 border border-gray-800 rounded p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-purple-400">{(step as { type?: string }).type || 'step'}</span>
                  {(step as { tool?: string }).tool && (
                    <span className="text-xs text-gray-500">via {(step as { tool: string }).tool}</span>
                  )}
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap">{(step as { content: string }).content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!analysis.result && !analysis.reasoning_steps && !analysis.error_message && analysis.status !== 'running' && (
        <p className="text-gray-500 text-sm">No results available yet.</p>
      )}
    </div>
  );
}
