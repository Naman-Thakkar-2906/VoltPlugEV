import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Navbar from './components/Navbar';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminStations from './pages/AdminStations';
import AdminBookings from './pages/AdminBookings';
import AdminAnalytics from './pages/AdminAnalytics';
import StationDetail from './pages/StationDetail';
import StationMasterDashboard from './pages/StationMasterDashboard';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <div style={{ background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  
  return <>{children}</>;
};

// Admin Route Component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return <div style={{ background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading...</div>;
  if (!isAuthenticated || user?.role !== 'admin') return <Navigate to="/" />;
  
  return <>{children}</>;
};

// Station Master Route Component
const StationMasterRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return <div style={{ background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading...</div>;
  if (!isAuthenticated || user?.role !== 'stationMaster') return <Navigate to="/" />;
  
  return <>{children}</>;
};

// Component to redirect logged-in users away from login/register
const LoginRedirect = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return null;
  
  if (isAuthenticated) {
    if (user?.role === 'admin') return <Navigate to="/admin" />;
    if (user?.role === 'stationMaster') return <Navigate to="/station-dashboard" />;
    return <Navigate to="/" />;
  }
  
  return <>{children}</>;
};

// Root Redirect Component
const RootRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  
  if (loading) return <div style={{ background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Loading...</div>;
  
  if (isAuthenticated) {
    if (user?.role === 'admin') return <Navigate to="/admin" />;
    if (user?.role === 'stationMaster') return <Navigate to="/station-dashboard" />;
  }
  
  return <Home />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={
              <LoginRedirect>
                <Login />
              </LoginRedirect>
            } />
            <Route path="/register" element={
              <LoginRedirect>
                <Register />
              </LoginRedirect>
            } />
            
            {/* Protected User Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />

            {/* Station Master Routes */}
            <Route path="/station-dashboard" element={
              <StationMasterRoute>
                <StationMasterDashboard />
              </StationMasterRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="stations" element={<AdminStations />} />
              <Route path="station/:id" element={<StationDetail />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="analytics" element={<AdminAnalytics />} />
            </Route>
          </Routes>
          {/* Hide main navbar on admin pages */}
          <NavbarWrapper />
        </div>
      </Router>
    </AuthProvider>
  );
};

// Helper component to hide Navbar on admin routes
const NavbarWrapper = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) return null;
  return <Navbar />;
};

export default App;
