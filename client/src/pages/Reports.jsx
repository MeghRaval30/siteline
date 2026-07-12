import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiClient } from '../api/client';

const COLORS = ['#e8ab4a', '#60a5fa', '#34d399', '#f87171', '#a78bfa', '#fbbf24', '#f472b6', '#38bdf8'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/reports').then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="sl-skeleton sl-skeleton--card" style={{height: 400}} />;
  if (!data) return <div className="sl-empty"><div className="sl-empty__icon"><BarChart3 size={24} /></div><div className="sl-empty__title">Unable to load reports</div></div>;

  const byCategory = (data.byCategory || []).map(c => ({ name: c.name || c.category, value: c._count?.id || c.count || 0 }));
  const byStatus = (data.byStatus || []).map(s => ({ name: s.status, value: s._count?.id || s.count || 0 }));
  const byCondition = (data.byCondition || []).map(c => ({ name: c.condition, value: c._count?.id || c.count || 0 }));
  const byLocation = (data.byLocation || []).map(l => ({ name: l.location || 'Unknown', value: l._count?.id || l.count || 0 }));

  return (
    <div>
      <div className="sl-page__header"><div><h1 className="sl-page__title">Reports</h1><p className="sl-page__subtitle">Asset analytics and insights</p></div></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="sl-chart-card">
          <div className="sl-chart-card__title">Assets by Category</div>
          {byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCategory}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" /><XAxis dataKey="name" tick={{fill: '#636370', fontSize: 11}} angle={-20} textAnchor="end" height={60} /><YAxis tick={{fill: '#636370'}} /><Tooltip contentStyle={{background: '#1e1e22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8}} /><Bar dataKey="value" fill="#e8ab4a" radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          ) : <p className="sl-text-muted sl-text-sm">No data</p>}
        </div>

        <div className="sl-chart-card">
          <div className="sl-chart-card__title">Assets by Status</div>
          {byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={byStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip contentStyle={{background: '#1e1e22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8}} /><Legend /></PieChart>
            </ResponsiveContainer>
          ) : <p className="sl-text-muted sl-text-sm">No data</p>}
        </div>

        <div className="sl-chart-card">
          <div className="sl-chart-card__title">Assets by Condition</div>
          {byCondition.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byCondition}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" /><XAxis dataKey="name" tick={{fill: '#636370'}} /><YAxis tick={{fill: '#636370'}} /><Tooltip contentStyle={{background: '#1e1e22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8}} /><Bar dataKey="value" fill="#34d399" radius={[4,4,0,0]} /></BarChart>
            </ResponsiveContainer>
          ) : <p className="sl-text-muted sl-text-sm">No data</p>}
        </div>

        <div className="sl-chart-card">
          <div className="sl-chart-card__title">Assets by Location</div>
          {byLocation.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={byLocation} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" /><XAxis type="number" tick={{fill: '#636370'}} /><YAxis type="category" dataKey="name" tick={{fill: '#636370', fontSize: 11}} width={120} /><Tooltip contentStyle={{background: '#1e1e22', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8}} /><Bar dataKey="value" fill="#60a5fa" radius={[0,4,4,0]} /></BarChart>
            </ResponsiveContainer>
          ) : <p className="sl-text-muted sl-text-sm">No data</p>}
        </div>
      </div>
    </div>
  );
}
