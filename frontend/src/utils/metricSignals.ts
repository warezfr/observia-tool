export interface MetricSignal {
  metric: string;
  latest: number;
  min: number;
  max: number;
  avg: number;
  points: number;
}

function toNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * Mirrors backend `_extract_metric_signals()` logic to drive the UI preview
 * from `analysis.result.raw_data` without needing another endpoint.
 */
export function extractMetricSignals(result: unknown): MetricSignal[] {
  if (!result || typeof result !== 'object') return [];
  const raw = (result as { raw_data?: unknown }).raw_data;
  if (!Array.isArray(raw)) return [];

  const signals: MetricSignal[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const tool = (entry as { tool?: unknown }).tool;
    if (tool !== 'query_metrics') continue;

    let payload: unknown = (entry as { result?: unknown }).result;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        continue;
      }
    }
    if (!payload || typeof payload !== 'object') continue;

    const seriesList = (payload as { result?: unknown }).result;
    if (!Array.isArray(seriesList)) continue;

    for (const series of seriesList) {
      if (!series || typeof series !== 'object') continue;
      const metricId = String((series as { metricId?: unknown }).metricId ?? 'metric');
      const data = (series as { data?: unknown }).data;
      if (!Array.isArray(data)) continue;

      const values: number[] = [];
      for (const d of data) {
        if (!d || typeof d !== 'object') continue;
        const vs = (d as { values?: unknown }).values;
        if (!Array.isArray(vs)) continue;
        for (const v of vs) {
          const n = toNumber(v);
          if (n != null) values.push(n);
        }
      }

      if (values.length === 0) continue;
      const sum = values.reduce((a, b) => a + b, 0);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const latest = values[values.length - 1];
      signals.push({
        metric: metricId,
        latest: Math.round(latest * 1000) / 1000,
        min: Math.round(min * 1000) / 1000,
        max: Math.round(max * 1000) / 1000,
        avg: Math.round((sum / values.length) * 1000) / 1000,
        points: values.length,
      });
    }
  }

  return signals;
}

/** Collect distinct tool names from `analysis.result.raw_data` entries. */
export function extractRawDataTools(rawData: unknown): string[] {
  if (!Array.isArray(rawData)) return [];
  const tools = new Set<string>();
  for (const entry of rawData) {
    if (!entry || typeof entry !== "object") continue;
    const tool = (entry as { tool?: unknown }).tool;
    if (typeof tool === "string" && tool) tools.add(tool);
  }
  return [...tools];
}

