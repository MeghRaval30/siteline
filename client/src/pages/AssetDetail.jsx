import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, MapPin, Calendar, DollarSign, Wrench, ArrowLeftRight, User } from 'lucide-react';
import { apiClient } from '../api/client';

const BADGE_MAP = { Available: 'success', Allocated: 'info', 'In Maintenance': 'warning', Retired: 'neutral', Lost: 'danger' };

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    apiClient.get(`/assets/${id}`).then(d => { setAsset(d); setLoading(false); }).catch(() => { setLoading(false); navigate('/assets'); });
  }, [id]);

  if (loading) return <div className="sl-skeleton sl-skeleton--card" style={{height: 400}} />;
  if (!asset) return <div className="sl-empty"><div className="sl-empty__title">Asset not found</div></div>;

  const holder = asset.current_holder;

  return (
    <div>
      <button className="sl-btn sl-btn--ghost sl-mb-4" onClick={() => navigate('/assets')} id="back-to-assets"><ArrowLeft size={16} /> Back to Assets</button>

      <div className="sl-card sl-mb-6">
        <div className="sl-card__body">
          <div className="sl-flex sl-items-center sl-justify-between">
            <div>
              <div className="sl-flex sl-items-center sl-gap-3 sl-mb-2">
                <h1 className="sl-page__title">{asset.name}</h1>
                <span className={`sl-badge sl-badge--${BADGE_MAP[asset.status] || 'neutral'}`}>{asset.status}</span>
              </div>
              <div className="sl-flex sl-items-center sl-gap-4 sl-text-sm sl-text-secondary">
                <span className="sl-font-mono">{asset.asset_tag}</span>
                <span>{asset.category?.name}</span>
                {asset.serial_number && <span>SN: {asset.serial_number}</span>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="sl-tabs">
        {['overview', 'allocations', 'maintenance', 'bookings'].map(t => (
          <button key={t} className={`sl-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="sl-card">
            <div className="sl-card__header"><h3 className="sl-card__title">Details</h3></div>
            <div className="sl-card__body">
              {[
                { icon: Package, label: 'Condition', value: asset.condition },
                { icon: MapPin, label: 'Location', value: asset.location || 'N/A' },
                { icon: Calendar, label: 'Acquired', value: asset.acquisition_date ? new Date(asset.acquisition_date).toLocaleDateString() : 'N/A' },
                { icon: DollarSign, label: 'Cost', value: asset.acquisition_cost ? `$${Number(asset.acquisition_cost).toLocaleString()}` : 'N/A' },
              ].map(r => (
                <div key={r.label} className="sl-flex sl-items-center sl-gap-3 sl-mb-4">
                  <r.icon size={16} className="sl-text-muted" />
                  <span className="sl-text-sm sl-text-secondary" style={{width: 80}}>{r.label}</span>
                  <span className="sl-text-sm sl-font-medium">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
          {holder && (
            <div className="sl-card">
              <div className="sl-card__header"><h3 className="sl-card__title">Current Holder</h3></div>
              <div className="sl-card__body">
                <div className="sl-flex sl-items-center sl-gap-3">
                  <div className="sl-avatar sl-avatar--lg"><User size={20} /></div>
                  <div>
                    <div className="sl-font-semibold">{holder.holder_user?.name || holder.holder_department?.name || 'Unknown'}</div>
                    <div className="sl-text-sm sl-text-secondary">Since {new Date(holder.allocated_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'allocations' && (
        <div className="sl-table-container">
          <table className="sl-table">
            <thead><tr><th>Holder</th><th>Allocated By</th><th>Date</th><th>Status</th></tr></thead>
            <tbody>
              {(asset.allocation_history || []).length === 0 ? <tr><td colSpan={4} className="sl-text-center sl-text-muted">No allocation history</td></tr> :
                asset.allocation_history.map(a => (
                  <tr key={a.id}>
                    <td>{a.holder_user?.name || a.holder_department?.name || 'N/A'}</td>
                    <td>{a.allocator?.name || 'N/A'}</td>
                    <td>{new Date(a.allocated_at).toLocaleDateString()}</td>
                    <td><span className={`sl-badge sl-badge--${a.status === 'Active' ? 'success' : a.status === 'Returned' ? 'neutral' : 'danger'}`}>{a.status}</span></td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'maintenance' && (
        <div className="sl-table-container">
          <table className="sl-table">
            <thead><tr><th>Issue</th><th>Priority</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>
              {(asset.maintenance_history || []).length === 0 ? <tr><td colSpan={4} className="sl-text-center sl-text-muted">No maintenance history</td></tr> :
                asset.maintenance_history.map(m => (
                  <tr key={m.id}>
                    <td className="sl-truncate" style={{maxWidth: 300}}>{m.issue_description}</td>
                    <td><span className={`sl-badge sl-badge--${m.priority === 'Critical' ? 'danger' : m.priority === 'High' ? 'warning' : 'info'}`}>{m.priority}</span></td>
                    <td><span className={`sl-badge sl-badge--${m.status === 'Resolved' ? 'success' : m.status === 'Rejected' ? 'danger' : 'warning'}`}>{m.status}</span></td>
                    <td>{new Date(m.created_at).toLocaleDateString()}</td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bookings' && (
        <div className="sl-empty"><div className="sl-empty__icon"><Calendar size={24} /></div><div className="sl-empty__title">Booking history</div><div className="sl-empty__description">View booking history on the Bookings page</div></div>
      )}
    </div>
  );
}
