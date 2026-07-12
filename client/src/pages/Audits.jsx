import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function Audits() {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get('/audit-cycles')
      .then(data => {
        setAudits(data.data || data || []);
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
        <h2>Audits</h2>
        <button className="btn btn-primary">Export Audits</button>
      </div>

      <div className="card">
        {loading && <p>Loading audits...</p>}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        
        {!loading && !error && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Audit ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>User ID</th>
                  <th>Start Date</th>
                </tr>
              </thead>
              <tbody>
                {audits.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No audits found</td>
                  </tr>
                ) : (
                  audits.map(audit => (
                    <tr key={audit.id}>
                      <td>{audit.id}</td>
                      <td>
                        <span className="badge badge-info">{audit.name}</span>
                      </td>
                      <td>{audit.status}</td>
                      <td>{audit.created_by}</td>
                      <td>{new Date(audit.start_date).toLocaleDateString()}</td>
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
