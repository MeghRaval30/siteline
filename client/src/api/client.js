// API Client with automatic auth headers and interceptors
const API_BASE = '/api/v1';

async function fetchWithAuth(url, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${url}`, { ...options, headers });
  
  if (response.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }
  
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Something went wrong');
  }
  
  return data;
}

export const apiClient = {
  get: (url) => fetchWithAuth(url),
  post: (url, body) => fetchWithAuth(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => fetchWithAuth(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body) => fetchWithAuth(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => fetchWithAuth(url, { method: 'DELETE' })
};
