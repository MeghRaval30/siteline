import { useState, useEffect } from 'react';
import { ArrowLeftRight, Package, AlertTriangle } from 'lucide-react';
import { apiClient } from '../api/client';

const STATUS_TABS = ['All', 'Active', 'Returned', 'Overdue'];

export default function Allocations() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('All');

  useEffect(() => {
    apiClient.get('/allocations').then(d => { setAllocations(Array.isArray(d) ? d : d?.allocations || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = tab === 'All' ? allocations : tab === 'Overdue'
    ? allocations.filter(a => a.status === 'Active' && a.expected_return_date && new Date(a.expected_return_date) < new Date())
    : allocations.filter(a => a.status === tab);

  const handleReturn = async (id) => {
    if (!confirm('Return this asset?')) return;
    try {
      await apiClient.post(`/allocations/${id}/return`, { condition_at_checkin: 'Good' });
      setAllocations(prev => prev.map(a => a.id === id ? { ...a, status: 'Returned' } : a));
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="sl-skeleton sl-skeleton--card" style={{height: 400}} />;

  return (
    <div>
      <div className="sl-page__header">
        <div><h1 className="sl-page__title">Allocations</h1><p className="sl-page__subtitle">Track asset assignments and returns</p></div>
      </div>

      <div className="sl-tabs">
        {STATUS_TABS.map(t => <button key={t} className={`sl-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t} {t === 'Overdue' && <span className="sl-badge sl-badge--danger sl-ml-auto" style={{marginLeft: 6}}>{allocations.filter(a => a.status === 'Active' && a.expected_return_date && new Date(a.expected_return_date) < new Date()).length}</span>}</button>)}
      </div>

      {filtered.length === 0 ? (
        <div className="sl-empty"><div className="sl-empty__icon"><ArrowLeftRight size={24} /></div><div className="sl-empty__title">No allocations found</div></div>
      ) : (
        <div className="sl-table-container">
          <table className="sl-table">
            <thead><tr><th>Asset</th><th>Assigned To</th><th>Allocated By</th><th>Date</th><th>Expected Return</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(a => {
                const isOverdue = a.status === 'Active' && a.expected_return_date && new Date(a.expected_return_date) < new Date();
                return (
                  <tr key={a.id}>
                    <td><div className="sl-font-medium">{a.asset?.name || `Asset #${a.asset_id}`}</div><div className="sl-text-xs sl-text-muted sl-font-mono">{a.asset?.asset_tag}</div></td>
                    <td>{a.holder_user?.name || a.holder_department?.name || 'N/A'}</td>
                    <td>{a.allocator?.name || 'N/A'}</td>
                    <td className="sl-whitespace-nowrap">{new Date(a.allocated_at).toLocaleDateString()}</td>
                    <td className={isOverdue ? 'sl-text-danger sl-font-semibold' : ''}>
                      {a.expected_return_date ? new Date(a.expected_return_date).toLocaleDateString() : '—'}
                      {isOverdue && <AlertTriangle size={12} className="sl-ml-auto" style={{display: 'inline', marginLeft: 4}} />}
                    </td>
                    <td><span className={`sl-badge sl-badge--${a.status === 'Active' ? (isOverdue ? 'danger' : 'success') : 'neutral'}`}>{isOverdue ? 'Overdue' : a.status}</span></td>
                    <td>{a.status === 'Active' && <button className="sl-btn sl-btn--secondary sl-btn--sm" onClick={() => handleReturn(a.id)}>Return</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
