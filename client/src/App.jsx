import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AssetDirectory from './pages/AssetDirectory';
import Allocations from './pages/Allocations';
import Maintenance from './pages/Maintenance';
import Bookings from './pages/Bookings';
import Audits from './pages/Audits';
import Reports from './pages/Reports';
import ActivityLogs from './pages/ActivityLogs';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrganizationSetup from './pages/OrganizationSetup';

// Subagents will import their pages here
// e.g. import Dashboard from './pages/Dashboard';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      {/* Engineer A to implement Login */}
      <Route path="/login" element={<Login />} />
      
      {/* Protected Routes inside Layout */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Subagents to mount routes here */}
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="settings" element={<OrganizationSetup />} />
        <Route path="assets" element={<AssetDirectory />} />
        <Route path="allocations" element={<Allocations />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="bookings" element={<Bookings />} />
        <Route path="audits" element={<Audits />} />
        <Route path="reports" element={<Reports />} />
        <Route path="activity-logs" element={<ActivityLogs />} />
      </Route>
    </Routes>
  );
}

export default App;
