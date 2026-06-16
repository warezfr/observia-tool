import { useTheme } from '../../contexts/ThemeContext';

export interface ChartColors {
  axis: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
  accent: string;
  series: string[];
  severity: { critical: string; high: string; medium: string; low: string };
  status: { completed: string; failed: string; running: string };
}

const light: ChartColors = {
  axis: '#6B7280',
  grid: '#E7E9EE',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E7E9EE',
  tooltipText: '#0B1020',
  accent: '#4F46E5',
  series: ['#4F46E5', '#2563EB', '#16A34A', '#D97706', '#9333EA', '#0891B2'],
  severity: { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#16A34A' },
  status: { completed: '#16A34A', failed: '#DC2626', running: '#2563EB' },
};

const dark: ChartColors = {
  axis: '#8A93A6',
  grid: '#1F2430',
  tooltipBg: '#161B26',
  tooltipBorder: '#1F2430',
  tooltipText: '#E6E8EE',
  accent: '#818CF8',
  series: ['#818CF8', '#60A5FA', '#22C55E', '#F59E0B', '#C084FC', '#22D3EE'],
  severity: { critical: '#F87171', high: '#FB923C', medium: '#F59E0B', low: '#4ADE80' },
  status: { completed: '#22C55E', failed: '#F87171', running: '#60A5FA' },
};

export function useChartColors(): ChartColors {
  const { theme } = useTheme();
  return theme === 'dark' ? dark : light;
}
