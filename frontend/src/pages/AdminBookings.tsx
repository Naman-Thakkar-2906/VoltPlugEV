import { useEffect, useState, useCallback, useRef } from 'react';
import api from '../api/axios';
import { logger } from '../utils/logger';
import { 
  Calendar, User, MapPin, Clock, CheckCircle, XCircle, AlertCircle, 
  Search, Filter, ChevronLeft, ChevronRight, Eye, Phone, Mail, 
  CreditCard, Hash, Info, X
} from 'lucide-react';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { socketService } from '../services/socket';
import { useAuth } from '../context/AuthContext';

interface BookingItem {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  station: {
    _id: string;
    name: string;
    address?: string;
    city?: string;
  };
  vehicleNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus?: string;
  bookingConfirmed?: boolean;
  totalAmount: number;
  rejectionReason?: string;
  payment?: {
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
    amountPaid?: number;
    paymentStatus?: string;
    paidAt?: string;
    invoiceId?: string;
    method?: string;
  };
  createdAt: string;
}

const AdminBookings = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalBookings, setTotalBookings] = useState(0);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<BookingItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  const searchTimeout = useRef<any>(null);

  const fetchBookings = useCallback(async (pageNum = page, status = statusFilter, search = searchQuery) => {
    setLoading(true);
    try {
      const res: any = await api.get(`/admin/bookings?page=${pageNum}&limit=10&status=${status}&search=${search}`);
      if (res.success) {
        setBookings(res.data.bookings);
        setTotalPages(res.data.totalPages);
        setTotalBookings(res.data.totalBookings);
        setPage(res.data.currentPage);
      }
    } catch (error) {
      logger.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    fetchBookings();
  }, [page, statusFilter]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    
    searchTimeout.current = setTimeout(() => {
      setPage(1);
      fetchBookings(1, statusFilter, value);
    }, 500);
  };

  useEffect(() => {
    if (user && user.role === 'admin') {
      socketService.connect();
      socketService.joinAdminRoom(user);

      const handleNewBooking = (newBooking: BookingItem) => {
        setBookings(prev => [newBooking, ...prev].slice(0, 10));
        setTotalBookings(prev => prev + 1);
        // show notification if needed
      };

      const handleBookingUpdate = (updatedBooking: BookingItem) => {
        setBookings(prev => prev.map(b => b._id === updatedBooking._id ? updatedBooking : b));
        if (selectedBooking?._id === updatedBooking._id) {
          setSelectedBooking(updatedBooking);
        }
      };

      const handlePaymentUpdate = () => {
        fetchBookings();
      };

      socketService.on('newBookingRequest', handleNewBooking);
      socketService.on('bookingUpdated', handleBookingUpdate);
      socketService.on('paymentUpdated', handlePaymentUpdate);

      return () => {
        socketService.off('newBookingRequest');
        socketService.off('bookingUpdated');
        socketService.off('paymentUpdated');
      };
    }
  }, [user, selectedBooking]);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Confirmed': return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', icon: <CheckCircle size={14} /> };
      case 'Approved': return { bg: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', icon: <CheckCircle size={14} /> };
      case 'Completed': return { bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981', icon: <CheckCircle size={14} /> };
      case 'Rejected': return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', icon: <XCircle size={14} /> };
      case 'Cancelled': return { bg: 'rgba(148, 163, 184, 0.1)', color: '#94a3b8', icon: <XCircle size={14} /> };
      default: return { bg: 'rgba(234, 179, 8, 0.1)', color: '#eab308', icon: <AlertCircle size={14} /> };
    }
  };

  const openDetails = (booking: BookingItem) => {
    setSelectedBooking(booking);
    setShowModal(true);
  };

  return (
    <div style={{ padding: '0 20px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white' }}>Booking Management</h1>
          <p style={{ color: '#94a3b8' }}>Monitor and manage all system reservations in real-time</p>
        </div>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
            <input 
              type="text" 
              placeholder="Search user, station, vehicle..." 
              value={searchQuery}
              onChange={handleSearch}
              style={{ 
                background: '#0f172a', 
                border: '1px solid #1e293b', 
                color: 'white', 
                padding: '10px 12px 10px 40px', 
                borderRadius: '12px',
                width: '280px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#38bdf8'}
              onBlur={(e) => e.target.style.borderColor = '#1e293b'}
            />
          </div>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Filter style={{ position: 'absolute', left: '12px', color: '#64748b' }} size={16} />
            <select 
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              style={{ 
                background: '#0f172a', 
                border: '1px solid #1e293b', 
                color: 'white', 
                padding: '10px 12px 10px 36px', 
                borderRadius: '12px',
                outline: 'none',
                appearance: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {loading && page === 1 && bookings.length === 0 ? (
        <div style={{ padding: '100px 0' }}><Loader /></div>
      ) : bookings.length === 0 ? (
        <EmptyState 
          message="No bookings found" 
          subMessage={searchQuery ? "Try adjusting your search or filters" : "Reservations will appear here once users start booking slots."} 
        />
      ) : (
        <>
          <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden', marginBottom: '24px' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ background: '#1e293b' }}>
                    <th style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>USER / VEHICLE</th>
                    <th style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>STATION</th>
                    <th style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>DATE & TIME</th>
                    <th style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>AMOUNT</th>
                    <th style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>STATUS</th>
                    <th style={{ padding: '16px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking) => {
                    const statusInfo = getStatusStyle(booking.status);
                    return (
                      <tr key={booking._id} style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.2s' }}>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #334155' }}>
                              <User size={20} color="#94a3b8" />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '600', color: 'white' }}>{booking.user?.name || 'Unknown'}</span>
                              <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: '500' }}>{booking.vehicleNumber}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                            <MapPin size={16} color="#38bdf8" />
                            <span>{booking.station?.name || 'Deleted Station'}</span>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: 'white' }}>
                              <Calendar size={14} color="#64748b" />
                              <span>{new Date(booking.date).toLocaleDateString()}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#94a3b8' }}>
                              <Clock size={14} />
                              <span>{booking.startTime} - {booking.endTime}</span>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 'bold', color: 'white' }}>₹{booking.totalAmount}</span>
                            <span style={{ 
                              fontSize: '11px', 
                              color: booking.paymentStatus === 'Paid' || booking.status === 'Confirmed' || booking.status === 'Completed' ? '#22c55e' : '#64748b',
                              fontWeight: '600'
                            }}>
                              {booking.paymentStatus === 'Paid' ? 'Paid' : 'Unpaid'}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '6px 12px', 
                            borderRadius: '20px', 
                            background: statusInfo.bg, 
                            color: statusInfo.color,
                            fontSize: '12px',
                            fontWeight: '600',
                            width: 'fit-content'
                          }}>
                            {statusInfo.icon}
                            <span>{booking.status}</span>
                          </div>
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <button 
                            onClick={() => openDetails(booking)}
                            style={{ 
                              background: '#1e293b', 
                              border: '1px solid #334155', 
                              color: 'white', 
                              padding: '8px', 
                              borderRadius: '10px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#334155'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#1e293b'}
                          >
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '14px' }}>
            <span>Showing {bookings.length} of {totalBookings} bookings</span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                style={{ 
                  background: '#0f172a', 
                  border: '1px solid #1e293b', 
                  color: page === 1 ? '#334155' : 'white', 
                  padding: '8px 12px', 
                  borderRadius: '10px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <ChevronLeft size={16} /> Prev
              </button>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[...Array(totalPages)].map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setPage(i + 1)}
                    style={{ 
                      width: '36px', 
                      height: '36px', 
                      borderRadius: '10px', 
                      border: '1px solid #1e293b',
                      background: page === i + 1 ? '#38bdf8' : '#0f172a',
                      color: page === i + 1 ? 'white' : '#94a3b8',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                style={{ 
                  background: '#0f172a', 
                  border: '1px solid #1e293b', 
                  color: page === totalPages ? '#334155' : 'white', 
                  padding: '8px 12px', 
                  borderRadius: '10px',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Booking Details Modal */}
      {showModal && selectedBooking && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0, 0, 0, 0.8)', 
          backdropFilter: 'blur(8px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{ 
            background: '#0f172a', 
            width: '100%', 
            maxWidth: '600px', 
            borderRadius: '24px', 
            border: '1px solid #1e293b', 
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>Booking Details</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>User Information</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                      <User size={16} color="#38bdf8" />
                      <span style={{ fontWeight: '600' }}>{selectedBooking.user.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '14px' }}>
                      <Mail size={16} />
                      <span>{selectedBooking.user.email}</span>
                    </div>
                    {selectedBooking.user.phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8', fontSize: '14px' }}>
                        <Phone size={16} />
                        <span>{selectedBooking.user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Station Information</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white' }}>
                      <MapPin size={16} color="#38bdf8" />
                      <span style={{ fontWeight: '600' }}>{selectedBooking.station.name}</span>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '14px', marginLeft: '26px' }}>
                      {selectedBooking.station.address}, {selectedBooking.station.city}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', marginBottom: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
                      <Calendar size={14} /> Date
                    </div>
                    <div style={{ color: 'white', fontWeight: '600' }}>{new Date(selectedBooking.date).toLocaleDateString(undefined, { dateStyle: 'full' })}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
                      <Clock size={14} /> Time Slot
                    </div>
                    <div style={{ color: 'white', fontWeight: '600' }}>{selectedBooking.startTime} - {selectedBooking.endTime}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
                      <Hash size={14} /> Vehicle
                    </div>
                    <div style={{ color: '#38bdf8', fontWeight: 'bold' }}>{selectedBooking.vehicleNumber}</div>
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '13px', marginBottom: '6px' }}>
                      <CreditCard size={14} /> Amount
                    </div>
                    <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>₹{selectedBooking.totalAmount}</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', color: '#64748b', fontSize: '12px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Current Status</label>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px', 
                    padding: '12px 16px', 
                    borderRadius: '12px', 
                    background: getStatusStyle(selectedBooking.status).bg,
                    color: getStatusStyle(selectedBooking.status).color,
                    fontWeight: 'bold',
                    width: 'fit-content'
                  }}>
                    {getStatusStyle(selectedBooking.status).icon}
                    {selectedBooking.status}
                  </div>
                </div>

                {selectedBooking.status === 'Rejected' && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontWeight: '600', marginBottom: '4px' }}>
                      <Info size={16} /> Rejection Reason
                    </div>
                    <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>{selectedBooking.rejectionReason || 'No reason provided'}</p>
                  </div>
                )}
                {selectedBooking.paymentStatus === 'Paid' && selectedBooking.payment && (
                  <div style={{ background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.1)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#22c55e', fontWeight: '600', marginBottom: '8px' }}>
                      <CreditCard size={16} /> Payment Information
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Transaction ID</div>
                        <div style={{ fontSize: '13px', color: 'white', fontFamily: 'monospace' }}>{selectedBooking.payment.razorpayPaymentId}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Invoice ID</div>
                        <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold' }}>{selectedBooking.payment.invoiceId}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Method</div>
                        <div style={{ fontSize: '13px', color: 'white' }}>{selectedBooking.payment.method}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>Paid At</div>
                        <div style={{ fontSize: '13px', color: 'white' }}>{new Date(selectedBooking.payment.paidAt || '').toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '16px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '12px' }}>
                  <span>Booking ID: {selectedBooking._id}</span>
                  <span>Created: {new Date(selectedBooking.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div style={{ padding: '24px', background: '#1e293b', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowModal(false)}
                style={{ 
                  background: '#38bdf8', 
                  color: 'white', 
                  border: 'none', 
                  padding: '12px 32px', 
                  borderRadius: '12px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px 0 rgba(56, 189, 248, 0.39)'
                }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
