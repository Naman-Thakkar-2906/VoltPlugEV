import { useState, useEffect } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, MapPin, Calendar, LogOut, ChevronRight, Menu, X, 
  Users, BarChart2, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';
import api from '../api/axios';

const AdminLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [counters, setCounters] = useState({
    bookings: 0,
    pending: 0,
    stations: 0,
    users: 0
  });

  const menuItems = [
    { title: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={20} /> },
    { title: 'Users', path: '/admin/users', icon: <Users size={20} />, counter: 'users' },
    { title: 'Stations', path: '/admin/stations', icon: <MapPin size={20} />, counter: 'stations' },
    { title: 'Bookings', path: '/admin/bookings', icon: <Calendar size={20} />, counter: 'pending' },
    { title: 'Analytics', path: '/admin/analytics', icon: <BarChart2 size={20} /> },
  ];

  const fetchCounters = async () => {
    try {
      const res: any = await api.get('/admin/stats');
      if (res.success) {
        setCounters({
          bookings: res.data.totalBookings,
          pending: res.data.pendingBookings,
          stations: res.data.totalStations,
          users: res.data.totalUsers
        });
      }
    } catch (error) {
      console.error('Error fetching counters:', error);
    }
  };

  useEffect(() => {
    fetchCounters();

    if (user && user.role === 'admin') {
      socketService.connect();
      socketService.joinAdminRoom(user);

      const handleUpdate = () => {
        fetchCounters();
      };

      socketService.on('newBookingRequest', handleUpdate);
      socketService.on('bookingUpdated', handleUpdate);
      socketService.on('paymentUpdated', handleUpdate);

      return () => {
        socketService.off('newBookingRequest');
        socketService.off('bookingUpdated');
        socketService.off('paymentUpdated');
      };
    }
  }, [user]);

  const sidebarWidth = isCollapsed ? '80px' : '280px';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020617', color: 'white' }}>
      
      {/* Mobile Header */}
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        height: '64px', 
        background: '#020617', 
        borderBottom: '1px solid #1e293b', 
        display: 'flex', 
        alignItems: 'center', 
        padding: '0 20px',
        zIndex: 90,
        justifyContent: 'space-between'
      }} className="mobile-header">
        <h1 style={{ fontSize: '18px', fontWeight: 'bold' }}>VoltPlug<span style={{ color: '#38bdf8' }}>Admin</span></h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <style>
        {`
          .mobile-header { display: none; }
          .admin-sidebar { transform: translateX(0); }
          .admin-main { margin-left: ${sidebarWidth}; transition: margin-left 0.3s ease; }
          
          .sidebar-link:hover {
            background: rgba(255, 255, 255, 0.05) !important;
            color: white !important;
          }
          .sidebar-link:hover .sidebar-icon {
            transform: scale(1.1);
            color: #38bdf8;
          }

          @media (max-width: 992px) {
            .mobile-header { display: flex; }
            .admin-sidebar { 
              transform: translateX(${isMobileMenuOpen ? '0' : '-100%'}); 
              width: 100% !important;
              max-width: 280px;
            }
            .admin-main { 
              margin-left: 0 !important; 
              padding: 84px 20px 40px !important; 
            }
            .sidebar-overlay {
              display: ${isMobileMenuOpen ? 'block' : 'none'};
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background: rgba(0,0,0,0.7);
              backdrop-filter: blur(4px);
              z-index: 95;
            }
            .collapse-btn { display: none; }
          }
        `}
      </style>

      {/* Sidebar Overlay */}
      <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>

      {/* Sidebar */}
      <aside style={{
        width: sidebarWidth, 
        borderRight: '1px solid #1e293b', 
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        zIndex: 100,
        background: '#020617',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }} className="admin-sidebar">
        
        {/* Logo Section */}
        <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: '12px' }}>
          <div style={{ 
            minWidth: '40px', 
            height: '40px', 
            background: 'linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)'
          }}>
            <MapPin size={22} color="white" />
          </div>
          {!isCollapsed && (
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0 }}>
              VoltPlug<span style={{ color: '#38bdf8' }}>Admin</span>
            </h1>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
            const count = item.counter ? (counters as any)[item.counter] : 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className="sidebar-link"
                onClick={() => setIsMobileMenuOpen(false)}
                title={isCollapsed ? item.title : ''}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: isActive ? 'white' : '#94a3b8',
                  background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.25)' : '1px solid transparent',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  fontWeight: isActive ? '600' : '400',
                  position: 'relative'
                }}
              >
                <div style={{ 
                  color: isActive ? '#38bdf8' : 'inherit',
                  transition: 'transform 0.2s ease',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)'
                }} className="sidebar-icon">
                  {item.icon}
                </div>
                {!isCollapsed && <span>{item.title}</span>}
                
                {/* Counter Badge */}
                {count > 0 && (
                  <span style={{
                    marginLeft: 'auto',
                    background: item.counter === 'pending' ? '#ef4444' : '#38bdf8',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    minWidth: '20px',
                    textAlign: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}>
                    {count}
                  </span>
                )}

                {isActive && !isCollapsed && <div style={{ 
                  position: 'absolute', 
                  right: '-16px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  width: '4px', 
                  height: '24px', 
                  background: '#38bdf8', 
                  borderRadius: '4px 0 0 4px' 
                }} />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="collapse-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              color: '#94a3b8',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            {!isCollapsed && <span>Collapse Sidebar</span>}
          </button>

          <button 
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 14px',
              borderRadius: '12px',
              color: '#ef4444',
              background: 'rgba(239, 68, 68, 0.05)',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              fontWeight: '600'
            }}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '40px' }} className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
