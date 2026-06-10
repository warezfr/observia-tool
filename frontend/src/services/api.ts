import axios from 'axios';
import type {
  Environment,
  EnvironmentCreate,
  AIProvider,
  AIProviderCreate,
  Analysis,
  AnalysisCreate,
  Recommendation,
  RecommendationSeverity
} from '../types';

const client = axios.create({ baseURL: '/api/v1' });

export const environmentsApi = {
  list: () => client.get<Environment[]>('/environments/').then(r => r.data),
  create: (data: EnvironmentCreate) => client.post<Environment>('/environments/', data).then(r => r.data),
  delete: (id: number) => client.delete(`/environments/${id}`),
  testConnection: (id: number) => client.post<{ status: string; available_tools: number }>(`/environments/${id}/test-connection`).then(r => r.data),
};

export const aiProvidersApi = {
  list: () => client.get<AIProvider[]>('/ai-providers/').then(r => r.data),
  create: (data: AIProviderCreate) => client.post<AIProvider>('/ai-providers/', data).then(r => r.data),
  delete: (id: number) => client.delete(`/ai-providers/${id}`),
};

export const analysesApi = {
  list: (params?: { limit?: number; status?: string; type?: string }) =>
    client.get<Analysis[]>('/analyses/', { params }).then(r => r.data),
  get: (id: number) => client.get<Analysis>(`/analyses/${id}`).then(r => r.data),
  create: (data: AnalysisCreate) => client.post<Analysis>('/analyses/', data).then(r => r.data),
  delete: (id: number) => client.delete(`/analyses/${id}`),
};

export const recommendationsApi = {
  list: (params?: { analysis_id?: number; severity?: RecommendationSeverity }) =>
    client.get<Recommendation[]>('/recommendations/', { params }).then(r => r.data),
  updateStatus: (id: number, status: string) =>
    client.patch(`/recommendations/${id}/status`, null, { params: { new_status: status } }),
};
