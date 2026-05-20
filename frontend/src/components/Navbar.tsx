import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Map, LayoutDashboard, LogOut, ShieldCheck, Zap } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav style={{ position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(12px)', padding: '8px 20px', borderRadius: '20px', border: '1px solid rgba(51, 65, 85, 0.5)', display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2000, boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginRight: '15px', borderRight: '1px solid var(--border-color)', paddingRight: '15px' }}>
        <Zap size={20} color="#1a73e8" fill="#1a73e8" style={{ marginRight: '8px' }} />
        <span style={{ fontWeight: '700', letterSpacing: '1px', fontSize: '14px' }}>VOLTPLUG</span>
      </div>

      <Link to="/" style={{ padding: '10px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: isActive('/') ? 'white' : '#94a3b8', background: isActive('/') ? '#1a73e8' : 'transparent', transition: '0.3s' }}>
        <Map size={18} /> <span style={{ fontSize: '14px', fontWeight: '500' }}>Explore</span>
      </Link>

      <Link to="/dashboard" style={{ padding: '10px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: isActive('/dashboard') ? 'white' : '#94a3b8', background: isActive('/dashboard') ? '#1a73e8' : 'transparent', transition: '0.3s' }}>
        <LayoutDashboard size={18} /> <span style={{ fontSize: '14px', fontWeight: '500' }}>Bookings</span>
      </Link>

      {user?.role === 'stationMaster' && (
        <Link to="/station-dashboard" style={{ padding: '10px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: isActive('/station-dashboard') ? 'white' : '#94a3b8', background: isActive('/station-dashboard') ? '#38bdf8' : 'transparent', transition: '0.3s' }}>
          <Zap size={18} /> <span style={{ fontSize: '14px', fontWeight: '500' }}>Owner Area</span>
        </Link>
      )}

      {user?.role === 'admin' && (
        <Link to="/admin" style={{ padding: '10px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: isActive('/admin') ? 'white' : '#94a3b8', background: isActive('/admin') ? '#a855f7' : 'transparent', transition: '0.3s' }}>
          <ShieldCheck size={18} /> <span style={{ fontSize: '14px', fontWeight: '500' }}>Admin Panel</span>
        </Link>
      )}

      {isAuthenticated ? (
        <>
          <div style={{ width: '1px', height: '20px', background: 'var(--border-color)', margin: '0 5px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>{user?.name}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>{user?.role.toUpperCase()}</span>
             </div>
             <button onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '10px', borderRadius: '12px' }}>
               <LogOut size={18} />
             </button>
          </div>
        </>
      ) : (
        <Link to="/login" style={{ padding: '10px 20px', borderRadius: '12px', background: '#1a73e8', color: 'white', fontWeight: '600', fontSize: '14px' }}>
          Login
        </Link>
      )}
    </nav>
  );
};

export default Navbar;
