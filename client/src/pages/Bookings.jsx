import { useState, useEffect } from 'react';
import { Calendar, Plus, X } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ asset_id: '', start_time: '', end_time: '', purpose: '' });

  const fetchData = () => {
    setLoading(true);
    apiClient.get('/bookings').then(d => { setBookings(Array.isArray(d) ? d : d?.bookings || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/bookings', { asset_id: parseInt(form.asset_id), start_time: new Date(form.start_time).toISOString(), end_time: new Date(form.end_time).toISOString(), purpose: form.purpose });
      setShowModal(false); setForm({ asset_id: '', start_time: '', end_time: '', purpose: '' }); fetchData();
    } catch (err) { alert(err.message); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this booking?')) return;
    try { await apiClient.post(`/bookings/${id}/cancel`); fetchData(); } catch (err) { alert(err.message); }
  };

  const STAT = { Upcoming: 'info', Ongoing: 'success', Completed: 'neutral', Cancelled: 'danger', confirmed: 'info', Pending: 'warning' };

  if (loading) return <div className="sl-skeleton sl-skeleton--card" style={{height: 400}} />;

  return (
    <div>
      <div className="sl-page__header">
        <div><h1 className="sl-page__title">Bookings</h1><p className="sl-page__subtitle">Manage asset reservations and schedules</p></div>
        <div className="sl-page__actions"><button className="sl-btn sl-btn--primary" onClick={() => setShowModal(true)} id="new-booking"><Plus size={16} /> New Booking</button></div>
      </div>

      {bookings.length === 0 ? (
        <div className="sl-empty"><div className="sl-empty__icon"><Calendar size={24} /></div><div className="sl-empty__title">No bookings</div><div className="sl-empty__description">Create a booking to reserve an asset</div></div>
      ) : (
        <div className="sl-table-container">
          <table className="sl-table">
            <thead><tr><th>Asset</th><th>Booked By</th><th>Start</th><th>End</th><th>Purpose</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b.id}>
                  <td className="sl-font-medium">{b.asset?.name || `#${b.asset_id}`}</td>
                  <td>{b.user?.name || 'N/A'}</td>
                  <td className="sl-whitespace-nowrap">{new Date(b.start_time).toLocaleString()}</td>
                  <td className="sl-whitespace-nowrap">{new Date(b.end_time).toLocaleString()}</td>
                  <td>{b.purpose || '—'}</td>
                  <td><span className={`sl-badge sl-badge--${STAT[b.status] || 'neutral'}`}>{b.status}</span></td>
                  <td>{!['Cancelled','Completed'].includes(b.status) && <button className="sl-btn sl-btn--danger sl-btn--sm" onClick={() => handleCancel(b.id)}>Cancel</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="sl-modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="sl-modal">
            <div className="sl-modal__header"><h2 className="sl-modal__title">New Booking</h2><button className="sl-btn sl-btn--ghost sl-btn--icon sl-btn--sm" onClick={() => setShowModal(false)}><X size={16} /></button></div>
            <form onSubmit={handleCreate}>
              <div className="sl-modal__body">
                <div className="sl-form-group sl-mb-4"><label className="sl-label">Asset ID *</label><input className="sl-input" type="number" required value={form.asset_id} onChange={e => setForm({...form, asset_id: e.target.value})} /></div>
                <div className="sl-form-row sl-mb-4">
                  <div className="sl-form-group"><label className="sl-label">Start *</label><input className="sl-input" type="datetime-local" required value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} /></div>
                  <div className="sl-form-group"><label className="sl-label">End *</label><input className="sl-input" type="datetime-local" required value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} /></div>
                </div>
                <div className="sl-form-group"><label className="sl-label">Purpose</label><input className="sl-input" value={form.purpose} onChange={e => setForm({...form, purpose: e.target.value})} /></div>
              </div>
              <div className="sl-modal__footer"><button type="button" className="sl-btn sl-btn--secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="sl-btn sl-btn--primary">Create Booking</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
