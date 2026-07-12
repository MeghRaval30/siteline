import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient.get('/bookings')
      .then(data => {
        setBookings(data.data || data || []);
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
        <h2>Bookings</h2>
        <button className="btn btn-primary">New Booking</button>
      </div>

      <div className="card">
        {loading && <p>Loading bookings...</p>}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        
        {!loading && !error && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center' }}>No bookings found</td>
                  </tr>
                ) : (
                  bookings.map(booking => (
                    <tr key={booking.id}>
                      <td>{booking.id}</td>
                      <td>{booking.customerName || 'N/A'}</td>
                      <td>{new Date(booking.date).toLocaleDateString()}</td>
                      <td>
                        <span className={`badge badge-${booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'neutral'}`}>
                          {booking.status || 'unknown'}
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
