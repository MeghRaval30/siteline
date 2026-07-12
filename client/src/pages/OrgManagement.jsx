import { useState, useEffect } from 'react';
import { Building2, Users, Plus, X } from 'lucide-react';
import { apiClient } from '../api/client';

export default function OrgManagement() {
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '' });

  useEffect(() => {
    Promise.all([
      apiClient.get('/departments').catch(() => []),
      apiClient.get('/employees').catch(() => []),
    ]).then(([d, e]) => {
      setDepartments(Array.isArray(d) ? d : []);
      setEmployees(Array.isArray(e) ? e : []);
      setLoading(false);
    });
  }, []);

  const handleCreateDept = async (e) => {
    e.preventDefault();
    try {
      const dept = await apiClient.post('/departments', deptForm);
      setDepartments(prev => [...prev, dept]);
      setShowDeptModal(false);
      setDeptForm({ name: '' });
    } catch (err) { alert(err.message); }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await apiClient.patch(`/employees/${id}/role`, { role });
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, role } : e));
    } catch (err) { alert(err.message); }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      await apiClient.patch(`/employees/${id}/status`, { status: newStatus });
      setEmployees(prev => prev.map(e => e.id === id ? { ...e, status: newStatus } : e));
    } catch (err) { alert(err.message); }
  };

  if (loading) return <div className="sl-skeleton sl-skeleton--card" style={{height: 400}} />;

  return (
    <div>
      <div className="sl-page__header"><div><h1 className="sl-page__title">Organization</h1><p className="sl-page__subtitle">Manage departments and employees</p></div></div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        <div className="sl-card">
          <div className="sl-card__header">
            <h3 className="sl-card__title">Departments ({departments.length})</h3>
            <button className="sl-btn sl-btn--ghost sl-btn--sm" onClick={() => setShowDeptModal(true)}><Plus size={14} /></button>
          </div>
          <div className="sl-card__body">
            {departments.map(d => (
              <div key={d.id} className="sl-flex sl-items-center sl-gap-3 sl-mb-3">
                <div className="sl-avatar sl-avatar--sm"><Building2 size={12} /></div>
                <div className="sl-flex-1">
                  <div className="sl-font-medium sl-text-sm">{d.name}</div>
                  <div className="sl-text-xs sl-text-muted">{d.head_user?.name ? `Head: ${d.head_user.name}` : 'No head assigned'}</div>
                </div>
                <span className={`sl-badge sl-badge--${d.status === 'Active' ? 'success' : 'neutral'} sl-badge--dot`}>{d.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="sl-card">
          <div className="sl-card__header"><h3 className="sl-card__title">Employees ({employees.length})</h3></div>
          <div className="sl-table-container" style={{border: 'none'}}>
            <table className="sl-table sl-table--compact">
              <thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id}>
                    <td className="sl-font-medium">{emp.name}</td>
                    <td className="sl-text-muted">{emp.email}</td>
                    <td>{emp.department?.name || 'N/A'}</td>
                    <td><span className={`sl-badge sl-badge--${emp.role === 'Admin' ? 'accent' : emp.role === 'AssetManager' ? 'info' : 'neutral'}`}>{emp.role}</span></td>
                    <td>
                      <button className={`sl-badge sl-badge--${emp.status === 'Active' ? 'success' : 'danger'} sl-badge--dot sl-cursor-pointer`} onClick={() => handleStatusToggle(emp.id, emp.status)} style={{border: 'none', background: emp.status === 'Active' ? 'var(--sl-success-muted)' : 'var(--sl-danger-muted)'}}>
                        {emp.status}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showDeptModal && (
        <div className="sl-modal-backdrop" onClick={e => e.target === e.currentTarget && setShowDeptModal(false)}>
          <div className="sl-modal">
            <div className="sl-modal__header"><h2 className="sl-modal__title">New Department</h2><button className="sl-btn sl-btn--ghost sl-btn--icon sl-btn--sm" onClick={() => setShowDeptModal(false)}><X size={16} /></button></div>
            <form onSubmit={handleCreateDept}>
              <div className="sl-modal__body"><div className="sl-form-group"><label className="sl-label">Name *</label><input className="sl-input" required value={deptForm.name} onChange={e => setDeptForm({name: e.target.value})} /></div></div>
              <div className="sl-modal__footer"><button type="button" className="sl-btn sl-btn--secondary" onClick={() => setShowDeptModal(false)}>Cancel</button><button type="submit" className="sl-btn sl-btn--primary">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
