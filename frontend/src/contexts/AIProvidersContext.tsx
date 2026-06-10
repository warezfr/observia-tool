import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { aiProvidersApi } from '../services/api';
import type { AIProvider, AIProviderCreate } from '../types';

interface AIProvidersContextValue {
  providers: AIProvider[];
  loading: boolean;
  fetchProviders: () => Promise<void>;
  createProvider: (data: AIProviderCreate) => Promise<AIProvider>;
  deleteProvider: (id: number) => Promise<void>;
}

const AIProvidersContext = createContext<AIProvidersContextValue | null>(null);

export function AIProvidersProvider({ children }: { children: ReactNode }) {
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      setProviders(await aiProvidersApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  const createProvider = useCallback(async (data: AIProviderCreate) => {
    const p = await aiProvidersApi.create(data);
    setProviders(prev => [...prev, p]);
    return p;
  }, []);

  const deleteProvider = useCallback(async (id: number) => {
    await aiProvidersApi.delete(id);
    setProviders(prev => prev.filter(p => p.id !== id));
  }, []);

  return (
    <AIProvidersContext.Provider value={{ providers, loading, fetchProviders, createProvider, deleteProvider }}>
      {children}
    </AIProvidersContext.Provider>
  );
}

export function useAIProviders() {
  const ctx = useContext(AIProvidersContext);
  if (!ctx) throw new Error('useAIProviders must be inside AIProvidersProvider');
  return ctx;
}
