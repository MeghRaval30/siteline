import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [showForm, setShowForm] = useState(false);
  const [assetId, setAssetId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = () => {
    setLoading(true);
    apiClient.get('/bookings')
      .then(data => {
        setBookings(data.data || data || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handleCreateBooking = async () => {
    if (!assetId || !startTime || !endTime) return;
    try {
      setSubmitting(true);
      await apiClient.post('/bookings', {
        asset_id: parseInt(assetId),
        start_time: startTime,
        end_time: endTime,
        purpose: purpose
      });
      setShowForm(false);
      setAssetId('');
      setStartTime('');
      setEndTime('');
      setPurpose('');
      fetchBookings();
    } catch (err) {
      console.error('Failed to create booking:', err);
      alert('Error: ' + (err.message || 'Failed to create booking'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Bookings</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancel' : 'New Booking'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ marginBottom: '2rem' }}>
          <h3>Create New Booking</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div className="form-group">
              <label>Asset ID</label>
              <input type="number" className="form-control" value={assetId} onChange={e => setAssetId(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Purpose</label>
              <input type="text" className="form-control" value={purpose} onChange={e => setPurpose(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Start Time</label>
              <input type="datetime-local" className="form-control" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="datetime-local" className="form-control" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleCreateBooking} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Booking'}
          </button>
        </div>
      )}

      <div className="card">
        {loading && <p>Loading bookings...</p>}
        {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
        
        {!loading && !error && (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Asset ID</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Status</th>
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
                      <td>{booking.asset_id}</td>
                      <td>{new Date(booking.start_time).toLocaleString()}</td>
                      <td>{new Date(booking.end_time).toLocaleString()}</td>
                      <td>
                        <span className={`badge badge-${booking.status === 'confirmed' ? 'success' : booking.status === 'pending' ? 'warning' : 'neutral'}`}>
                          {booking.status || 'unknown'}
                        </span>
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
