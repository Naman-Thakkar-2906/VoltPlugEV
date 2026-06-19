import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { Check, X, Clock, Calendar, Car, TrendingUp, Users, CheckCircle, MapPin, AlertCircle } from 'lucide-react';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';
import { logger } from '../utils/logger';

export type BookingStatus =
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Confirmed"
  | "Completed"
  | "Cancelled";

interface Booking {
  _id: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  station: {
    name: string;
    address: string;
  };
  vehicleNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  status: BookingStatus;
  paymentStatus?: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  bookingConfirmed?: boolean;
  createdAt: string;
}

const StationMasterDashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    totalRevenue: 0,
    totalUsers: 0
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBookings = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response: any = await api.get('/bookings/station-master');
      if (response.success) {
        setBookings(response.data);
        calculateStats(response.data);
      }
    } catch (error) {
      logger.error('Error fetching station bookings:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  const calculateStats = (data: Booking[]) => {
    const pending = data.filter(b => b.status.toLowerCase() === 'pending').length;
    const approved = data.filter(b => b.status === 'Approved' || b.status === 'Confirmed' || b.status === 'Completed').length;
    const revenue = data.filter(b => b.paymentStatus === 'Paid' || b.status === 'Confirmed' || b.status === 'Completed').reduce((acc, curr) => acc + curr.totalAmount, 0);
    const users = new Set(data.map(b => b.user.email)).size;

    setStats({
      pending,
      approved,
      totalRevenue: revenue,
      totalUsers: users
    });
  };

  const { user } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time socket updates
  useEffect(() => {
    if (user) {
      socketService.connect();
      socketService.joinStationMasterRoom(user._id);

      socketService.on('newBookingRequest', (newBooking: Booking) => {
        setBookings(prev => {
          const updated = [newBooking, ...prev];
          calculateStats(updated);
          return updated;
        });
        showToast('New Booking Request Received!');
        
        // Sound notification
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
          audio.play();
        } catch (e) {
          logger.log('Audio playback failed');
        }
      });

      socketService.on('paymentUpdated', (data: { bookingId: string, paymentStatus: any, bookingConfirmed: boolean }) => {
        setBookings(prev => {
          const updated = prev.map((b): Booking => b._id === data.bookingId ? { ...b, paymentStatus: data.paymentStatus, bookingConfirmed: data.bookingConfirmed } : b);
          calculateStats(updated);
          return updated;
        });
      });

      socketService.on('bookingUpdated', (updatedBooking: Booking) => {
        setBookings(prev => {
          const updated = prev.map((b): Booking => b._id === updatedBooking._id ? { ...b, ...updatedBooking } : b);
          calculateStats(updated);
          return updated;
        });
      });

      return () => {
        socketService.off('newBookingRequest');
        socketService.off('paymentUpdated');
        socketService.off('bookingUpdated');
      };
    }
  }, [user, bookings, calculateStats]);

  const handleApprove = async (id: string) => {
    if (actionLoading) return;
    setActionLoading(id);
    try {
      const response: any = await api.put(`/bookings/${id}/approve`);
      if (response.success) {
        showToast('Booking Approved Successfully');
        // Instant UI Update
        const updatedBookings = bookings.map((b): Booking => b._id === id ? { ...b, status: 'Approved' } : b);
        setBookings(updatedBookings);
        calculateStats(updatedBookings);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to approve booking';
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedBookingId || !rejectionReason.trim() || actionLoading) return;
    
    const id = selectedBookingId;
    setActionLoading(id);
    try {
      const response: any = await api.put(`/bookings/${id}/reject`, { rejectionReason });
      if (response.success) {
        showToast('Booking Rejected Successfully');
        // Instant UI Update
        const updatedBookings = bookings.map((b): Booking => b._id === id ? { ...b, status: 'Rejected' } : b);
        setBookings(updatedBookings);
        calculateStats(updatedBookings);
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedBookingId(null);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || error.message || 'Failed to reject booking';
      showToast(message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (id: string) => {
    setSelectedBookingId(id);
    setShowRejectModal(true);
  };

  if (loading) return <Loader fullPage />;

  return (
    <div className="smd-page">
      
      {/* Toast Notification */}
      {toast && (
        <div style={{ 
          position: 'fixed', 
          top: '20px', 
          right: '20px', 
          background: toast.type === 'success' ? '#10b981' : '#ef4444', 
          color: 'white', 
          padding: '12px 24px', 
          borderRadius: '12px', 
          zIndex: 2000, 
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span style={{ fontWeight: '600' }}>{toast.message}</span>
        </div>
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header className="smd-header">
          <div>
            <h1 style={{ fontWeight: 'bold', marginBottom: '10px' }}>Owner Operations</h1>
            <p style={{ color: '#94a3b8', fontSize: 'var(--text-base)' }}>Review requests and manage your charging station efficiency.</p>
          </div>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ background: '#1e293b', color: 'white', padding: '10px 20px', borderRadius: '12px', border: '1px solid #334155', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0, whiteSpace: 'nowrap' }}
            onMouseOver={(e) => (e.currentTarget.style.background = '#334155')}
            onMouseOut={(e) => (e.currentTarget.style.background = '#1e293b')}
          >
            Back to Map
          </button>
        </header>

        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard title="Pending Approvals" value={stats.pending} icon={<Clock color="#f59e0b" />} color="rgba(245, 158, 11, 0.1)" />
          <StatCard title="Approved / Live" value={stats.approved} icon={<CheckCircle color="#22c55e" />} color="rgba(34, 197, 94, 0.1)" />
          <StatCard title="Estimated Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={<TrendingUp color="#38bdf8" />} color="rgba(56, 189, 248, 0.1)" />
          <StatCard title="Station Users" value={stats.totalUsers} icon={<Users color="#a855f7" />} color="rgba(168, 85, 247, 0.1)" />
        </div>

        <div className="bookings-table-wrapper" style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
          <div style={{ padding: '25px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Incoming Booking Requests</h2>
            <button onClick={() => fetchBookings()} style={{ background: 'transparent', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>Refresh Dashboard</button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: '#64748b', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                  <th style={{ padding: '20px 25px' }}>Driver Info</th>
                  <th style={{ padding: '20px 25px' }}>Schedule</th>
                  <th style={{ padding: '20px 25px' }}>Station</th>
                  <th style={{ padding: '20px 25px' }}>Status</th>
                  <th style={{ padding: '20px 25px' }}>Price</th>
                  <th style={{ padding: '20px 25px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '100px', textAlign: 'center', color: '#475569' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                        <Calendar size={48} opacity={0.2} />
                        <div>No booking data found for your stations.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking._id} style={{ borderTop: '1px solid #1e293b', transition: 'background 0.2s' }}>
                      <td style={{ padding: '20px 25px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Car size={22} color="#38bdf8" />
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: 'white' }}>{booking.user.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>Vehicle: {booking.vehicleNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '20px 25px' }}>
                        <div style={{ fontSize: '14px', color: 'white', fontWeight: '500' }}>{new Date(booking.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{booking.startTime} - {booking.endTime}</div>
                      </td>
                      <td style={{ padding: '20px 25px' }}>
                        <div style={{ fontSize: '14px', color: '#94a3b8' }}>{booking.station.name}</div>
                        <div style={{ fontSize: '11px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={10} /> {booking.station.address.split(',')[0]}</div>
                      </td>
                      <td style={{ padding: '20px 25px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <StatusBadge status={booking.status} />
                          {booking.paymentStatus === 'Paid' && (
                            <span style={{ fontSize: '10px', color: '#22c55e', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle size={10} /> PAID
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '20px 25px', fontWeight: 'bold', color: '#38bdf8' }}>
                        <div>₹{booking.totalAmount}</div>
                        <div style={{ fontSize: '10px', color: booking.paymentStatus === 'Paid' ? '#22c55e' : '#64748b' }}>
                          {booking.paymentStatus === 'Paid' ? 'Razorpay' : 'Unpaid'}
                        </div>
                      </td>
                      <td style={{ padding: '20px 25px', textAlign: 'right' }}>
                        {booking.status.toLowerCase() === 'pending' && (
                          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => handleApprove(booking._id)}
                              disabled={actionLoading !== null}
                              style={{ height: '38px', padding: '0 15px', borderRadius: '12px', background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: actionLoading && actionLoading !== booking._id ? 0.5 : 1 }}
                              onMouseOver={(e) => !actionLoading && (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)')}
                              onMouseOut={(e) => !actionLoading && (e.currentTarget.style.background = 'rgba(34, 197, 94, 0.1)')}
                              title="Approve Request"
                            >
                              {actionLoading === booking._id ? <div style={{ width: '16px', height: '16px', border: '2px solid transparent', borderTopColor: '#22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <><Check size={18} /> <span style={{ fontSize: '13px', fontWeight: '600' }}>Approve</span></>}
                            </button>
                            <button 
                              onClick={() => openRejectModal(booking._id)}
                              disabled={actionLoading !== null}
                              style={{ height: '38px', padding: '0 15px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: actionLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', opacity: actionLoading && actionLoading !== booking._id ? 0.5 : 1 }}
                              onMouseOver={(e) => !actionLoading && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                              onMouseOut={(e) => !actionLoading && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                              title="Reject Request"
                            >
                              <X size={18} /> <span style={{ fontSize: '13px', fontWeight: '600' }}>Reject</span>
                            </button>
                          </div>
                        )}
                        {booking.status.toLowerCase() !== 'pending' && (
                          <span style={{ fontSize: '11px', color: '#334155', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>Archived</span>
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

      {/* Rejection Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1500 }}>
          <div style={{ background: '#0f172a', width: '90%', maxWidth: '450px', borderRadius: '24px', border: '1px solid #1e293b', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '12px' }}>
                <AlertCircle color="#ef4444" size={24} />
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>Reject Booking</h3>
            </div>
            
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>Please provide a reason for rejecting this booking. This will be visible to the user.</p>
            
            <textarea 
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Station maintenance, slot already occupied..."
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '15px', color: 'white', minHeight: '100px', outline: 'none', marginBottom: '25px', resize: 'none' }}
            />
            
            <div style={{ display: 'flex', gap: '15px' }}>
              <button 
                onClick={() => setShowRejectModal(false)}
                style={{ flex: 1, background: 'transparent', color: 'white', border: '1px solid #334155', padding: '12px', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={!rejectionReason.trim() || actionLoading !== null}
                style={{ flex: 1, background: '#ef4444', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: '600', cursor: (!rejectionReason.trim() || actionLoading) ? 'not-allowed' : 'pointer', opacity: (!rejectionReason.trim() || actionLoading) ? 0.6 : 1 }}
              >
                {actionLoading ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) => (
  <div style={{ background: '#0f172a', padding: '25px', borderRadius: '24px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '20px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
    <div style={{ width: '56px', height: '56px', borderRadius: '18px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px', fontWeight: '500' }}>{title}</div>
      <div style={{ fontSize: '26px', fontWeight: 'bold', color: 'white' }}>{value}</div>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = {
    Pending: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', dot: '#f59e0b' },
    Approved: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', dot: '#22c55e' },
    Confirmed: { bg: 'rgba(56, 189, 248, 0.1)', text: '#38bdf8', dot: '#38bdf8' },
    Rejected: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', dot: '#ef4444' },
    Completed: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', dot: '#10b981' },
    Cancelled: { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', dot: '#94a3b8' },
  };

  const style = styles[status] || styles.Pending;

  return (
    <span style={{ padding: '6px 14px', borderRadius: '20px', background: style.bg, color: style.text, fontSize: '11px', fontWeight: '700', display: 'inline-flex', alignItems: 'center', gap: '6px', border: `1px solid ${style.bg}` }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: style.dot }}></div>
      {status}
    </span>
  );
};

export default StationMasterDashboard;
