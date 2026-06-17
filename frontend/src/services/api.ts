import axios from 'axios';
import type {
  Environment,
  EnvironmentCreate,
  AIProvider,
  AIProviderCreate,
  Analysis,
  AnalysisCreate,
  EnvironmentHealthOverview,
  Recommendation,
  RecommendationSeverity
} from '../types';

const client = axios.create({ baseURL: '/api/v1' });

// Centralized error reporting bridge. The ToastProvider registers a handler so
// any failed request surfaces a user-visible toast instead of failing silently.
type ToastHandler = (message: string) => void;
let toastHandler: ToastHandler | null = null;

export function setToastHandler(handler: ToastHandler | null): void {
  toastHandler = handler;
}

function extractErrorMessage(error: unknown): string {
  const err = error as { response?: { data?: { detail?: unknown }; status?: number }; message?: string };
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }
  if (err?.response?.status) return `Request failed (HTTP ${err.response.status})`;
  return err?.message || 'An unexpected error occurred';
}

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (toastHandler) {
      toastHandler(extractErrorMessage(error));
    }
    return Promise.reject(error);
  }
);

export const environmentsApi = {
  list: () => client.get<Environment[]>('/environments/').then(r => r.data),
  create: (data: EnvironmentCreate) => client.post<Environment>('/environments/', data).then(r => r.data),
  update: (id: number, data: Partial<EnvironmentCreate>) =>
    client.patch<Environment>(`/environments/${id}`, data).then(r => r.data),
  delete: (id: number) => client.delete(`/environments/${id}`),
  testConnection: (id: number) => client.post<{ status: string; mode?: string; endpoint?: string }>(`/environments/${id}/test-connection`).then(r => r.data),
};

export const aiProvidersApi = {
  list: () => client.get<AIProvider[]>('/ai-providers/').then(r => r.data),
  create: (data: AIProviderCreate) => client.post<AIProvider>('/ai-providers/', data).then(r => r.data),
  update: (id: number, data: Partial<AIProviderCreate>) =>
    client.patch<AIProvider>(`/ai-providers/${id}`, data).then(r => r.data),
  delete: (id: number) => client.delete(`/ai-providers/${id}`),
  detectModels: (data: { endpoint: string; api_key: string }) =>
    client.post<{ models: string[] }>('/ai-providers/detect-models', data).then(r => r.data),
};

export const analysesApi = {
  list: (params?: { limit?: number; status?: string; type?: string }) =>
    client.get<Analysis[]>('/analyses/', { params }).then(r => r.data),
  get: (id: number) => client.get<Analysis>(`/analyses/${id}`).then(r => r.data),
  create: (data: AnalysisCreate) => client.post<Analysis>('/analyses/', data).then(r => r.data),
  delete: (id: number) => client.delete(`/analyses/${id}`),
  healthOverview: () =>
    client.get<EnvironmentHealthOverview>('/analyses/health-overview').then(r => r.data),
};

export const recommendationsApi = {
  list: (params?: { analysis_id?: number; severity?: RecommendationSeverity }) =>
    client.get<Recommendation[]>('/recommendations/', { params }).then(r => r.data),
  updateStatus: (id: number, status: string) =>
    client.patch(`/recommendations/${id}/status`, null, { params: { new_status: status } }),
};
