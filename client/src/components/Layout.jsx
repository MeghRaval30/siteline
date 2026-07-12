import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ArrowLeftRight, Wrench, Calendar, ClipboardCheck, BarChart3, Building2, Bot, Activity, Settings, LogOut, Bell, Search, Menu, X, ChevronDown, TrendingUp } from 'lucide-react';
import CommandPalette from './CommandPalette';
import { apiClient } from '../api/client';

const NAV_SECTIONS = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/assets', icon: Package, label: 'Assets' },
      { to: '/allocations', icon: ArrowLeftRight, label: 'Allocations' },
      { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
      { to: '/bookings', icon: Calendar, label: 'Bookings' },
    ]
  },
  {
    label: 'Management',
    items: [
      { to: '/audits', icon: ClipboardCheck, label: 'Audits' },
      { to: '/reports', icon: BarChart3, label: 'Reports' },
      { to: '/analytics', icon: TrendingUp, label: 'Analytics' },
      { to: '/organization', icon: Building2, label: 'Organization' },
    ]
  },
  {
    label: 'System',
    items: [
      { to: '/ai-chat', icon: Bot, label: 'AI Assistant' },
      { to: '/activity-logs', icon: Activity, label: 'Activity Logs' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ]
  }
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [aiOnline, setAiOnline] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const initials = (user.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const currentPage = NAV_SECTIONS.flatMap(s => s.items).find(i => location.pathname.startsWith(i.to))?.label || 'Dashboard';

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    apiClient.get('/notifications?limit=5').then(d => {
      setNotifications(Array.isArray(d) ? d : d?.notifications || []);
      setUnreadCount(Array.isArray(d) ? d.filter(n => !n.is_read).length : d?.unreadCount || 0);
    }).catch(() => {});
    apiClient.get('/ai/status').then(d => setAiOnline(d?.online)).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const markAllRead = () => {
    apiClient.patch('/notifications/read-all').then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }).catch(() => {});
  };

  return (
    <div className="sl-app">
      <aside className={`sl-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sl-sidebar__logo">
          <div className="sl-sidebar__logo-icon">SL</div>
          <span className="sl-sidebar__logo-text">SiteLine</span>
          <span className="sl-sidebar__logo-badge">Pro</span>
          <button className="sl-btn sl-btn--ghost sl-btn--icon sl-btn--sm" onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto', display: 'none' }} id="sidebar-close-mobile">
            <X size={16} />
          </button>
        </div>

        <nav className="sl-sidebar__nav">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <div className="sl-sidebar__section-label">{section.label}</div>
              {section.items.map(item => (
                <NavLink key={item.to} to={item.to} className={({ isActive }) => `sl-nav-item ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} id={`nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}>
                  <item.icon size={18} className="sl-nav-item__icon" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sl-sidebar__footer">
          <div className={`sl-ai-status ${aiOnline ? 'sl-ai-status--online' : 'sl-ai-status--offline'}`}>
            <span className="sl-ai-status__dot" />
            <span>AI {aiOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </aside>

      <div className="sl-main">
        <header className="sl-topbar">
          <div className="sl-topbar__left">
            <button className="sl-btn sl-btn--ghost sl-btn--icon" onClick={() => setSidebarOpen(!sidebarOpen)} id="sidebar-toggle" style={{ display: 'none' }}>
              <Menu size={20} />
            </button>
            <div className="sl-topbar__breadcrumb">
              <span>SiteLine</span>
              <span className="sl-topbar__breadcrumb-sep">/</span>
              <span className="sl-topbar__breadcrumb-current">{currentPage}</span>
            </div>
          </div>
          <div className="sl-topbar__right">
            <button className="sl-topbar__search" onClick={() => setCommandOpen(true)} id="topbar-search">
              <Search size={14} />
              <span>Search...</span>
              <span className="sl-topbar__search-shortcut">⌘K</span>
            </button>

            <div className="sl-notif-bell" ref={notifRef}>
              <button className="sl-btn sl-btn--ghost sl-btn--icon" onClick={() => setNotifOpen(!notifOpen)} id="notif-bell">
                <Bell size={18} />
                {unreadCount > 0 && <span className="sl-notif-bell__count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>
              {notifOpen && (
                <div className="sl-notif-panel">
                  <div className="sl-notif-panel__header">
                    <span className="sl-notif-panel__title">Notifications</span>
                    <button className="sl-btn sl-btn--ghost sl-btn--sm" onClick={markAllRead}>Mark all read</button>
                  </div>
                  <div className="sl-notif-panel__list">
                    {notifications.length === 0 ? (
                      <div className="sl-p-5 sl-text-center sl-text-muted sl-text-sm">No notifications</div>
                    ) : notifications.map(n => (
                      <div key={n.id} className={`sl-notif-item ${!n.is_read ? 'sl-notif-item--unread' : ''}`}>
                        <div className="sl-notif-item__content">
                          <div className="sl-notif-item__message">{n.message}</div>
                          <div className="sl-notif-item__time">{new Date(n.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sl-relative" ref={userRef}>
              <button className="sl-sidebar__user" onClick={() => setUserMenuOpen(!userMenuOpen)} id="user-menu-btn">
                <div className="sl-avatar">{initials}</div>
                <ChevronDown size={14} className="sl-text-muted" />
              </button>
              {userMenuOpen && (
                <div className="sl-dropdown">
                  <div className="sl-p-4" style={{ borderBottom: '1px solid var(--sl-border-subtle)' }}>
                    <div className="sl-font-semibold sl-text-sm">{user.name || 'User'}</div>
                    <div className="sl-text-xs sl-text-muted">{user.email}</div>
                    <div className="sl-badge sl-badge--accent sl-mt-1">{user.role}</div>
                  </div>
                  <button className="sl-dropdown__item" onClick={() => { navigate('/settings'); setUserMenuOpen(false); }}>
                    <Settings size={14} /> Settings
                  </button>
                  <div className="sl-dropdown__separator" />
                  <button className="sl-dropdown__item sl-dropdown__item--danger" onClick={handleLogout}>
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="sl-page">
          <Outlet />
        </main>
      </div>

      {commandOpen && <CommandPalette onClose={() => setCommandOpen(false)} />}

      <style>{`
        @media (max-width: 768px) {
          #sidebar-close-mobile, #sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
