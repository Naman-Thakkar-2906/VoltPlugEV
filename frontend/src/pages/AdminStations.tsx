import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { 
  Plus, Edit, Trash2, Eye, MapPin, Search, X, 
  Zap, DollarSign, Calendar, Activity, Info, Clock, CheckCircle
} from 'lucide-react';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import { socketService } from '../services/socket';
import { useAuth } from '../context/AuthContext';

interface StationItem {
  _id: string;
  name: string;
  city: string;
  pricePerHour: number;
  totalSlots: number;
  address: string;
  location: {
    coordinates: [number, number];
  };
  connectorTypes: string[];
  owner?: {
    _id: string;
    name: string;
    email: string;
  };
  status?: 'Active' | 'Inactive'; // Logical status
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
}

interface StationStats {
  totalBookings: number;
  totalRevenue: number;
  activeBookings: number;
  availableSlots: number;
}

const AdminStations = () => {
  const { user } = useAuth();
  const [stations, setStations] = useState<StationItem[]>([]);
  const [owners, setOwners] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStation, setEditingStation] = useState<Partial<StationItem> | null>(null);
  
  // Details Modal State
  const [showDetails, setShowDetails] = useState(false);
  const [selectedStation, setSelectedStation] = useState<StationItem | null>(null);
  const [stationStats, setStationStats] = useState<StationStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    pricePerHour: 0,
    totalSlots: 1,
    longitude: 72.8777,
    latitude: 19.0760,
    connectorTypes: ['Type 2'],
    owner: ''
  });

  const navigate = useNavigate();

  const fetchStations = useCallback(async () => {
    try {
      const res: any = await api.get('/stations');
      if (res.success) {
        setStations(res.data);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOwners = async () => {
    try {
      const res: any = await api.get('/admin/users?role=stationMaster');
      if (res.success) {
        setOwners(res.data);
      }
    } catch (error) {
      console.error('Error fetching owners:', error);
    }
  };

  useEffect(() => {
    fetchStations();
    fetchOwners();
  }, [fetchStations]);

  // Real-time synchronization
  useEffect(() => {
    if (user && user.role === 'admin') {
      const handleUpdate = () => {
        fetchStations();
      };
      socketService.on('newBookingRequest', handleUpdate);
      socketService.on('bookingUpdated', handleUpdate);
      
      return () => {
        socketService.off('newBookingRequest');
        socketService.off('bookingUpdated');
      };
    }
  }, [user, fetchStations]);

  const fetchStationDetails = async (station: StationItem) => {
    setSelectedStation(station);
    setShowDetails(true);
    setLoadingStats(true);
    try {
      const res: any = await api.get(`/admin/station/${station._id}/stats`);
      if (res.success) {
        setStationStats(res.data);
      }
    } catch (error) {
      console.error('Error fetching station stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleOpenModal = (station: StationItem | null = null) => {
    if (station) {
      setEditingStation(station);
      setFormData({
        name: station.name,
        address: station.address,
        city: station.city,
        pricePerHour: station.pricePerHour,
        totalSlots: station.totalSlots,
        longitude: station.location.coordinates[0],
        latitude: station.location.coordinates[1],
        connectorTypes: station.connectorTypes || ['Type 2'],
        owner: station.owner?._id || ''
      });
    } else {
      setEditingStation(null);
      setFormData({
        name: '',
        address: '',
        city: '',
        pricePerHour: 100,
        totalSlots: 1,
        longitude: 72.8777,
        latitude: 19.0760,
        connectorTypes: ['Type 2'],
        owner: ''
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...formData,
      location: {
        type: 'Point',
        coordinates: [formData.longitude, formData.latitude]
      }
    };

    try {
      if (editingStation) {
        await api.put(`/stations/${editingStation._id}`, payload);
      } else {
        await api.post('/stations', payload);
      }
      fetchStations();
      setShowModal(false);
    } catch (error) {
      alert('Error saving station');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this station?')) {
      try {
        await api.delete(`/stations/${id}`);
        setStations(stations.filter(s => s._id !== id));
      } catch (error) {
        alert('Failed to delete station');
      }
    }
  };

  const filteredStations = stations.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>Charging Stations</h1>
          <p style={{ color: '#94a3b8' }}>Manage operations and monitor revenue across all locations</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          style={{ 
            background: '#38bdf8', 
            color: '#020617', 
            padding: '12px 24px', 
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px', 
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(56, 189, 248, 0.2)'
          }}
        >
          <Plus size={20} /> Add Station
        </button>
      </div>

      {/* Filters Bar */}
      <div style={{ position: 'relative', marginBottom: '32px' }}>
        <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} size={18} />
        <input 
          type="text" 
          placeholder="Search stations by name, address or city..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ 
            width: '100%', 
            background: '#0f172a', 
            border: '1px solid #1e293b', 
            borderRadius: '12px', 
            padding: '14px 14px 14px 48px',
            color: 'white',
            outline: 'none',
            fontSize: '15px'
          }}
        />
      </div>

      {loading ? (
        <div style={{ padding: '100px 0' }}><Loader /></div>
      ) : filteredStations.length === 0 ? (
        <EmptyState 
          message="No stations found" 
          subMessage={searchTerm ? `No results for "${searchTerm}"` : "Get started by adding your first charging station."} 
        />
      ) : (
        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#1e293b' }}>
                <th style={{ padding: '18px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>STATION DETAILS</th>
                <th style={{ padding: '18px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>OPERATOR</th>
                <th style={{ padding: '18px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>SLOTS</th>
                <th style={{ padding: '18px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600' }}>STATUS</th>
                <th style={{ padding: '18px 24px', color: '#94a3b8', fontSize: '13px', fontWeight: '600', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredStations.map((station) => (
                <tr key={station._id} style={{ borderBottom: '1px solid #1e293b', transition: 'background 0.2s' }}>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                       <div style={{ 
                         width: '40px', 
                         height: '40px', 
                         borderRadius: '10px', 
                         background: 'rgba(56, 189, 248, 0.1)', 
                         display: 'flex', 
                         alignItems: 'center', 
                         justifyContent: 'center',
                         color: '#38bdf8'
                       }}>
                         <Zap size={20} />
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: '600', color: 'white' }}>{station.name}</span>
                        <span style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {station.city}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    {station.owner ? (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>{station.owner.name}</span>
                        <span style={{ color: '#64748b', fontSize: '11px' }}>{station.owner.email}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#ef4444', fontSize: '12px', fontWeight: '600', background: 'rgba(239, 68, 68, 0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                        No Owner
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontWeight: '600' }}>
                      <span style={{ color: 'white' }}>{station.totalSlots}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>Slots</span>
                    </div>
                  </td>
                  <td style={{ padding: '20px 24px' }}>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px', 
                      borderRadius: '6px', 
                      fontSize: '11px', 
                      fontWeight: 'bold',
                      color: station.owner ? '#22c55e' : '#ef4444',
                      background: station.owner ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      border: `1px solid ${station.owner ? '#22c55e30' : '#ef444430'}`
                    }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: station.owner ? '#22c55e' : '#ef4444' }}></div>
                      {station.owner ? 'OPERATIONAL' : 'INACTIVE'}
                    </span>
                  </td>
                  <td style={{ padding: '20px 24px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                      <button 
                        onClick={() => fetchStationDetails(station)}
                        style={{ background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '8px', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' }}
                        title="Quick View"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handleOpenModal(station)}
                        style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                        title="Edit / Assign"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(station._id)}
                        style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '8px', borderRadius: '10px', cursor: 'pointer' }}
                        title="Remove"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Station Details Modal */}
      {showDetails && selectedStation && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
        }}>
          <div style={{ background: '#0f172a', width: '90%', maxWidth: '700px', borderRadius: '32px', border: '1px solid #1e293b', overflow: 'hidden' }}>
            <div style={{ padding: '32px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div style={{ display: 'flex', gap: '20px' }}>
                  <div style={{ width: '64px', height: '64px', background: '#38bdf8', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 16px rgba(56, 189, 248, 0.2)' }}>
                    <Zap size={32} color="#020617" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{selectedStation.name}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MapPin size={14} /> {selectedStation.address}, {selectedStation.city}
                    </p>
                  </div>
               </div>
               <button onClick={() => setShowDetails(false)} style={{ background: '#1e293b', border: 'none', color: '#94a3b8', padding: '8px', borderRadius: '12px', cursor: 'pointer' }}>
                 <X size={24} />
               </button>
            </div>

            <div style={{ padding: '32px' }}>
              {loadingStats ? <div style={{ padding: '40px 0' }}><Loader /></div> : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '32px' }}>
                    <div style={{ background: '#1e293b40', padding: '20px', borderRadius: '20px', border: '1px solid #1e293b' }}>
                      <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Total Revenue</p>
                      <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#38bdf8' }}>₹{stationStats?.totalRevenue.toLocaleString()}</h3>
                    </div>
                    <div style={{ background: '#1e293b40', padding: '20px', borderRadius: '20px', border: '1px solid #1e293b' }}>
                      <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Total Bookings</p>
                      <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: 'white' }}>{stationStats?.totalBookings}</h3>
                    </div>
                    <div style={{ background: '#1e293b40', padding: '20px', borderRadius: '20px', border: '1px solid #1e293b' }}>
                      <p style={{ color: '#64748b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Available Slots</p>
                      <h3 style={{ fontSize: '22px', fontWeight: 'bold', color: '#22c55e' }}>{stationStats?.availableSlots} / {selectedStation.totalSlots}</h3>
                    </div>
                  </div>

                  <div style={{ background: '#020617', padding: '24px', borderRadius: '24px', border: '1px solid #1e293b' }}>
                    <h4 style={{ color: 'white', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Info size={18} color="#38bdf8" /> Operator Information
                    </h4>
                    {selectedStation.owner ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ color: 'white', fontWeight: '600', marginBottom: '4px' }}>{selectedStation.owner.name}</p>
                          <p style={{ color: '#64748b', fontSize: '13px' }}>{selectedStation.owner.email}</p>
                        </div>
                        <button 
                          onClick={() => handleOpenModal(selectedStation)}
                          style={{ background: 'rgba(56, 189, 248, 0.1)', border: 'none', color: '#38bdf8', padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Change Operator
                        </button>
                      </div>
                    ) : (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>No operator assigned to this station.</p>
                        <button 
                          onClick={() => handleOpenModal(selectedStation)}
                          style={{ background: '#38bdf8', color: '#020617', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                        >
                          Assign Station Master
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: '24px 32px', background: '#1e293b40', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end' }}>
               <button 
                onClick={() => navigate(`/admin/station/${selectedStation._id}`)}
                style={{ background: '#38bdf8', color: '#020617', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
               >
                 View Full Details <Activity size={18} />
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit/Add Modal */}
      {showModal && (
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 
        }}>
          <div style={{ 
            background: '#0f172a', width: '90%', maxWidth: '600px', borderRadius: '24px', 
            border: '1px solid #1e293b', maxHeight: '90vh', overflowY: 'auto', color: 'white'
          }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{editingStation ? 'Edit Station' : 'Add New Station'}</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Station Name</label>
                  <input required type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: 'white', outline: 'none' }} />
                </div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', color: '#38bdf8', fontSize: '13px', marginBottom: '8px', fontWeight: '600' }}>Station Operator (Master)</label>
                  <select value={formData.owner} onChange={(e) => setFormData({...formData, owner: e.target.value})}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #38bdf8', borderRadius: '10px', padding: '12px', color: 'white', outline: 'none' }}>
                    <option value="">Select an owner...</option>
                    {owners.map(owner => <option key={owner._id} value={owner._id}>{owner.name} ({owner.email})</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Detailed Address</label>
                  <input required type="text" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: 'white', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>City</label>
                  <input required type="text" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: 'white', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Rate (₹/hr)</label>
                  <input required type="number" value={formData.pricePerHour} onChange={(e) => setFormData({...formData, pricePerHour: Number(e.target.value)})}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: 'white', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Total Slots</label>
                  <input required type="number" value={formData.totalSlots} onChange={(e) => setFormData({...formData, totalSlots: Number(e.target.value)})}
                    style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: 'white', outline: 'none' }} />
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '30px' }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ background: 'transparent', border: '1px solid #334155', color: 'white', padding: '12px 24px', borderRadius: '12px', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={submitting}
                  style={{ background: '#38bdf8', border: 'none', color: '#020617', padding: '12px 24px', borderRadius: '12px', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>
                  {submitting ? 'Processing...' : editingStation ? 'Update Station' : 'Create Station'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminStations;
