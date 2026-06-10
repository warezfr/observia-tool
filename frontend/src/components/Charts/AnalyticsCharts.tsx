import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../ui/Card';

interface ChartsProps {
  timelineData: any[];
  providerData: any[];
  statusData: any[];
}

const COLORS = ['#10B981', '#F43F5E', '#06B6D4'];

export default function AnalyticsCharts({ timelineData, providerData, statusData }: ChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <h3 className="text-lg font-semibold mb-4">Analysis Timeline</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={timelineData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="date" stroke="#94A3B8" />
            <YAxis stroke="#94A3B8" />
            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none' }} />
            <Bar dataKey="count" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <h3 className="text-lg font-semibold mb-4">Status Overview</h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" labelLine={false} label={{ fill: '#CBD5E1' }} outerRadius={80} dataKey="value">
              {statusData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none' }} />
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card className="lg:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Provider Usage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={providerData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis type="number" stroke="#94A3B8" />
            <YAxis dataKey="provider" type="category" stroke="#94A3B8" />
            <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none' }} />
            <Bar dataKey="count" fill="#06B6D4" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
