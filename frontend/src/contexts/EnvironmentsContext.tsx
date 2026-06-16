import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { environmentsApi } from '../services/api';
import type { Environment, EnvironmentCreate } from '../types';

interface EnvironmentsContextValue {
  environments: Environment[];
  loading: boolean;
  fetchEnvironments: () => Promise<void>;
  createEnvironment: (data: EnvironmentCreate) => Promise<Environment>;
  deleteEnvironment: (id: number) => Promise<void>;
  testConnection: (id: number) => Promise<{ status: string; mode?: string; endpoint?: string }>;
}

const EnvironmentsContext = createContext<EnvironmentsContextValue | null>(null);

export function EnvironmentsProvider({ children }: { children: ReactNode }) {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEnvironments = useCallback(async () => {
    setLoading(true);
    try {
      setEnvironments(await environmentsApi.list());
    } finally {
      setLoading(false);
    }
  }, []);

  const createEnvironment = useCallback(async (data: EnvironmentCreate) => {
    const env = await environmentsApi.create(data);
    setEnvironments(prev => [...prev, env]);
    return env;
  }, []);

  const deleteEnvironment = useCallback(async (id: number) => {
    await environmentsApi.delete(id);
    setEnvironments(prev => prev.filter(e => e.id !== id));
  }, []);

  const testConnection = useCallback((id: number) => environmentsApi.testConnection(id), []);

  return (
    <EnvironmentsContext.Provider value={{ environments, loading, fetchEnvironments, createEnvironment, deleteEnvironment, testConnection }}>
      {children}
    </EnvironmentsContext.Provider>
  );
}

export function useEnvironments() {
  const ctx = useContext(EnvironmentsContext);
  if (!ctx) throw new Error('useEnvironments must be inside EnvironmentsProvider');
  return ctx;
}
