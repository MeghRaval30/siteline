import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({ assetsAvailable: 0, assetsAllocated: 0, maintenanceToday: 0 });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Fetching mock or actual endpoints
      const [statsRes, activitiesRes] = await Promise.all([
        apiClient.get('/dashboard/kpis').catch(() => ({ data: { assetsAvailable: 0, assetsAllocated: 0, maintenanceToday: 0 } })),
        apiClient.get('/dashboard/recent-activity').catch(() => ({
          data: []
        }))
      ]);
      
      setStats(statsRes.data);
      setRecentActivities(activitiesRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <h1 style={{ marginBottom: '2rem' }}>Dashboard Overview</h1>
      
      {loading ? (
        <p>Loading dashboard...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Assets</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{(stats.assetsAvailable || 0) + (stats.assetsAllocated || 0)}</p>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Assets Allocated</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.assetsAllocated || 0}</p>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pending Maintenance</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{stats.maintenanceToday || 0}</p>
            </div>
          </div>

          <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>Recent Activity</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>User</th>
                    <th>Item/Details</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivities.map((activity) => (
                    <tr key={activity.id}>
                      <td><span className="badge badge-neutral">{activity.action}</span></td>
                      <td>{activity.user}</td>
                      <td>{activity.item}</td>
                      <td>{activity.date}</td>
                    </tr>
                  ))}
                  {recentActivities.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center' }}>No recent activity.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
