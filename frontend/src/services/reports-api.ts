import axios from 'axios';

export interface ReportSummary {
  total_analyses: number;
  completed: number;
  failed: number;
  success_rate: number;
  average_duration: number;
  most_common_errors: string[];
  recommendations_generated: number;
}

export interface ChartData {
  date: string;
  count: number;
}

export interface ProviderUsage {
  provider: string;
  count: number;
}

const client = axios.create({ baseURL: '/api/v1' });

export const reportsApi = {
  getSummary: async (days: number = 30): Promise<ReportSummary> => {
    const { data } = await client.get('/reports/summary', { params: { days } });
    return data;
  },
  getTimeline: async (days: number = 30): Promise<ChartData[]> => {
    const { data } = await client.get('/reports/analytics', { params: { days, type: 'timeline' } });
    return data;
  },
  getProviderUsage: async (days: number = 30): Promise<ProviderUsage[]> => {
    const { data } = await client.get('/reports/analytics', { params: { days, type: 'providers' } });
    return data;
  },
};
