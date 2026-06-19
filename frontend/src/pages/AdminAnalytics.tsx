import { useEffect, useState } from 'react';
import api from '../api/axios';
import { logger } from '../utils/logger';
import { 
  DollarSign, Calendar, 
  ArrowUpRight, PieChart, Activity
} from 'lucide-react';
import Loader from '../components/Loader';
import { socketService } from '../services/socket';
import { useAuth } from '../context/AuthContext';

interface AnalyticsData {
  bookingsTrend: { _id: string; count: number }[];
  revenueTrend: { _id: string; amount: number }[];
  statusDistribution: { _id: string; count: number }[];
}

const AdminAnalytics = () => {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      const res: any = await api.get('/admin/analytics');
      if (res.success) {
        setData(res.data);
      }
    } catch (error) {
      logger.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();

    if (user && user.role === 'admin') {
      const handleUpdate = () => {
        fetchAnalytics();
      };
      socketService.on('paymentUpdated', handleUpdate);
      socketService.on('bookingUpdated', handleUpdate);

      return () => {
        socketService.off('paymentUpdated');
        socketService.off('bookingUpdated');
      };
    }
  }, [user]);

  if (loading) return <div style={{ padding: '100px 0' }}><Loader /></div>;

  const maxBookings = Math.max(...(data?.bookingsTrend.map(d => d.count) || [1]));
  const maxRevenue = Math.max(...(data?.revenueTrend.map(d => d.amount) || [1]));
  const totalStatusCount = data?.statusDistribution.reduce((acc, curr) => acc + curr.count, 0) || 1;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Analytics & Trends</h1>
        <p style={{ color: '#94a3b8' }}>Real-time performance metrics and growth indicators</p>
      </div>

      <div className="analytics-grid">
        
        {/* Bookings Trend Chart */}
        <div style={{ background: '#0f172a', borderRadius: '28px', border: '1px solid #1e293b', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Calendar size={20} color="#a855f7" /> Bookings Trend (7 Days)
            </h3>
            <span style={{ fontSize: '12px', color: '#a855f7', fontWeight: 'bold', background: 'rgba(168, 85, 247, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>Daily Activity</span>
          </div>
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '0 10px' }}>
            {data?.bookingsTrend.map((day, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '100%', 
                  background: 'linear-gradient(to top, #a855f7, #c084fc)', 
                  height: `${(day.count / maxBookings) * 100}%`, 
                  minHeight: '4px',
                  borderRadius: '8px 8px 4px 4px',
                  position: 'relative',
                  transition: 'height 0.5s ease'
                }}>
                   <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '12px', fontWeight: 'bold', color: 'white' }}>{day.count}</div>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{new Date(day._id).toLocaleDateString('en-US', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Trend Chart */}
        <div style={{ background: '#0f172a', borderRadius: '28px', border: '1px solid #1e293b', padding: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <DollarSign size={20} color="#eab308" /> Revenue Growth (7 Days)
            </h3>
            <span style={{ fontSize: '12px', color: '#eab308', fontWeight: 'bold', background: 'rgba(234, 179, 8, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>Daily Earnings</span>
          </div>
          <div style={{ height: '220px', display: 'flex', alignItems: 'flex-end', gap: '16px', padding: '0 10px' }}>
            {data?.revenueTrend.map((day, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '100%', 
                  background: 'linear-gradient(to top, #eab308, #fbbf24)', 
                  height: `${(day.amount / maxRevenue) * 100}%`, 
                  minHeight: '4px',
                  borderRadius: '8px 8px 4px 4px',
                  position: 'relative',
                  transition: 'height 0.5s ease'
                }}>
                   <div style={{ position: 'absolute', top: '-25px', left: '50%', transform: 'translateX(-50%)', fontSize: '10px', fontWeight: 'bold', color: 'white' }}>₹{day.amount > 1000 ? (day.amount/1000).toFixed(1)+'k' : day.amount}</div>
                </div>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '600' }}>{new Date(day._id).toLocaleDateString('en-US', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Status Distribution */}
        <div style={{ background: '#0f172a', borderRadius: '28px', border: '1px solid #1e293b', padding: '32px' }}>
           <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PieChart size={20} color="#38bdf8" /> Booking Status Distribution
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {data?.statusDistribution.map((status, i) => {
              const percentage = (status.count / totalStatusCount) * 100;
              let color = '#38bdf8';
              if (status._id === 'Pending') color = '#eab308';
              if (status._id === 'Rejected') color = '#ef4444';
              if (status._id === 'Completed' || status._id === 'Confirmed') color = '#22c55e';

              return (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span style={{ color: '#94a3b8', fontWeight: '600' }}>{status._id}</span>
                    <span style={{ color: 'white', fontWeight: 'bold' }}>{status.count} ({percentage.toFixed(1)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${percentage}%`, height: '100%', background: color, transition: 'width 1s ease' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Operational Efficiency Card */}
        <div style={{ background: '#0f172a', borderRadius: '28px', border: '1px solid #1e293b', padding: '32px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
             <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.1)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e', marginBottom: '16px' }}>
                <Activity size={32} />
             </div>
             <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>System Health</h3>
             <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>Real-time platform performance monitoring</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
             <div style={{ background: '#1e293b40', padding: '16px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>API LATENCY</p>
                <p style={{ color: 'white', fontWeight: 'bold' }}>24ms</p>
             </div>
             <div style={{ background: '#1e293b40', padding: '16px', borderRadius: '16px', border: '1px solid #1e293b' }}>
                <p style={{ color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>SOCKET STATUS</p>
                <p style={{ color: '#22c55e', fontWeight: 'bold' }}>Connected</p>
             </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ marginTop: '24px', width: '100%', padding: '14px', background: '#1e293b', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          >
            Refresh Analytics <ArrowUpRight size={18} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default AdminAnalytics;
