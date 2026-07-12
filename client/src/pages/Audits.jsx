import { useState, useEffect } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { apiClient } from '../api/client';

export default function Audits() {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get('/audit-cycles').then(d => { setCycles(Array.isArray(d) ? d : d?.cycles || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="sl-skeleton sl-skeleton--card" style={{height: 300}} />;

  return (
    <div>
      <div className="sl-page__header"><div><h1 className="sl-page__title">Audits</h1><p className="sl-page__subtitle">Asset verification and compliance cycles</p></div></div>
      {cycles.length === 0 ? (
        <div className="sl-empty"><div className="sl-empty__icon"><ClipboardCheck size={24} /></div><div className="sl-empty__title">No audit cycles</div><div className="sl-empty__description">Audit cycles will appear here once created</div></div>
      ) : (
        <div className="sl-table-container">
          <table className="sl-table">
            <thead><tr><th>Name</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Created By</th></tr></thead>
            <tbody>
              {cycles.map(c => (
                <tr key={c.id}>
                  <td className="sl-font-medium">{c.name}</td>
                  <td><span className={`sl-badge sl-badge--${c.status === 'Closed' || c.status === 'Completed' ? 'success' : c.status === 'In Progress' ? 'warning' : 'info'}`}>{c.status}</span></td>
                  <td>{new Date(c.start_date).toLocaleDateString()}</td>
                  <td>{new Date(c.end_date).toLocaleDateString()}</td>
                  <td>{c.creator?.name || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
