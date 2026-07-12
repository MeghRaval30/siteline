import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, X } from 'lucide-react';
import { apiClient } from '../api/client';

const STATUS_FILTERS = ['All', 'Available', 'Allocated', 'In Maintenance', 'Retired', 'Lost'];
const BADGE_MAP = { Available: 'success', Allocated: 'info', 'In Maintenance': 'warning', Retired: 'neutral', Lost: 'danger' };
const COND_MAP = { New: 'success', Good: 'info', Fair: 'warning', Poor: 'danger' };

export default function Assets() {
  const navigate = useNavigate();
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', category_id: '', serial_number: '', location: '', condition: 'Good', is_bookable: false, acquisition_cost: '', acquisition_date: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchAssets = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page, limit: 24 });
    if (search) params.set('search', search);
    if (statusFilter !== 'All') params.set('status', statusFilter);
    apiClient.get(`/assets?${params}`).then(d => {
      setAssets(Array.isArray(d) ? d : d?.assets || []);
      setTotal(d?.total || (Array.isArray(d) ? d.length : 0));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search, statusFilter, page]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { apiClient.get('/categories').then(d => setCategories(Array.isArray(d) ? d : [])).catch(() => {}); }, []);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => { const t = setTimeout(() => setSearch(searchInput), 300); return () => clearTimeout(t); }, [searchInput]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/assets', { ...form, category_id: parseInt(form.category_id), acquisition_cost: form.acquisition_cost ? parseFloat(form.acquisition_cost) : undefined, acquisition_date: form.acquisition_date || undefined });
      setShowModal(false);
      setForm({ name: '', category_id: '', serial_number: '', location: '', condition: 'Good', is_bookable: false, acquisition_cost: '', acquisition_date: '' });
      fetchAssets();
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <div className="sl-page__header">
        <div><h1 className="sl-page__title">Assets</h1><p className="sl-page__subtitle">{total} assets tracked</p></div>
        <div className="sl-page__actions">
          <button className="sl-btn sl-btn--primary" onClick={() => setShowModal(true)} id="add-asset-btn"><Plus size={16} /> Add Asset</button>
        </div>
      </div>

      <div className="sl-filters">
        <div className="sl-filters__search">
          <Search size={16} className="sl-filters__search-icon" />
          <input className="sl-input" placeholder="Search assets..." value={searchInput} onChange={e => setSearchInput(e.target.value)} id="asset-search" style={{ paddingLeft: '2rem' }} />
        </div>
        {STATUS_FILTERS.map(s => (
          <button key={s} className={`sl-filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => { setStatusFilter(s); setPage(1); }}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div className="sl-stats-grid">{[...Array(8)].map((_, i) => <div key={i} className="sl-skeleton sl-skeleton--card" />)}</div>
      ) : assets.length === 0 ? (
        <div className="sl-empty">
          <div className="sl-empty__icon"><Package size={24} /></div>
          <div className="sl-empty__title">No assets found</div>
          <div className="sl-empty__description">Try adjusting your search or filters</div>
        </div>
      ) : (
        <>
          <div className="sl-stats-grid">
            {assets.map(a => (
              <div key={a.id} className="sl-card sl-card--interactive sl-cursor-pointer" onClick={() => navigate(`/assets/${a.id}`)} id={`asset-${a.id}`}>
                <div className="sl-card__body">
                  <div className="sl-flex sl-items-center sl-justify-between sl-mb-2">
                    <span className="sl-font-mono sl-text-xs sl-text-muted">{a.asset_tag}</span>
                    <span className={`sl-badge sl-badge--${BADGE_MAP[a.status] || 'neutral'}`}>{a.status}</span>
                  </div>
                  <div className="sl-font-semibold sl-mb-1 sl-truncate">{a.name}</div>
                  <div className="sl-text-sm sl-text-secondary sl-mb-2">{a.category?.name || 'Uncategorized'}</div>
                  <div className="sl-flex sl-items-center sl-gap-2 sl-text-xs sl-text-muted">
                    {a.location && <span>{a.location}</span>}
                    {a.condition && <span className={`sl-badge sl-badge--${COND_MAP[a.condition] || 'neutral'} sl-badge--dot`}>{a.condition}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="sl-pagination sl-mt-4">
            <span className="sl-pagination__info">Page {page} · {total} total</span>
            <div className="sl-pagination__controls">
              <button className="sl-pagination__btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</button>
              <button className="sl-pagination__btn active">{page}</button>
              <button className="sl-pagination__btn" disabled={assets.length < 24} onClick={() => setPage(p => p + 1)}>→</button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="sl-modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="sl-modal">
            <div className="sl-modal__header">
              <h2 className="sl-modal__title">Add New Asset</h2>
              <button className="sl-btn sl-btn--ghost sl-btn--icon sl-btn--sm" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="sl-modal__body">
                <div className="sl-form-row sl-mb-4">
                  <div className="sl-form-group"><label className="sl-label">Name *</label><input className="sl-input" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  <div className="sl-form-group"><label className="sl-label">Category *</label><select className="sl-select" required value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})}>
                    <option value="">Select...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select></div>
                </div>
                <div className="sl-form-row sl-mb-4">
                  <div className="sl-form-group"><label className="sl-label">Serial Number</label><input className="sl-input" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} /></div>
                  <div className="sl-form-group"><label className="sl-label">Location</label><input className="sl-input" value={form.location} onChange={e => setForm({...form, location: e.target.value})} /></div>
                </div>
                <div className="sl-form-row sl-mb-4">
                  <div className="sl-form-group"><label className="sl-label">Condition</label><select className="sl-select" value={form.condition} onChange={e => setForm({...form, condition: e.target.value})}>
                    {['New','Good','Fair','Poor'].map(c => <option key={c}>{c}</option>)}
                  </select></div>
                  <div className="sl-form-group"><label className="sl-label">Acquisition Cost ($)</label><input className="sl-input" type="number" step="0.01" value={form.acquisition_cost} onChange={e => setForm({...form, acquisition_cost: e.target.value})} /></div>
                </div>
                <div className="sl-form-row">
                  <div className="sl-form-group"><label className="sl-label">Acquisition Date</label><input className="sl-input" type="date" value={form.acquisition_date} onChange={e => setForm({...form, acquisition_date: e.target.value})} /></div>
                </div>
              </div>
              <div className="sl-modal__footer">
                <button type="button" className="sl-btn sl-btn--secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="sl-btn sl-btn--primary">Create Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
