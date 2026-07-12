import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

export default function AddAssetModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    serial_number: '',
    condition: 'Excellent',
    location: '',
    acquisition_cost: '',
    is_bookable: false
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      // Reset form
      setFormData({
        name: '',
        category_id: '',
        serial_number: '',
        condition: 'Excellent',
        location: '',
        acquisition_cost: '',
        is_bookable: false
      });
      setError(null);
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    try {
      const data = await apiClient.get('/categories');
      setCategories(data.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const payload = {
        ...formData,
        category_id: parseInt(formData.category_id, 10),
        acquisition_cost: formData.acquisition_cost ? parseFloat(formData.acquisition_cost) : null
      };
      
      await apiClient.post('/assets', payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create asset:', err);
      setError(err.message || 'Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', margin: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2>Add New Asset</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>&times;</button>
        </div>
        
        {error && (
          <div className="badge badge-danger" style={{ display: 'block', marginBottom: '1rem', textAlign: 'center', padding: '0.5rem' }}>
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Asset Name</label>
            <input type="text" name="name" className="form-control" value={formData.name} onChange={handleChange} required />
          </div>
          
          <div className="form-group">
            <label>Category</label>
            <select name="category_id" className="form-control" value={formData.category_id} onChange={handleChange} required>
              <option value="">-- Select Category --</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Serial Number</label>
            <input type="text" name="serial_number" className="form-control" value={formData.serial_number} onChange={handleChange} />
          </div>
          
          <div className="form-group">
            <label>Condition</label>
            <select name="condition" className="form-control" value={formData.condition} onChange={handleChange} required>
              <option value="New">New</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Location</label>
            <input type="text" name="location" className="form-control" value={formData.location} onChange={handleChange} />
          </div>
          
          <div className="form-group">
            <label>Acquisition Cost ($)</label>
            <input type="number" step="0.01" name="acquisition_cost" className="form-control" value={formData.acquisition_cost} onChange={handleChange} />
          </div>
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input type="checkbox" id="is_bookable" name="is_bookable" checked={formData.is_bookable} onChange={handleChange} />
            <label htmlFor="is_bookable" style={{ margin: 0 }}>Available for booking</label>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Add Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
