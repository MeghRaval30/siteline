import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get('/reports')
      .then(data => {
        setReports(data.data || data || []);
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
        <h2>Reports</h2>
        <button className="btn btn-primary">Generate Report</button>
      </div>

      <div className="card">
        {loading && <p>Loading reports...</p>}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        
        {!loading && !error && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Generated At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No reports found</td>
                  </tr>
                ) : (
                  reports.map(report => (
                    <tr key={report.id}>
                      <td>{report.id}</td>
                      <td>{report.name}</td>
                      <td><span className="badge badge-neutral">{report.type}</span></td>
                      <td>{new Date(report.generatedAt).toLocaleString()}</td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Download</button>
                      </td>
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
