import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAnalyses } from '../contexts/AnalysesContext';
import { recommendationsApi } from '../services/api';
import { reportsApi } from '../services/reports-api';
import type { Analysis, Recommendation } from '../types';

export default function AnalysisDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getAnalysis } = useAnalyses();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  const analysisId = useMemo(() => (id ? Number(id) : null), [id]);

  const load = async (analysisId: number) => {
    const a = await getAnalysis(analysisId);
    setAnalysis(a);
    try {
      const recs = await recommendationsApi.list({ analysis_id: analysisId });
      setRecommendations(recs);
    } catch {
      // Keep analysis visible even if recs fail.
    }
  };

  useEffect(() => {
    if (!analysisId) return;
    setLoading(true);
    setError('');
    load(analysisId)
      .catch(() => setError('Failed to load analysis'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  useEffect(() => {
    if (!analysisId) return;
    if (!analysis) return;
    if (!['queued', 'running'].includes(analysis.status)) return;
    const interval = window.setInterval(() => {
      load(analysisId).catch(() => {});
    }, 3000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId, analysis?.status]);

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

  const downloadText = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = async (format: 'json' | 'markdown') => {
    if (!analysisId) return;
    setExporting(true);
    try {
      const res = await reportsApi.generate({ analysis_id: analysisId, format, include_raw_data: true });
      if (format === 'json') {
        downloadText(res.content, `analysis-${analysisId}.json`, 'application/json;charset=utf-8');
      } else {
        downloadText(res.content, `analysis-${analysisId}.md`, 'text/markdown;charset=utf-8');
      }
    } finally {
      setExporting(false);
    }
  };

  const handleRecStatus = async (recId: number, newStatus: 'new' | 'acknowledged' | 'resolved') => {
    await recommendationsApi.updateStatus(recId, newStatus);
    setRecommendations(prev => prev.map(r => (r.id === recId ? { ...r, status: newStatus } : r)));
  };

  const severityClass = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-red-900 text-red-300 border border-red-800';
      case 'high': return 'bg-orange-900 text-orange-300 border border-orange-800';
      case 'medium': return 'bg-yellow-900 text-yellow-300 border border-yellow-800';
      case 'low': return 'bg-green-900 text-green-300 border border-green-800';
      default: return 'bg-gray-800 text-gray-300 border border-gray-700';
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
        <div className="flex items-center gap-2">
          <button
            disabled={exporting}
            onClick={() => handleExport('markdown')}
            className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-1 rounded"
          >
            Export MD
          </button>
          <button
            disabled={exporting}
            onClick={() => handleExport('json')}
            className="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-3 py-1 rounded"
          >
            Export JSON
          </button>
          <span className={`text-sm px-3 py-1 rounded ${statusColor(analysis.status)}`}>
            {analysis.status}
          </span>
        </div>
      </div>

      {['queued', 'running'].includes(analysis.status) && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-blue-300 font-medium">Analysis in progress</h3>
              <p className="text-blue-200/80 text-sm mt-1">This page updates automatically.</p>
            </div>
            <span className="text-blue-200 text-sm">Refreshing…</span>
          </div>
        </div>
      )}

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

      {recommendations.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-medium mb-3">Recommendations</h3>
          <div className="space-y-3">
            {recommendations.map(rec => (
              <div key={rec.id} className="bg-gray-950 border border-gray-800 rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-medium text-gray-200">{rec.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 items-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${severityClass(rec.severity)}`}>{rec.severity}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">{rec.level}</span>
                      <span className="text-xs text-gray-400">{rec.impact}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleRecStatus(rec.id, 'new')}
                      className={`text-xs px-2 py-1 rounded ${rec.status === 'new' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                      New
                    </button>
                    <button
                      onClick={() => handleRecStatus(rec.id, 'acknowledged')}
                      className={`text-xs px-2 py-1 rounded ${rec.status === 'acknowledged' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                      Ack
                    </button>
                    <button
                      onClick={() => handleRecStatus(rec.id, 'resolved')}
                      className={`text-xs px-2 py-1 rounded ${rec.status === 'resolved' ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                      Resolved
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-300 whitespace-pre-wrap mt-3">{rec.description}</p>
                {rec.action && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-400 mb-1">Action</div>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{rec.action}</p>
                  </div>
                )}
                {rec.script && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-400 mb-1">Script {rec.script_type ? `(${rec.script_type})` : ''}</div>
                    <pre className="bg-black/30 border border-gray-800 rounded p-3 text-xs text-gray-300 overflow-x-auto">
                      {rec.script}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!analysis.result && (!analysis.reasoning_steps || analysis.reasoning_steps.length === 0) && !analysis.error_message && (
        <p className="text-gray-500 text-sm">No results available yet.</p>
      )}
    </div>
  );
}
