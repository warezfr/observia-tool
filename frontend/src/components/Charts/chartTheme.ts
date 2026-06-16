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
  axis: '#71717A',
  grid: '#E4E4E7',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E4E4E7',
  tooltipText: '#09090B',
  accent: '#0D9488',
  series: ['#0D9488', '#0891B2', '#16A34A', '#D97706', '#7C3AED', '#2563EB'],
  severity: { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#16A34A' },
  status: { completed: '#16A34A', failed: '#DC2626', running: '#0891B2' },
};

const dark: ChartColors = {
  axis: '#A1A1AA',
  grid: '#27272A',
  tooltipBg: '#18181B',
  tooltipBorder: '#3F3F46',
  tooltipText: '#FAFAFA',
  accent: '#2DD4BF',
  series: ['#2DD4BF', '#22D3EE', '#4ADE80', '#FBBF24', '#A78BFA', '#60A5FA'],
  severity: { critical: '#F87171', high: '#FB923C', medium: '#F59E0B', low: '#4ADE80' },
  status: { completed: '#4ADE80', failed: '#F87171', running: '#22D3EE' },
};

export function useChartColors(): ChartColors {
  const { theme } = useTheme();
  return theme === 'dark' ? dark : light;
}
