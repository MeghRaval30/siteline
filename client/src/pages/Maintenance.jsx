import { useState, useEffect } from 'react';
import { Wrench, Plus, X, AlertCircle, Clock, CheckCircle } from 'lucide-react';
import { apiClient } from '../api/client';

const PRIO_MAP = { Critical: 'danger', High: 'warning', Medium: 'info', Low: 'neutral' };
const STAT_MAP = { Pending: 'warning', Approved: 'info', InProgress: 'accent', Resolved: 'success', Rejected: 'danger', TechnicianAssigned: 'info' };

export default function Maintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ asset_id: '', issue_description: '', priority: 'Medium' });
  const [filter, setFilter] = useState('All');

  const fetchData = () => {
    setLoading(true);
    apiClient.get('/maintenance-requests').then(d => { setRequests(Array.isArray(d) ? d : d?.requests || []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter);
  const counts = { Pending: requests.filter(r => r.status === 'Pending').length, InProgress: requests.filter(r => ['Approved','InProgress','TechnicianAssigned'].includes(r.status)).length, Resolved: requests.filter(r => r.status === 'Resolved').length };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/maintenance-requests', { asset_id: parseInt(form.asset_id), issue_description: form.issue_description, priority: form.priority });
      setShowModal(false);
      setForm({ asset_id: '', issue_description: '', priority: 'Medium' });
      fetchData();
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="sl-skeleton sl-skeleton--card" style={{height: 400}} />;

  return (
    <div>
      <div className="sl-page__header">
        <div><h1 className="sl-page__title">Maintenance</h1><p className="sl-page__subtitle">Track and manage maintenance requests</p></div>
        <div className="sl-page__actions"><button className="sl-btn sl-btn--primary" onClick={() => setShowModal(true)} id="new-maintenance"><Plus size={16} /> New Request</button></div>
      </div>

      <div className="sl-stats-grid sl-mb-6" style={{gridTemplateColumns: 'repeat(3, 1fr)'}}>
        <div className="sl-stat"><div className="sl-stat__icon sl-stat__icon--warning"><Clock size={20} /></div><div className="sl-stat__label">Pending</div><div className="sl-stat__value">{counts.Pending}</div></div>
        <div className="sl-stat"><div className="sl-stat__icon sl-stat__icon--info"><Wrench size={20} /></div><div className="sl-stat__label">In Progress</div><div className="sl-stat__value">{counts.InProgress}</div></div>
        <div className="sl-stat"><div className="sl-stat__icon sl-stat__icon--success"><CheckCircle size={20} /></div><div className="sl-stat__label">Resolved</div><div className="sl-stat__value">{counts.Resolved}</div></div>
      </div>

      <div className="sl-filters sl-mb-4">
        {['All', 'Pending', 'Approved', 'InProgress', 'Resolved', 'Rejected'].map(s => (
          <button key={s} className={`sl-filter-chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>{s}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="sl-empty"><div className="sl-empty__icon"><Wrench size={24} /></div><div className="sl-empty__title">No requests found</div></div>
      ) : (
        <div className="sl-table-container">
          <table className="sl-table">
            <thead><tr><th>Asset</th><th>Issue</th><th>Priority</th><th>Status</th><th>Raised By</th><th>Date</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id}>
                  <td><div className="sl-font-medium">{r.asset?.name || `#${r.asset_id}`}</div></td>
                  <td className="sl-truncate" style={{maxWidth: 300}}>{r.issue_description}</td>
                  <td><span className={`sl-badge sl-badge--${PRIO_MAP[r.priority]}`}>{r.priority}</span></td>
                  <td><span className={`sl-badge sl-badge--${STAT_MAP[r.status] || 'neutral'}`}>{r.status}</span></td>
                  <td>{r.raiser?.name || 'N/A'}</td>
                  <td className="sl-whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="sl-modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="sl-modal">
            <div className="sl-modal__header"><h2 className="sl-modal__title">New Maintenance Request</h2><button className="sl-btn sl-btn--ghost sl-btn--icon sl-btn--sm" onClick={() => setShowModal(false)}><X size={16} /></button></div>
            <form onSubmit={handleCreate}>
              <div className="sl-modal__body">
                <div className="sl-form-group sl-mb-4"><label className="sl-label">Asset ID *</label><input className="sl-input" type="number" required value={form.asset_id} onChange={e => setForm({...form, asset_id: e.target.value})} placeholder="e.g. 1" /></div>
                <div className="sl-form-group sl-mb-4"><label className="sl-label">Issue Description *</label><textarea className="sl-textarea" required value={form.issue_description} onChange={e => setForm({...form, issue_description: e.target.value})} placeholder="Describe the issue..." /></div>
                <div className="sl-form-group"><label className="sl-label">Priority</label><select className="sl-select" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                  {['Low','Medium','High','Critical'].map(p => <option key={p}>{p}</option>)}
                </select></div>
              </div>
              <div className="sl-modal__footer"><button type="button" className="sl-btn sl-btn--secondary" onClick={() => setShowModal(false)}>Cancel</button><button type="submit" className="sl-btn sl-btn--primary">Submit Request</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
