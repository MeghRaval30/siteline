import { Outlet, NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Settings, 
  Calendar, 
  Wrench,
  FileText,
  LogOut,
  Bell
} from 'lucide-react';

export default function Layout() {
  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Package className="text-primary" size={24} />
          <h2>SiteLine</h2>
        </div>
        <nav className="sidebar-nav">
          <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          <NavLink to="/assets" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Package size={20} />
            <span>Assets</span>
          </NavLink>

          <NavLink to="/maintenance" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Wrench size={20} />
            <span>Maintenance</span>
          </NavLink>

          <NavLink to="/bookings" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Calendar size={20} />
            <span>Bookings</span>
          </NavLink>
          
          <NavLink to="/reports" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <FileText size={20} />
            <span>Reports & Audits</span>
          </NavLink>

          <NavLink to="/settings" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Organization</span>
          </NavLink>
        </nav>
        
        <div style={{ padding: '1rem' }}>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start' }}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <h3 style={{color: 'var(--text-secondary)'}}>Welcome back</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%' }}>
              <Bell size={20} />
            </button>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold' }}>
              AF
            </div>
          </div>
        </header>
        
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
