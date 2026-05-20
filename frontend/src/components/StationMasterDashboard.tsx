import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Check, X, Clock, Calendar, Car, Zap, TrendingUp, Users, CheckCircle } from 'lucide-react';
import Loader from './Loader';

interface Booking {
  _id: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  station: {
    name: string;
  };
  vehicleNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Cancelled';
  createdAt: string;
}

const StationMasterDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    totalRevenue: 0,
    totalUsers: 0
  });

  const fetchBookings = async () => {
    try {
      const response: any = await api.get('/bookings/station-master');
      if (response.success) {
        setBookings(response.data);
        calculateStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching station bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Booking[]) => {
    const pending = data.filter(b => b.status === 'Pending').length;
    const approved = data.filter(b => b.status === 'Approved' || b.status === 'Completed').length;
    const revenue = data.filter(b => b.status === 'Completed' || b.status === 'Approved').reduce((acc, curr) => acc + curr.totalAmount, 0);
    const users = new Set(data.map(b => b.user.email)).size;

    setStats({
      pending,
      approved,
      totalRevenue: revenue,
      totalUsers: users
    });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      const response: any = await api.put(`/bookings/${id}/${action}`);
      if (response.success) {
        // Refresh local state
        setBookings(prev => prev.map(b => b._id === id ? { ...b, status: action === 'approve' ? 'Approved' : 'Rejected' } : b));
        fetchBookings(); // Recalculate stats
      }
    } catch (error) {
      alert(`Failed to ${action} booking`);
    }
  };

  if (loading) return <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Loader size={40} /></div>;

  return (
    <div style={{ padding: '30px', background: '#020617', minHeight: '100vh', color: 'white' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '10px' }}>Station Operations</h1>
        <p style={{ color: '#94a3b8' }}>Manage incoming charging requests and monitor station performance.</p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <StatCard title="Pending Requests" value={stats.pending} icon={<Clock color="#f59e0b" />} color="rgba(245, 158, 11, 0.1)" />
        <StatCard title="Approved Today" value={stats.approved} icon={<CheckCircle color="#22c55e" />} color="rgba(34, 197, 94, 0.1)" />
        <StatCard title="Total Revenue" value={`₹${stats.totalRevenue}`} icon={<TrendingUp color="#38bdf8" />} color="rgba(56, 189, 248, 0.1)" />
        <StatCard title="Active Users" value={stats.totalUsers} icon={<Users color="#a855f7" />} color="rgba(168, 85, 247, 0.1)" />
      </div>

      <div style={{ background: '#0f172a', borderRadius: '20px', border: '1px solid #1e293b', overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Recent Requests</h2>
          <button onClick={fetchBookings} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '14px' }}>Refresh List</button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                <th style={{ padding: '20px' }}>User / Vehicle</th>
                <th style={{ padding: '20px' }}>Date & Time</th>
                <th style={{ padding: '20px' }}>Station</th>
                <th style={{ padding: '20px' }}>Status</th>
                <th style={{ padding: '20px' }}>Amount</th>
                <th style={{ padding: '20px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '100px', textAlign: 'center', color: '#64748b' }}>
                    No booking requests found.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking._id} style={{ borderTop: '1px solid #1e293b', transition: 'background 0.2s' }}>
                    <td style={{ padding: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Car size={20} color="#38bdf8" />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'white' }}>{booking.user.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{booking.vehicleNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '20px' }}>
                      <div style={{ fontSize: '14px', color: 'white' }}>{new Date(booking.date).toLocaleDateString()}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{booking.startTime} - {booking.endTime}</div>
                    </td>
                    <td style={{ padding: '20px', color: '#94a3b8', fontSize: '14px' }}>{booking.station.name}</td>
                    <td style={{ padding: '20px' }}>
                      <StatusBadge status={booking.status} />
                    </td>
                    <td style={{ padding: '20px', fontWeight: 'bold', color: '#38bdf8' }}>₹{booking.totalAmount}</td>
                    <td style={{ padding: '20px', textAlign: 'right' }}>
                      {booking.status === 'Pending' && (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            onClick={() => handleAction(booking._id, 'approve')}
                            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            title="Approve"
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            onClick={() => handleAction(booking._id, 'reject')}
                            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            title="Reject"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                      {booking.status !== 'Pending' && (
                        <span style={{ fontSize: '12px', color: '#475569' }}>Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) => (
  <div style={{ background: '#0f172a', padding: '25px', borderRadius: '20px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '20px' }}>
    <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>{title}</div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>{value}</div>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    Pending: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' },
    Approved: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e' },
    Rejected: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' },
    Completed: { bg: 'rgba(56, 189, 248, 0.1)', text: '#38bdf8' },
    Cancelled: { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8' },
  };

  const style = styles[status] || styles.Pending;

  return (
    <span style={{ padding: '6px 12px', borderRadius: '20px', background: style.bg, color: style.text, fontSize: '12px', fontWeight: '600' }}>
      {status}
    </span>
  );
};

export default StationMasterDashboard;
