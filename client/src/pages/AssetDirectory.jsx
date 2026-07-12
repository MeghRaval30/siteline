import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function AssetDirectory() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/assets');
      setAssets(data || []);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Asset Directory</h1>
        <button className="btn btn-primary">Add New Asset</button>
      </div>

      <div className="card">
        {loading ? (
          <p>Loading assets...</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No assets found</td>
                  </tr>
                ) : (
                  assets.map(asset => (
                    <tr key={asset.id}>
                      <td>{asset.id}</td>
                      <td>{asset.name}</td>
                      <td>{asset.category}</td>
                      <td>
                        <span className={`badge badge-${asset.status === 'Active' ? 'success' : 'neutral'}`}>
                          {asset.status || 'Unknown'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>View</button>
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
