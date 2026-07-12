import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiClient } from '../api/client';

const COLORS = ['#e8ab4a', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#f472b6', '#38bdf8'];

export default function Analytics() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/reports').catch(() => ({})),
      apiClient.get('/reports/department-allocation').catch(() => []),
      apiClient.get('/reports/maintenance-frequency').catch(() => []),
    ]).then(([reports, deptAlloc, maintFreq]) => {
      setData({ reports, deptAlloc: Array.isArray(deptAlloc) ? deptAlloc : [], maintFreq: Array.isArray(maintFreq) ? maintFreq : [] });
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="sl-skeleton sl-skeleton--card" style={{height: 400}} />;

  const byStatus = (data.reports?.byStatus || []).map(s => ({ name: s.status, value: s._count?.id || s.count || 0 }));
  const byCategory = (data.reports?.byCategory || []).map(c => ({ name: c.name || c.category, value: c._count?.id || c.count || 0 }));

  return (
    <div>
      <div className="sl-page__header"><div><h1 className="sl-page__title">Analytics</h1><p className="sl-page__subtitle">Deep insights into your asset operations</p></div></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="sl-chart-card">
          <div className="sl-chart-card__title">Asset Distribution by Status</div>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart><Pie data={byStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
              {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie><Tooltip contentStyle={{background: '#1e1e22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8}} /><Legend /></PieChart>
          </ResponsiveContainer>
        </div>

        <div className="sl-chart-card">
          <div className="sl-chart-card__title">Assets by Category</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byCategory}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" /><XAxis dataKey="name" tick={{fill: '#636370', fontSize: 10}} angle={-30} textAnchor="end" height={80} /><YAxis tick={{fill: '#636370'}} /><Tooltip contentStyle={{background: '#1e1e22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8}} /><Bar dataKey="value" fill="#e8ab4a" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </div>

        <div className="sl-chart-card" style={{gridColumn: 'span 2'}}>
          <div className="sl-chart-card__title">Department Asset Allocation</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.deptAlloc.map(d => ({ name: d.holder_department?.name || d.department || `Dept ${d.holder_department_id}`, count: d._count?.id || d.count || 0 }))}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" /><XAxis dataKey="name" tick={{fill: '#636370'}} /><YAxis tick={{fill: '#636370'}} /><Tooltip contentStyle={{background: '#1e1e22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8}} /><Bar dataKey="count" fill="#60a5fa" radius={[4,4,0,0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
