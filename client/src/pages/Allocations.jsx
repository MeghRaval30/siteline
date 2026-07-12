import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function Allocations() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllocations();
  }, []);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/allocations');
      setAllocations(data.data || []);
    } catch (error) {
      console.error('Failed to fetch allocations:', error);
      setAllocations([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Allocations & Transfers</h1>
        <button className="btn btn-primary">New Transfer</button>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Transfer Form</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label>Select Asset</label>
            <select className="form-control">
              <option>-- Select Asset --</option>
            </select>
          </div>
          <div className="form-group">
            <label>Destination Location/Person</label>
            <input type="text" className="form-control" placeholder="Enter destination..." />
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Submit Transfer</button>
      </div>

      <div className="card">
        <h3>Recent Allocations</h3>
        {loading ? (
          <p>Loading allocations...</p>
        ) : (
          <div className="table-container" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Assigned To</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {allocations.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center' }}>No allocations found</td>
                  </tr>
                ) : (
                  allocations.map(alloc => (
                    <tr key={alloc.id}>
                      <td>{alloc.asset?.asset_tag || alloc.asset_id}</td>
                      <td>{alloc.holder_user?.name || alloc.holder_department?.name || '-'}</td>
                      <td>{alloc.allocated_at ? new Date(alloc.allocated_at).toLocaleDateString() : 'N/A'}</td>
                      <td>
                        <span className="badge badge-info">{alloc.status || 'Transferred'}</span>
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
