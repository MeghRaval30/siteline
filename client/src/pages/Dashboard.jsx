import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, CheckCircle, Wrench, Clock, AlertTriangle, Calendar, Plus, Bot, TrendingUp, TrendingDown } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/dashboard/kpis').catch(() => null),
      apiClient.get('/ai/insights').catch(() => []),
      apiClient.get('/activity-logs?limit=8').catch(() => []),
    ]).then(([s, ins, acts]) => {
      setStats(s);
      setInsights(Array.isArray(ins) ? ins : []);
      setActivities(Array.isArray(acts) ? acts : acts?.logs || []);
      setLoading(false);
    });
  }, []);

  const statCards = stats ? [
    { label: 'Total Assets', value: (stats.totalAssets || stats.availableAssets + stats.allocatedAssets + (stats.inMaintenance || 0)) || 0, icon: Package, color: 'accent', trend: '+12%', up: true },
    { label: 'Available', value: stats.availableAssets || 0, icon: CheckCircle, color: 'success' },
    { label: 'Allocated', value: stats.allocatedAssets || 0, icon: Package, color: 'info' },
    { label: 'In Maintenance', value: stats.maintenanceToday || stats.inMaintenance || 0, icon: Wrench, color: 'warning' },
    { label: 'Overdue Returns', value: stats.overdueReturns?.length || stats.overdueCount || 0, icon: AlertTriangle, color: 'danger' },
    { label: 'Active Bookings', value: stats.activeBookings || 0, icon: Calendar, color: 'info' },
  ] : [];

  if (loading) return (
    <div>
      <div className="sl-page__header"><div className="sl-skeleton sl-skeleton--title" /></div>
      <div className="sl-stats-grid">{[...Array(6)].map((_, i) => <div key={i} className="sl-skeleton sl-skeleton--card" />)}</div>
    </div>
  );

  return (
    <div>
      <div className="sl-page__header">
        <div>
          <h1 className="sl-page__title">Dashboard</h1>
          <p className="sl-page__subtitle">Overview of your asset management operations</p>
        </div>
        <div className="sl-page__actions">
          <button className="sl-btn sl-btn--secondary" onClick={() => navigate('/ai-chat')} id="dash-ai-btn"><Bot size={16} /> AI Assistant</button>
          <button className="sl-btn sl-btn--primary" onClick={() => navigate('/assets')} id="dash-add-asset"><Plus size={16} /> Add Asset</button>
        </div>
      </div>

      <div className="sl-stats-grid">
        {statCards.map((s, i) => (
          <div className="sl-stat" key={i}>
            <div className={`sl-stat__icon sl-stat__icon--${s.color}`}><s.icon size={20} /></div>
            <div className="sl-stat__label">{s.label}</div>
            <div className="sl-stat__value">{s.value}</div>
            {s.trend && <div className={`sl-stat__trend ${s.up ? 'sl-stat__trend--up' : 'sl-stat__trend--down'}`}>{s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s.trend}</div>}
          </div>
        ))}
      </div>

      <div className="sl-grid-2 sl-gap-4 sl-mt-6" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="sl-card">
          <div className="sl-card__header">
            <h3 className="sl-card__title">AI Insights</h3>
            <span className={`sl-ai-status ${insights.length > 0 ? 'sl-ai-status--online' : 'sl-ai-status--offline'}`}>
              <span className="sl-ai-status__dot" />Active
            </span>
          </div>
          <div className="sl-card__body">
            {insights.length === 0 ? (
              <p className="sl-text-muted sl-text-sm">No insights available</p>
            ) : insights.map((ins, i) => (
              <div key={i} className="sl-flex sl-items-center sl-gap-3 sl-mb-4">
                <div className={`sl-badge sl-badge--${ins.type === 'warning' ? 'warning' : ins.type === 'danger' ? 'danger' : ins.type === 'success' ? 'success' : 'info'} sl-badge--dot`}>{ins.message}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sl-card">
          <div className="sl-card__header">
            <h3 className="sl-card__title">Recent Activity</h3>
            <button className="sl-btn sl-btn--ghost sl-btn--sm" onClick={() => navigate('/activity-logs')}>View all</button>
          </div>
          <div className="sl-card__body">
            {activities.length === 0 ? (
              <p className="sl-text-muted sl-text-sm">No recent activity</p>
            ) : (
              <div className="sl-timeline">
                {activities.slice(0, 6).map((act, i) => (
                  <div className="sl-timeline__item" key={act.id || i}>
                    <div className="sl-timeline__dot sl-timeline__dot--accent" />
                    <div className="sl-timeline__content">
                      <div className="sl-timeline__title">{act.action}</div>
                      <div className="sl-timeline__time">{act.actor?.name || 'System'} · {new Date(act.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
