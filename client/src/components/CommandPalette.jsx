import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Package, LayoutDashboard, Wrench, Calendar, BarChart3, Bot, Building2, ArrowLeftRight, ClipboardCheck, Activity, Settings, Plus, X } from 'lucide-react';
import { apiClient } from '../api/client';

const PAGES = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Assets', to: '/assets', icon: Package },
  { label: 'Allocations', to: '/allocations', icon: ArrowLeftRight },
  { label: 'Maintenance', to: '/maintenance', icon: Wrench },
  { label: 'Bookings', to: '/bookings', icon: Calendar },
  { label: 'Audits', to: '/audits', icon: ClipboardCheck },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Organization', to: '/organization', icon: Building2 },
  { label: 'AI Assistant', to: '/ai-chat', icon: Bot },
  { label: 'Activity Logs', to: '/activity-logs', icon: Activity },
  { label: 'Settings', to: '/settings', icon: Settings },
];

const ACTIONS = [
  { label: 'Add New Asset', to: '/assets', icon: Plus },
  { label: 'Create Booking', to: '/bookings', icon: Calendar },
  { label: 'Open AI Chat', to: '/ai-chat', icon: Bot },
];

export default function CommandPalette({ onClose }) {
  const [query, setQuery] = useState('');
  const [assets, setAssets] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (query.length >= 2) {
      apiClient.get(`/assets?search=${encodeURIComponent(query)}&limit=5`).then(d => {
        setAssets(Array.isArray(d) ? d : d?.assets || []);
      }).catch(() => setAssets([]));
    } else { setAssets([]); }
  }, [query]);

  const filteredPages = PAGES.filter(p => p.label.toLowerCase().includes(query.toLowerCase()));
  const allItems = [
    ...filteredPages.map(p => ({ ...p, type: 'page' })),
    ...assets.map(a => ({ label: `${a.name} (${a.asset_tag})`, to: `/assets/${a.id}`, icon: Package, type: 'asset' })),
    ...(query.length === 0 ? ACTIONS.map(a => ({ ...a, type: 'action' })) : []),
  ];

  const handleSelect = (item) => {
    navigate(item.to);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, allItems.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && allItems[selectedIndex]) handleSelect(allItems[selectedIndex]);
  };

  return (
    <div className="sl-command-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sl-command" onKeyDown={handleKeyDown}>
        <div className="sl-command__input-wrapper">
          <Search size={18} className="sl-text-muted" />
          <input ref={inputRef} className="sl-command__input" placeholder="Search assets, pages, actions..." value={query} onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }} id="command-palette-input" />
          <button className="sl-btn sl-btn--ghost sl-btn--sm" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="sl-command__results">
          {filteredPages.length > 0 && <div className="sl-command__group-label">Pages</div>}
          {filteredPages.map((item, i) => (
            <div key={item.to} className={`sl-command__item ${selectedIndex === i ? 'active' : ''}`} onClick={() => handleSelect(item)}>
              <div className="sl-command__item-icon"><item.icon size={16} /></div>
              <div className="sl-command__item-text"><div className="sl-command__item-title">{item.label}</div></div>
            </div>
          ))}
          {assets.length > 0 && <div className="sl-command__group-label">Assets</div>}
          {assets.map((a, i) => {
            const idx = filteredPages.length + i;
            return (
              <div key={a.id} className={`sl-command__item ${selectedIndex === idx ? 'active' : ''}`} onClick={() => handleSelect({ to: `/assets/${a.id}` })}>
                <div className="sl-command__item-icon"><Package size={16} /></div>
                <div className="sl-command__item-text">
                  <div className="sl-command__item-title">{a.name}</div>
                  <div className="sl-command__item-desc">{a.asset_tag} · {a.status}</div>
                </div>
              </div>
            );
          })}
          {query.length === 0 && <div className="sl-command__group-label">Quick Actions</div>}
          {query.length === 0 && ACTIONS.map((item, i) => {
            const idx = filteredPages.length + assets.length + i;
            return (
              <div key={item.label} className={`sl-command__item ${selectedIndex === idx ? 'active' : ''}`} onClick={() => handleSelect(item)}>
                <div className="sl-command__item-icon"><item.icon size={16} /></div>
                <div className="sl-command__item-text"><div className="sl-command__item-title">{item.label}</div></div>
              </div>
            );
          })}
          {allItems.length === 0 && <div className="sl-p-5 sl-text-center sl-text-muted sl-text-sm">No results found</div>}
        </div>
        <div className="sl-command__footer">
          <span><kbd>↑↓</kbd> Navigate <kbd>↵</kbd> Select <kbd>Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
