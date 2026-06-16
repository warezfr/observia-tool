import axios from 'axios';
import type { AnalysisType } from '../types';

const client = axios.create({ baseURL: '/api/v1' });

export interface Schedule {
  id: number;
  name: string;
  environment_id: number;
  ai_provider_id: number;
  analysis_type: AnalysisType;
  time_range_hours: number;
  cron: string;
  enabled: boolean;
  last_run_at: string | null;
  created_at: string | null;
}

export interface ScheduleCreate {
  name: string;
  environment_id: number;
  ai_provider_id: number;
  analysis_type: AnalysisType;
  time_range_hours: number;
  cron: string;
  enabled: boolean;
  parameters?: Record<string, unknown>;
}

export const schedulesApi = {
  list: () => client.get<Schedule[]>('/schedules/').then((r) => r.data),
  create: (data: ScheduleCreate) => client.post<Schedule>('/schedules/', data).then((r) => r.data),
  update: (id: number, data: Partial<ScheduleCreate>) =>
    client.patch<Schedule>(`/schedules/${id}`, data).then((r) => r.data),
  delete: (id: number) => client.delete(`/schedules/${id}`),
};

export interface Integration {
  id: number;
  kind: 'slack' | 'webhook';
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export interface IntegrationCreate {
  kind: 'slack' | 'webhook';
  name: string;
  config: Record<string, unknown>;
  enabled: boolean;
}

export const integrationsApi = {
  list: () => client.get<Integration[]>('/integrations/').then((r) => r.data),
  create: (data: IntegrationCreate) =>
    client.post<Integration>('/integrations/', data).then((r) => r.data),
  delete: (id: number) => client.delete(`/integrations/${id}`),
};
