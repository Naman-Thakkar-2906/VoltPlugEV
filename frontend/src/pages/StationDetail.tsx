import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { ArrowLeft, MapPin, Calendar, DollarSign, Zap, Clock, ShieldCheck } from 'lucide-react';

interface StationStats {
  stationName: string;
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
  availableSlots: number;
}

const StationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState<StationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStationStats = async () => {
      try {
        const res: any = await api.get(`/admin/station/${id}/stats`);
        if (res.success) {
          setStats(res.data);
        }
      } catch (error) {
        console.error('Error fetching station stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStationStats();
  }, [id]);

  if (loading) return <div style={{ color: '#94a3b8', padding: '40px' }}>Loading station dashboard...</div>;
  if (!stats) return <div style={{ color: '#ef4444', padding: '40px' }}>Station not found.</div>;

  return (
    <div>
      <button 
        onClick={() => navigate('/admin/stations')}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          color: '#94a3b8', 
          background: 'transparent', 
          border: 'none', 
          cursor: 'pointer',
          marginBottom: '24px',
          fontSize: '14px'
        }}
      >
        <ArrowLeft size={16} /> Back to Stations
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>{stats.stationName}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b' }}>
            <MapPin size={16} />
            <span>Station Performance Dashboard</span>
          </div>
        </div>
        <div style={{ 
          background: 'rgba(34, 197, 94, 0.1)', 
          color: '#22c55e', 
          padding: '8px 16px', 
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <ShieldCheck size={16} /> Operational
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        {/* Core Stats */}
        <div style={{ background: '#0f172a', padding: '24px', borderRadius: '24px', border: '1px solid #1e293b' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Calendar size={24} color="#38bdf8" />
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Total Bookings</p>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.totalBookings}</h2>
        </div>

        <div style={{ background: '#0f172a', padding: '24px', borderRadius: '24px', border: '1px solid #1e293b' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <DollarSign size={24} color="#22c55e" />
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Total Revenue</p>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>₹{stats.totalRevenue.toLocaleString()}</h2>
        </div>

        <div style={{ background: '#0f172a', padding: '24px', borderRadius: '24px', border: '1px solid #1e293b' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(234, 179, 8, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Clock size={24} color="#eab308" />
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Active Bookings</p>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.activeBookings}</h2>
        </div>

        <div style={{ background: '#0f172a', padding: '24px', borderRadius: '24px', border: '1px solid #1e293b' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(168, 85, 247, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Zap size={24} color="#a855f7" />
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '4px' }}>Available Slots</p>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold' }}>{stats.availableSlots}</h2>
        </div>
      </div>

      <div style={{ gridTemplateColumns: '1fr 1.5fr', display: 'grid', gap: '24px' }}>
        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', padding: '30px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' }}>Peak Hours</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
             {[
               { time: '10 AM - 12 PM', usage: '85%', color: '#ef4444' },
               { time: '2 PM - 4 PM', usage: '60%', color: '#eab308' },
               { time: '6 PM - 9 PM', usage: '90%', color: '#ef4444' },
             ].map((item, i) => (
               <div key={i}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                   <span>{item.time}</span>
                   <span style={{ color: item.color }}>{item.usage} Busy</span>
                 </div>
                 <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: item.usage, height: '100%', background: item.color }}></div>
                 </div>
               </div>
             ))}
          </div>
        </div>

        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', padding: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
           <div style={{ textAlign: 'center' }}>
             <h3 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px' }}>Weekly Utilization</h3>
             <p style={{ color: '#64748b' }}>Average station occupancy per day</p>
           </div>
           <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', height: '150px', width: '100%', padding: '0 20px' }}>
              {[30, 45, 75, 40, 85, 95, 60].map((h, i) => (
                <div key={i} style={{ flex: 1, background: '#38bdf8', height: `${h}%`, borderRadius: '4px' }}></div>
              ))}
           </div>
           <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', color: '#64748b', fontSize: '12px' }}>
              <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default StationDetail;
