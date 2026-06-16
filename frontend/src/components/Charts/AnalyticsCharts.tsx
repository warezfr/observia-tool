import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import ChartCard from './ChartCard';
import { useChartColors } from './chartTheme';
import type { ChartData, ProviderUsage } from '../../services/reports-api';

interface ChartsProps {
  timelineData: ChartData[];
  providerData: ProviderUsage[];
  statusData: { name: string; value: number }[];
}

export default function AnalyticsCharts({ timelineData, providerData, statusData }: ChartsProps) {
  const colors = useChartColors();
  const tooltip = {
    background: colors.tooltipBg,
    border: `1px solid ${colors.tooltipBorder}`,
    borderRadius: 8,
    color: colors.tooltipText,
  };
  const statusColors = [colors.status.completed, colors.status.failed, colors.status.running];
  const visibleStatus = statusData.filter(d => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <ChartCard
        title="Analyses over time"
        subtitle="Daily analysis volume"
        isEmpty={timelineData.length === 0}
      >
        <AreaChart data={timelineData}>
          <defs>
            <linearGradient id="timelineFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.accent} stopOpacity={0.35} />
              <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
          <XAxis dataKey="date" stroke={colors.axis} fontSize={12} tickLine={false} axisLine={{ stroke: colors.grid }} />
          <YAxis stroke={colors.axis} fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltip} />
          <Area
            type="monotone"
            dataKey="count"
            stroke={colors.accent}
            strokeWidth={2}
            fill="url(#timelineFill)"
          />
        </AreaChart>
      </ChartCard>

      <ChartCard title="Status overview" subtitle="Outcomes in range" isEmpty={visibleStatus.length === 0}>
        <PieChart>
          <Pie
            data={visibleStatus}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {visibleStatus.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={statusColors[statusData.findIndex(s => s.name === entry.name)] ?? statusColors[index % statusColors.length]}
              />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltip} />
        </PieChart>
      </ChartCard>

      <ChartCard
        title="Provider usage"
        subtitle="Analyses per AI provider"
        className="lg:col-span-2"
        isEmpty={providerData.length === 0}
      >
        <BarChart data={providerData} layout="vertical" margin={{ left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} horizontal={false} />
          <XAxis type="number" stroke={colors.axis} fontSize={12} allowDecimals={false} tickLine={false} axisLine={{ stroke: colors.grid }} />
          <YAxis dataKey="provider" type="category" stroke={colors.axis} fontSize={12} width={120} tickLine={false} axisLine={false} />
          <Tooltip cursor={{ fill: colors.grid, opacity: 0.3 }} contentStyle={tooltip} />
          <Bar dataKey="count" radius={[0, 6, 6, 0]} fill={colors.accent} barSize={22} />
        </BarChart>
      </ChartCard>
    </div>
  );
}
