import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function ActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get('/activity-logs')
      .then(data => {
        setLogs(data.data || data || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Activity Logs</h2>
        <button className="btn btn-secondary">Refresh</button>
      </div>

      <div className="card">
        {loading && <p>Loading activity logs...</p>}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        
        {!loading && !error && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Log ID</th>
                  <th>Action</th>
                  <th>User</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }}>No activity logs found</td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td>{log.id}</td>
                      <td>{log.action}</td>
                      <td>{log.actor?.name || log.actor_id || 'System'}</td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
