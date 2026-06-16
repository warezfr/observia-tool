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

export interface ReportGenerateRequest {
  analysis_id: number;
  format: "json" | "markdown" | "html";
  include_raw_data?: boolean;
}

export interface ReportGenerateResponse {
  id: number;
  analysis_id: number;
  format: string;
  content: string;
  include_raw_data: boolean;
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
  generate: async (req: ReportGenerateRequest): Promise<ReportGenerateResponse> => {
    const { data } = await client.post('/reports/generate', req);
    return data;
  },
  downloadPdf: async (analysisId: number, includeRawData = false): Promise<Blob> => {
    const { data } = await client.get(`/reports/analysis/${analysisId}/pdf`, {
      params: { include_raw_data: includeRawData },
      responseType: 'blob',
    });
    return data as Blob;
  },
  getComparison: async (analysisId: number): Promise<AnalysisComparison> => {
    const { data } = await client.get(`/analyses/${analysisId}/comparison`);
    return data;
  },
};

export interface MetricComparison {
  metric: string;
  current_avg: number;
  previous_avg: number;
  delta_avg: number;
  delta_pct: number | null;
  regressed: boolean;
}

export interface AnalysisComparison {
  has_baseline: boolean;
  baseline_analysis_id?: number;
  baseline_created_at?: string | null;
  metrics: MetricComparison[];
}
