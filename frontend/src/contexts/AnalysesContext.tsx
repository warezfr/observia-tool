import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { analysesApi } from '../services/api';
import type { Analysis, AnalysisCreate } from '../types';

interface AnalysesContextValue {
  analyses: Analysis[];
  loading: boolean;
  error: string | null;
  fetchAnalyses: (params?: { limit?: number; status?: string; type?: string }) => Promise<void>;
  createAnalysis: (data: AnalysisCreate) => Promise<Analysis>;
  deleteAnalysis: (id: number) => Promise<void>;
  getAnalysis: (id: number) => Promise<Analysis>;
  clearError: () => void;
}

const AnalysesContext = createContext<AnalysesContextValue | null>(null);

export function AnalysesProvider({ children }: { children: ReactNode }) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyses = useCallback(async (params?: { limit?: number; status?: string; type?: string }) => {
    setLoading(true);
    setError(null);
    try {
      setAnalyses(await analysesApi.list(params));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch analyses');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAnalysis = useCallback(async (data: AnalysisCreate) => {
    try {
      const a = await analysesApi.create(data);
      setAnalyses(prev => [...prev, a]);
      return a;
    } catch (e) {
      throw new Error(e instanceof Error ? e.message : 'Failed to create analysis');
    }
  }, []);

  const deleteAnalysis = useCallback(async (id: number) => {
    try {
      await analysesApi.delete(id);
      setAnalyses(prev => prev.filter(a => a.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete analysis');
    }
  }, []);

  const getAnalysis = useCallback((id: number) => analysesApi.get(id), []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AnalysesContext.Provider value={{ analyses, loading, error, fetchAnalyses, createAnalysis, deleteAnalysis, getAnalysis, clearError }}>
      {children}
    </AnalysesContext.Provider>
  );
}

export function useAnalyses() {
  const ctx = useContext(AnalysesContext);
  if (!ctx) throw new Error('useAnalyses must be inside AnalysesProvider');
  return ctx;
}
