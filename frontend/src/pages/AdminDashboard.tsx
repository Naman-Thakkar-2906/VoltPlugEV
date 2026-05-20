import { useEffect, useState } from 'react';
import api from '../api/axios';
import { 
  Users, MapPin, Calendar, DollarSign, TrendingUp, 
  Clock, CheckCircle, XCircle, Zap, ArrowUpRight, Activity
} from 'lucide-react';
import { socketService } from '../services/socket';
import { useAuth } from '../context/AuthContext';

interface Stats {
  totalUsers: number;
  totalStations: number;
  totalBookings: number;
  pendingBookings: number;
  approvedBookings: number;
  rejectedBookings: number;
  completedBookings: number;
  totalRevenue: number;
  todayRevenue: number;
}

const SkeletonCard = () => (
  <div style={{ background: '#0f172a', padding: '24px', borderRadius: '24px', border: '1px solid #1e293b' }} className="skeleton-pulse">
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
      <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#1e293b' }}></div>
      <div style={{ width: '60px', height: '24px', borderRadius: '8px', background: '#1e293b' }}></div>
    </div>
    <div style={{ width: '100px', height: '14px', borderRadius: '4px', background: '#1e293b', marginBottom: '12px' }}></div>
    <div style={{ width: '140px', height: '28px', borderRadius: '4px', background: '#1e293b', marginBottom: '12px' }}></div>
    <div style={{ width: '120px', height: '14px', borderRadius: '4px', background: '#1e293b' }}></div>
  </div>
);

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res: any = await api.get('/admin/stats');
      if (res.success) {
        setStats(res.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();

    if (user && user.role === 'admin') {
      const handleUpdate = () => {
        fetchStats();
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

  const mainCards = [
    { title: 'Total Revenue', value: `₹${stats?.totalRevenue.toLocaleString() || 0}`, icon: <DollarSign size={24} color="#eab308" />, sub: `Today: ₹${stats?.todayRevenue.toLocaleString() || 0}`, color: '#eab308' },
    { title: 'Total Bookings', value: stats?.totalBookings || 0, icon: <Calendar size={24} color="#a855f7" />, sub: `${stats?.pendingBookings || 0} Pending Requests`, color: '#a855f7' },
    { title: 'Total Users', value: stats?.totalUsers || 0, icon: <Users size={24} color="#38bdf8" />, sub: 'Registered Customers', color: '#38bdf8' },
    { title: 'Total Stations', value: stats?.totalStations || 0, icon: <MapPin size={24} color="#22c55e" />, sub: 'Active Charging Points', color: '#22c55e' },
  ];

  const statusCards = [
    { title: 'Pending', value: stats?.pendingBookings || 0, icon: <Clock size={20} />, color: '#eab308', bg: 'rgba(234, 179, 8, 0.1)' },
    { title: 'Approved', value: stats?.approvedBookings || 0, icon: <CheckCircle size={20} />, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)' },
    { title: 'Completed', value: stats?.completedBookings || 0, icon: <Zap size={20} />, color: '#22c55e', bg: 'rgba(34, 197, 94, 0.1)' },
    { title: 'Rejected', value: stats?.rejectedBookings || 0, icon: <XCircle size={20} />, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
          .skeleton-pulse {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}
      </style>

      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Dashboard Overview</h1>
          <p style={{ color: '#94a3b8', fontSize: '16px' }}>Welcome back, Admin. Here's what's happening today.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#0f172a', padding: '10px 20px', borderRadius: '14px', border: '1px solid #1e293b' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 10px #22c55e' }}></div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8' }}>Live System Status</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {loading ? (
          [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
        ) : (
          mainCards.map((stat, index) => (
            <div key={index} style={{ background: '#0f172a', padding: '24px', borderRadius: '24px', border: '1px solid #1e293b', position: 'relative', overflow: 'hidden', transition: 'transform 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {stat.icon}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e', fontSize: '14px', fontWeight: '600', background: 'rgba(34, 197, 94, 0.1)', padding: '4px 8px', borderRadius: '8px' }}>
                  <TrendingUp size={14} />
                  <span>Live</span>
                </div>
              </div>
              <div>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>{stat.title}</p>
                <h2 style={{ fontSize: '32px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>{stat.value}</h2>
                <p style={{ fontSize: '13px', color: stat.color, fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={14} /> {stat.sub}
                </p>
              </div>
              <div style={{ position: 'absolute', bottom: '-20px', right: '-20px', opacity: 0.03, transform: 'scale(2.5)' }}>
                {stat.icon}
              </div>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
        {/* Status Breakdown */}
        <div style={{ background: '#0f172a', borderRadius: '28px', border: '1px solid #1e293b', padding: '32px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Booking Status Distribution</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {statusCards.map((status, index) => (
              <div key={index} style={{ background: '#1e293b40', padding: '20px', borderRadius: '20px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: status.bg, color: status.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {status.icon}
                </div>
                <div>
                  <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '2px' }}>{status.title}</p>
                  <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>{status.value}</h3>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '30px', padding: '20px', background: 'rgba(56, 189, 248, 0.05)', borderRadius: '20px', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
            <p style={{ fontSize: '14px', color: '#38bdf8', margin: 0, lineHeight: '1.6' }}>
               Everything looks good! {stats?.pendingBookings || 0} bookings are currently awaiting your review.
            </p>
          </div>
        </div>

        {/* Quick Actions / Recent Activity */}
        <div style={{ background: '#0f172a', borderRadius: '28px', border: '1px solid #1e293b', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>System Overview</h3>
            <ArrowUpRight size={20} color="#38bdf8" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { label: 'Platform Users', value: stats?.totalUsers || 0, color: '#38bdf8' },
              { label: 'Active Stations', value: stats?.totalStations || 0, color: '#22c55e' },
              { label: 'Total Revenue', value: `₹${stats?.totalRevenue.toLocaleString() || 0}`, color: '#eab308' },
              { label: 'Pending Approvals', value: stats?.pendingBookings || 0, color: '#ef4444' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '15px' }}>{item.label}</span>
                <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>{item.value}</span>
              </div>
            ))}
            <div style={{ height: '1px', background: '#1e293b', margin: '10px 0' }}></div>
            <div style={{ display: 'flex', gap: '12px' }}>
               <button 
                onClick={() => window.location.href = '/admin/bookings'}
                style={{ flex: 1, background: '#1e293b', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
               >
                Manage Bookings
               </button>
               <button 
                onClick={() => window.location.href = '/admin/stations'}
                style={{ flex: 1, background: '#38bdf8', color: '#020617', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
               >
                Add Station
               </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
