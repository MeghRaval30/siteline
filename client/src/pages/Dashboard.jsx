import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalAssets: 0, activeEmployees: 0, pendingRequests: 0 });
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
        apiClient.get('/dashboard/stats').catch(() => ({ data: { totalAssets: 120, activeEmployees: 45, pendingRequests: 3 } })),
        apiClient.get('/dashboard/activities').catch(() => ({
          data: [
            { id: 1, action: 'Asset Assigned', user: 'John Doe', item: 'MacBook Pro', date: '2023-10-01' },
            { id: 2, action: 'Maintenance Requested', user: 'Jane Smith', item: 'Dell Monitor', date: '2023-10-02' },
            { id: 3, action: 'New Employee Onboarded', user: 'Admin', item: 'Alice Johnson', date: '2023-10-03' },
          ]
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
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.totalAssets}</p>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Employees</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{stats.activeEmployees}</p>
            </div>
            <div className="card">
              <h3 style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pending Requests</h3>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--warning)' }}>{stats.pendingRequests}</p>
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
