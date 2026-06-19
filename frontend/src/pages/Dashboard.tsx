import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { Calendar, Clock, MapPin, MoreVertical, Zap, AlertCircle, CheckCircle, Clock3, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';
import { paymentService } from '../services/paymentService';
import { logger } from '../utils/logger';

interface Booking {
  _id: string;
  vehicleNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Confirmed' | 'Completed' | 'Cancelled';
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  bookingConfirmed: boolean;
  rejectionReason?: string;
  station: {
    name: string;
    address: string;
    city: string;
  };
}

const Dashboard = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBookings = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response: any = await api.get('/bookings/mybookings');
      if (response.success) {
        setBookings(response.data);
      }
    } catch (error) {
      logger.error('Error fetching bookings:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  const { user } = useAuth();

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time socket updates
  useEffect(() => {
    if (user) {
      socketService.connect();
      socketService.joinUserRoom(user._id);

      socketService.on('bookingApproved', (updatedBooking: Booking) => {
        setBookings(prev => {
          const updated = prev.map(b => b._id === updatedBooking._id ? { ...b, ...updatedBooking } : b);
          return updated;
        });
        showToast('Your booking has been APPROVED!');
      });

      socketService.on('bookingRejected', (updatedBooking: Booking) => {
        setBookings(prev => {
          const updated = prev.map(b => b._id === updatedBooking._id ? { ...b, ...updatedBooking } : b);
          return updated;
        });
        showToast('Your booking was rejected.', 'error');
      });

      socketService.on('paymentUpdated', (data: { bookingId: string, paymentStatus: string, bookingConfirmed: boolean }) => {
        setBookings(prev => prev.map(b => 
          b._id === data.bookingId ? { ...b, paymentStatus: data.paymentStatus as any, bookingConfirmed: data.bookingConfirmed } : b
        ));
        if (data.paymentStatus === 'Paid') {
          showToast('Payment Successful! Your booking is now confirmed.');
        }
      });

      return () => {
        socketService.off('bookingApproved');
        socketService.off('bookingRejected');
        socketService.off('paymentUpdated');
      };
    }
  }, [user]);

  const handlePayment = async (bookingId: string) => {
    setPaymentLoading(bookingId);
    try {
      await paymentService.processPayment(
        bookingId,
        () => {
          showToast('Payment successful! Booking confirmed.');
          setBookings(prev => prev.map(b => 
            b._id === bookingId ? { ...b, paymentStatus: 'Paid', bookingConfirmed: true } : b
          ));
        },
        (errorMsg) => {
          showToast(errorMsg, 'error');
        }
      );
    } catch (error: any) {
      showToast(error || 'Payment failed', 'error');
    } finally {
      setPaymentLoading(null);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'Confirmed': return { color: '#38bdf8', icon: <CheckCircle size={14} />, label: 'Confirmed' };
      case 'Approved': return { color: '#22c55e', icon: <Zap size={14} />, label: 'Approved & Ready' };
      case 'Pending': return { color: '#f59e0b', icon: <Clock3 size={14} />, label: 'Waiting Approval' };
      case 'Rejected': return { color: '#ef4444', icon: <XCircle size={14} />, label: 'Rejected' };
      case 'Completed': return { color: '#10b981', icon: <CheckCircle size={14} />, label: 'Completed' };
      case 'Cancelled': return { color: '#64748b', icon: <AlertCircle size={14} />, label: 'Cancelled' };
      default: return { color: '#94a3b8', icon: <AlertCircle size={14} />, label: status };
    }
  };

  return (
    <div className="dashboard-page" style={{ position: 'relative' }}>
      
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

      <header className="dashboard-header">
        <div>
          <h1>Your Bookings</h1>
          <p style={{ color: '#94a3b8', fontSize: 'var(--text-base)' }}>Manage and track your EV charging history</p>
        </div>
        <button 
          onClick={() => fetchBookings()}
          style={{ background: '#1e293b', color: 'white', border: '1px solid #334155', padding: '8px 16px', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          Refresh
        </button>
      </header>

      {loading ? (
        <div style={{ padding: '100px 0' }}><Loader /></div>
      ) : bookings.length === 0 ? (
        <EmptyState 
          message="No bookings found" 
          subMessage="Start by exploring charging stations on the map and book your first slot!" 
        />
      ) : (
        <div className="bookings-grid">
          {bookings.map((booking) => {
            const statusInfo = getStatusInfo(booking.status);
            return (
              <div key={booking._id} style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', padding: '25px', position: 'relative', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', transition: 'transform 0.2s' }}>
                <div style={{ position: 'absolute', top: '0', left: '0', width: '4px', height: '100%', background: statusInfo.color }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', background: `${statusInfo.color}15`, color: statusInfo.color, border: `1px solid ${statusInfo.color}30` }}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </div>
                      {booking.paymentStatus === 'Paid' && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', background: '#22c55e15', color: '#22c55e', border: '1px solid #22c55e30' }}>
                          <CheckCircle size={14} />
                          Paid
                        </div>
                      )}
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 'bold' }}>{booking.station?.name}</h3>
                  </div>
                  <MoreVertical size={20} color="#475569" style={{ cursor: 'pointer' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>
                  <MapPin size={14} /> {booking.station?.address}
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8' }}>
                    <Calendar size={16} color="#38bdf8" /> {format(new Date(booking.date), 'MMM dd, yyyy')}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#94a3b8' }}>
                    <Clock size={16} color="#38bdf8" /> {booking.startTime} - {booking.endTime}
                  </div>
                </div>

                {booking.status === 'Rejected' && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px dashed rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}>Rejection Reason</div>
                    <div style={{ fontSize: '13px', color: '#94a3b8' }}>{booking.rejectionReason || 'No specific reason provided by station master.'}</div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: booking.status === 'Approved' ? '20px' : '0' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vehicle Number</div>
                    <div style={{ fontWeight: 'bold', color: 'white' }}>{booking.vehicleNumber}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Amount</div>
                    <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>₹{booking.totalAmount}</div>
                  </div>
                </div>

                {booking.status === 'Approved' && booking.paymentStatus !== 'Paid' && (
                  <button 
                    onClick={() => handlePayment(booking._id)}
                    disabled={paymentLoading === booking._id}
                    style={{ width: '100%', background: '#22c55e', color: 'white', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: paymentLoading === booking._id ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)', opacity: paymentLoading === booking._id ? 0.7 : 1 }}
                  >
                    {paymentLoading === booking._id ? <div style={{ width: '18px', height: '18px', border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Zap size={18} fill="white" />}
                    {paymentLoading === booking._id ? 'Processing...' : 'Pay & Confirm'}
                  </button>
                )}

                {booking.status === 'Approved' && booking.paymentStatus === 'Paid' && (
                  <div style={{ width: '100%', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)', padding: '12px', borderRadius: '12px', fontSize: '13px', textAlign: 'center', fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <CheckCircle size={16} /> Booking Confirmed
                  </div>
                )}

                {booking.status === 'Pending' && (
                  <div style={{ width: '100%', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '12px', fontSize: '13px', textAlign: 'center', fontWeight: '600' }}>
                    Waiting for Station Approval...
                  </div>
                )}
              </div>
            );
          })}
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

export default Dashboard;
