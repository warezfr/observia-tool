import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { analysesApi } from '../services/api';
import type { Analysis, AnalysisCreate } from '../types';

interface AnalysesContextValue {
  analyses: Analysis[];
  loading: boolean;
  fetchAnalyses: (params?: { limit?: number; status?: string; type?: string }) => Promise<void>;
  createAnalysis: (data: AnalysisCreate) => Promise<Analysis>;
  deleteAnalysis: (id: number) => Promise<void>;
  getAnalysis: (id: number) => Promise<Analysis>;
}

const AnalysesContext = createContext<AnalysesContextValue | null>(null);

export function AnalysesProvider({ children }: { children: ReactNode }) {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAnalyses = useCallback(async (params?: { limit?: number; status?: string; type?: string }) => {
    setLoading(true);
    try {
      setAnalyses(await analysesApi.list(params));
    } finally {
      setLoading(false);
    }
  }, []);

  const createAnalysis = useCallback(async (data: AnalysisCreate) => {
    const a = await analysesApi.create(data);
    setAnalyses(prev => [...prev, a]);
    return a;
  }, []);

  const deleteAnalysis = useCallback(async (id: number) => {
    await analysesApi.delete(id);
    setAnalyses(prev => prev.filter(a => a.id !== id));
  }, []);

  const getAnalysis = useCallback((id: number) => analysesApi.get(id), []);

  return (
    <AnalysesContext.Provider value={{ analyses, loading, fetchAnalyses, createAnalysis, deleteAnalysis, getAnalysis }}>
      {children}
    </AnalysesContext.Provider>
  );
}

export function useAnalyses() {
  const ctx = useContext(AnalysesContext);
  if (!ctx) throw new Error('useAnalyses must be inside AnalysesProvider');
  return ctx;
}
