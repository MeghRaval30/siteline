import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function Maintenance() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get('/maintenance');
      setTasks(data || []);
    } catch (error) {
      console.error('Failed to fetch maintenance tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Maintenance Records</h1>
        <button className="btn btn-primary">Log Maintenance</button>
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2>Log New Task</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
          <div className="form-group">
            <label>Asset ID</label>
            <input type="text" className="form-control" placeholder="Asset ID" />
          </div>
          <div className="form-group">
            <label>Issue Description</label>
            <input type="text" className="form-control" placeholder="Describe the issue..." />
          </div>
        </div>
        <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Submit Task</button>
      </div>

      <div className="card">
        <h3>Maintenance History</h3>
        {loading ? (
          <p>Loading tasks...</p>
        ) : (
          <div className="table-container" style={{ marginTop: '1rem' }}>
            <table>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Asset ID</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No maintenance records found</td>
                  </tr>
                ) : (
                  tasks.map(task => (
                    <tr key={task.id}>
                      <td>{task.id}</td>
                      <td>{task.assetId}</td>
                      <td>{task.description}</td>
                      <td>
                        <span className={`badge badge-${task.status === 'Pending' ? 'warning' : 'success'}`}>
                          {task.status}
                        </span>
                      </td>
                      <td>${task.cost}</td>
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
