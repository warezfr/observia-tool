export type EnvironmentType = "saas" | "managed";
export type AnalysisType = "performance" | "availability" | "security" | "cost" | "reliability";
export type AnalysisStatus = "queued" | "running" | "completed" | "partial" | "failed";
export type RecommendationLevel = "descriptive" | "prescriptive" | "script";
export type RecommendationSeverity = "critical" | "high" | "medium" | "low";
export type RecommendationStatus = "new" | "acknowledged" | "resolved";
export type AIProviderType =
  | "openai"
  | "anthropic"
  | "gemini"
  | "azure_openai"
  | "aws_bedrock"
  | "ollama";

export interface Environment {
  id: number;
  name: string;
  url: string;
  env_type: EnvironmentType;
}

export interface EnvironmentCreate {
  name: string;
  url: string;
  token: string;
  platform_token?: string;
  env_type: EnvironmentType;
}

export interface AIProvider {
  id: number;
  name: string;
  provider_type: AIProviderType;
  model: string;
  is_default: boolean;
  fallback_order: number;
}

export interface AIProviderCreate {
  name: string;
  provider_type: AIProviderType;
  model: string;
  api_key?: string;
  endpoint?: string;
  extra_config?: Record<string, unknown>;
  is_default: boolean;
  fallback_order: number;
}

export interface Analysis {
  id: number;
  environment_id: number;
  ai_provider_id: number;
  analysis_type: AnalysisType;
  status: AnalysisStatus;
  result: { summary: string; raw_data: unknown[] } | null;
  reasoning_steps: { type: string; content: string; tool?: string }[];
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface AnalysisCreate {
  environment_id: number;
  ai_provider_id: number;
  analysis_type: AnalysisType;
  time_range_hours: number;
  parameters: Record<string, unknown>;
}

export interface Recommendation {
  id: number;
  analysis_id: number;
  title: string;
  description: string;
  impact: string;
  level: RecommendationLevel;
  severity: RecommendationSeverity;
  status: RecommendationStatus;
  action: string | null;
  script: string | null;
  script_type: string | null;
  created_at: string;
}
