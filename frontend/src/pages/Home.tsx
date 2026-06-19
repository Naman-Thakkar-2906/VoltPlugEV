import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';
import { paymentService } from '../services/paymentService';
import MapComponent from '../components/Map';
import api from '../api/axios';
import { Search, MapPin, Zap, Navigation, LogOut, X, Check, Clock } from 'lucide-react';
import Loader from '../components/Loader';

interface Station {
  _id: string;
  name: string;
  address: string;
  city: string;
  pricePerHour: number;
  totalSlots: number;
  location: {
    coordinates: [number, number];
  };
  distance?: number;
}

const Home = () => {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<[number, number]>([23.0225, 72.5714]); // Ahmedabad
  const [mapZoom, setMapZoom] = useState(13);
  
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [isBooking, setIsBooking] = useState(false);
  const [bookingData, setBookingData] = useState({
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00',
    endTime: '11:00',
    vehicleNumber: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  
  const [showRoute, setShowRoute] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastBookingId, setLastBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<'Pending' | 'Approved' | 'Rejected' | 'Confirmed' | null>(null);
  const [currentRejectionReason, setCurrentRejectionReason] = useState<string>('');

  const checkBookingStatus = async () => {
    if (!lastBookingId) return;
    try {
      const response: any = await api.get(`/bookings/${lastBookingId}`);
      if (response.success) {
        setBookingStatus(response.data.status);
        if (response.data.rejectionReason) {
          setCurrentRejectionReason(response.data.rejectionReason);
        }
        
        // If status changed from Pending, we might want to stop specific UI indicators
        if (response.data.status !== 'Pending') {
           console.log(`Booking status updated to: ${response.data.status}`);
        }
      }
    } catch (error) {
      console.error('Error checking booking status:', error);
    }
  };

  const { user } = useAuth();

  // Real-time socket updates for booking status
  useEffect(() => {
    if (user && lastBookingId) {
      socketService.connect();
      socketService.joinUserRoom(user._id);

      socketService.on('bookingApproved', (updatedBooking: any) => {
        if (updatedBooking._id === lastBookingId) {
          setBookingStatus('Approved');
          console.log('Booking status updated to: Approved via Socket');
        }
      });

      socketService.on('bookingRejected', (updatedBooking: any) => {
        if (updatedBooking._id === lastBookingId) {
          setBookingStatus('Rejected');
          setCurrentRejectionReason(updatedBooking.rejectionReason || 'No reason provided');
          console.log('Booking status updated to: Rejected via Socket');
        }
      });

      socketService.on('paymentUpdated', (data: { bookingId: string, paymentStatus: string, bookingConfirmed: boolean }) => {
        if (data.bookingId === lastBookingId) {
          if (data.paymentStatus === 'Paid') {
            setBookingStatus('Confirmed' as any);
          }
        }
      });

      return () => {
        socketService.off('bookingApproved');
        socketService.off('bookingRejected');
        socketService.off('paymentUpdated');
      };
    }
  }, [user, lastBookingId]);

  const handlePayment = async () => {
    if (!lastBookingId) return;
    setBookingLoading(true);
    try {
      await paymentService.processPayment(
        lastBookingId,
        () => {
          setBookingStatus('Confirmed' as any);
          alert('Payment Successful! You can now start navigation.');
        },
        (errorMsg) => {
          alert(errorMsg);
        }
      );
    } catch (error: any) {
      console.error('Payment failed:', error);
      alert(error || 'Payment failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  useEffect(() => {
    // 1. Get User Location
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported');
      setLocationLoading(false);
    } else {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setMapZoom(14);
          setLocationLoading(false);
        },
        () => {
          setLocationError('Location access denied. Showing default.');
          setLocationLoading(false);
        }
      );
    }

    // 2. Fetch Stations
    const fetchStations = async () => {
      try {
        const response: any = await api.get('/stations');
        if (response.success && Array.isArray(response.data)) {
          setStations(response.data);
        } else {
          console.error('Invalid stations data received:', response.data);
          setStations([]);
        }
      } catch (error) {
        console.error('Error fetching stations:', error);
      }
    };
    fetchStations();
  }, []);

  const handleStationSelect = (station: Station) => {
    setSelectedStation(station);
    setIsBooking(false);
    setShowRoute(false);
    setIsNavigating(false);
    setMapCenter([station.location.coordinates[1], station.location.coordinates[0]]);
    setMapZoom(16);
  };

  const handleStopNavigation = () => {
    setIsNavigating(false);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation) return;
    
    try {
      console.log('Submitting booking for station:', selectedStation._id);
      const response: any = await api.post('/bookings', {
        stationId: selectedStation._id,
        ...bookingData,
        totalAmount: selectedStation.pricePerHour
      });
      console.log('Booking response:', response);
      if (response && (response.success || response.data)) {
        setShowRoute(true);
        setIsBooking(false);
        // Store the actual booking ID to check status later
        setLastBookingId(response.data._id);
        setBookingStatus('Pending');
        console.log('Booking request submitted: Pending approval');
      } else {
        console.warn('Booking response was not as expected:', response);
        alert('Booking failed: Unexpected server response');
      }
    } catch (error: any) {
      console.error('Booking failed:', error);
      alert(error || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleRouteInfo = (info: { distance: string; time: string }) => {
    console.log('Route info:', info);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleLocateMe = () => {
    setLocationLoading(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setMapZoom(15);
        setLocationLoading(false);
      },
      () => {
        setLocationError('Location denied. Click ⚡ for Simulator.');
        setLocationLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSimulateLocation = () => {
    const ahmedabadCenter: [number, number] = [23.0225, 72.5714];
    setUserLocation(ahmedabadCenter);
    setMapCenter(ahmedabadCenter);
    setMapZoom(14);
    setLocationError(null);
    setLocationLoading(false);
  };

  const handleDirections = (station: Station) => {
    const [lng, lat] = station.location.coordinates;
    let url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    if (userLocation) {
      url += `&origin=${userLocation[0]},${userLocation[1]}`;
    }
    window.open(url, '_blank');
  };

  const filteredStations = stations
    .map(station => {
      if (userLocation && station.location && station.location.coordinates && station.location.coordinates.length >= 2) {
        const dist = calculateDistance(
          userLocation[0], userLocation[1],
          station.location.coordinates[1], station.location.coordinates[0]
        );
        return { ...station, distance: dist };
      }
      return { ...station, distance: Infinity };
    })
    .filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.city.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));

  return (
    <div className="home-container" style={{ display: 'flex', height: '100vh', width: '100vw', background: '#020617', overflow: 'hidden', position: 'relative' }}>
      
      {/* Geolocation Status */}
      {(locationLoading || locationError) && (
        <div style={{ position: 'absolute', top: '90px', left: '20px', zIndex: 1000, background: locationError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(15, 23, 42, 0.9)', color: 'white', padding: '10px 18px', borderRadius: '12px', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '5px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
             {locationLoading && <Loader size={16} />}
             <span style={{ fontWeight: '600' }}>
               {locationLoading ? 'Detecting location...' : 'Location Error'}
             </span>
          </div>
          {locationError && <div style={{ fontSize: '11px', color: '#fca5a5' }}>{locationError}</div>}
        </div>
      )}

      {/* Floating Action Buttons */}
      <div style={{ position: 'absolute', bottom: '100px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <button 
          onClick={handleLocateMe}
          title="Detect Location"
          style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#1a73e8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer' }}
        >
          <Navigation size={24} />
        </button>
        <button 
          onClick={handleSimulateLocation}
          title="Simulator Mode"
          style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#0f172a', color: '#1a73e8', border: '2px solid #1a73e8', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', cursor: 'pointer' }}
        >
          <Zap size={24} />
        </button>
      </div>

      <div className="overlay-ui" style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000, width: '350px' }}>
        <div style={{ background: '#1e293b', padding: '10px 15px', borderRadius: '12px', display: 'flex', alignItems: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', border: '1px solid #334155' }}>
          <Search size={20} color="#94a3b8" style={{ marginRight: '10px' }} />
          <input 
            type="text" 
            placeholder="Search city or station..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, padding: '5px', outline: 'none' }}
          />
        </div>

        {searchQuery && (
          <div style={{ background: '#1e293b', marginTop: '10px', borderRadius: '12px', maxHeight: '200px', overflowY: 'auto', border: '1px solid #334155' }}>
            {filteredStations.map(s => (
              <div 
                key={s._id} 
                onClick={() => handleStationSelect(s)}
                style={{ padding: '12px 15px', borderBottom: '1px solid #334155', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontWeight: '500', color: 'white' }}>{s.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{s.city}</div>
                </div>
                {s.distance !== Infinity && (
                  <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>{s.distance?.toFixed(1)} km</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapComponent 
          stations={filteredStations} 
          center={mapCenter} 
          zoom={mapZoom} 
          onStationSelect={handleStationSelect}
          userLocation={userLocation}
          showRoute={showRoute}
          routeTarget={selectedStation ? [selectedStation.location.coordinates[1], selectedStation.location.coordinates[0]] : null}
          onRouteInfo={handleRouteInfo}
          isNavigating={isNavigating}
          onStopNavigation={handleStopNavigation}
        />
      </div>

      {selectedStation && (
        <div style={{ width: '400px', height: '100%', background: '#0f172a', borderLeft: '1px solid #334155', padding: '30px', zIndex: 1001, boxShadow: '-10px 0 30px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', color: 'white' }}>
          <button 
            onClick={() => setSelectedStation(null)}
            style={{ alignSelf: 'flex-start', background: 'transparent', border: 'none', color: '#94a3b8', marginBottom: '20px', cursor: 'pointer' }}
          >
            &larr; Back to map
          </button>

          {import.meta.env.DEV && !showRoute && (
            <button 
              onClick={() => { setShowRoute(true); setIsBooking(false); }}
              style={{ fontSize: '10px', color: '#475569', marginBottom: '10px', background: 'transparent', border: '1px dashed #334155', padding: '5px', cursor: 'pointer' }}
            >
              [DEBUG] Force Navigation Mode
            </button>
          )}

          {!isBooking ? (
            <>
              <img 
                src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                alt="Station" 
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px', marginBottom: '20px' }}
              />              {showRoute ? (
                <div style={{ background: bookingStatus === 'Rejected' ? 'rgba(239, 68, 68, 0.1)' : (bookingStatus === 'Approved' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)'), border: `1px solid ${bookingStatus === 'Rejected' ? '#ef4444' : (bookingStatus === 'Approved' ? '#22c55e' : '#f59e0b')}`, borderRadius: '12px', padding: '20px', marginBottom: '20px', textAlign: 'center' }}>
                  <div style={{ background: bookingStatus === 'Rejected' ? '#ef4444' : (bookingStatus === 'Approved' ? '#22c55e' : '#f59e0b'), width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    {bookingStatus === 'Rejected' ? <X size={24} color="white" /> : (bookingStatus === 'Approved' ? <Check size={24} color="white" /> : <Clock size={24} color="white" />)}
                  </div>
                  
                  <h3 style={{ color: bookingStatus === 'Rejected' ? '#ef4444' : (bookingStatus === 'Approved' ? '#22c55e' : '#f59e0b'), marginBottom: '5px' }}>
                    {bookingStatus === 'Pending' && 'Request Pending'}
                    {bookingStatus === 'Approved' && 'Request Approved!'}
                    {bookingStatus === 'Rejected' && 'Request Rejected'}
                    {(bookingStatus as any) === 'Confirmed' && 'Booking Confirmed!'}
                  </h3>

                  <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '15px' }}>
                    {bookingStatus === 'Pending' && 'Waiting for station master to approve your slot.'}
                    {bookingStatus === 'Approved' && 'Please complete payment to start navigation.'}
                    {bookingStatus === 'Rejected' && 'The station master has declined your request.'}
                    {(bookingStatus as any) === 'Confirmed' && 'Your slot is ready. Safe travels!'}
                  </p>

                  {bookingStatus === 'Rejected' && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '10px', marginBottom: '15px', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                       <div style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Reason</div>
                       <div style={{ fontSize: '13px', color: 'white' }}>{currentRejectionReason || 'No reason provided.'}</div>
                    </div>
                  )}
                  
                  {bookingStatus === 'Pending' && (
                    <button 
                      onClick={checkBookingStatus}
                      style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '10px', borderRadius: '10px', width: '100%', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <Clock size={16} /> Refresh Status
                    </button>
                  )}

                  {bookingStatus === 'Approved' && (
                    <button 
                      onClick={handlePayment}
                      disabled={bookingLoading}
                      style={{ background: '#22c55e', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', width: '100%', fontWeight: '600', cursor: bookingLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)', opacity: bookingLoading ? 0.7 : 1 }}
                    >
                      {bookingLoading ? <div style={{ width: '18px', height: '18px', border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Zap size={18} />}
                      {bookingLoading ? 'Processing...' : 'Pay & Confirm'}
                    </button>
                  )}

                  {bookingStatus === 'Confirmed' && (
                    <button 
                      onClick={() => setIsNavigating(true)}
                      style={{ background: '#22c55e', color: 'white', border: 'none', padding: '12px', borderRadius: '10px', width: '100%', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)' }}
                    >
                      <Navigation size={18} /> Start Live Tracking
                    </button>
                  )}

                  <button 
                    onClick={() => handleDirections(selectedStation!)}
                    style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '10px', borderRadius: '10px', width: '100%', fontWeight: '600', marginTop: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <LogOut size={16} style={{ transform: 'rotate(90deg)' }} /> Google Maps
                  </button>
                </div>
              ) : null}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>{selectedStation.name}</h2>
                {selectedStation.distance !== Infinity && (
                   <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold' }}>
                     {selectedStation.distance?.toFixed(1)} km
                   </span>
                )}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '14px', display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                <MapPin size={16} style={{ marginRight: '5px' }} /> {selectedStation.address}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>Price</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#38bdf8' }}>₹{selectedStation.pricePerHour}/hr</div>
                </div>
                <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', textAlign: 'center', border: '1px solid #334155' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '5px' }}>Capacity</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{selectedStation.totalSlots} Slots</div>
                </div>
              </div>

              <button 
                onClick={() => handleDirections(selectedStation)}
                style={{ background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '14px', borderRadius: '12px', width: '100%', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '12px', cursor: 'pointer' }}
              >
                <Navigation size={18} /> Get Directions
              </button>

              <button 
                onClick={() => setIsBooking(true)}
                style={{ background: '#1a73e8', color: 'white', padding: '14px', borderRadius: '12px', width: '100%', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginTop: '16px', border: 'none', cursor: 'pointer' }}
              >
                <Zap size={20} /> Pre-Book Slot
              </button>
            </>
          ) : (
            <form onSubmit={handleBookingSubmit} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '20px' }}>Select Slot</h2>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}>Date</label>
                <input 
                  type="date" 
                  required
                  style={{ width: '100%', padding: '12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: 'white' }}
                  value={bookingData.date}
                  onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}>Start Time</label>
                  <input 
                    type="time" 
                    required
                    style={{ width: '100%', padding: '12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: 'white' }}
                    value={bookingData.startTime}
                    onChange={(e) => setBookingData({...bookingData, startTime: e.target.value})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}>End Time</label>
                  <input 
                    type="time" 
                    required
                    style={{ width: '100%', padding: '12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: 'white' }}
                    value={bookingData.endTime}
                    onChange={(e) => setBookingData({...bookingData, endTime: e.target.value})}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '14px' }}>Vehicle Number</label>
                <input 
                  type="text" 
                  required
                  style={{ width: '100%', padding: '12px', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', color: 'white' }}
                  placeholder="GJ-01-XX-0000"
                  value={bookingData.vehicleNumber}
                  onChange={(e) => setBookingData({...bookingData, vehicleNumber: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                disabled={bookingLoading}
                style={{ background: '#22c55e', color: 'white', padding: '15px', borderRadius: '12px', width: '100%', fontWeight: '600', fontSize: '16px', border: 'none', cursor: bookingLoading ? 'not-allowed' : 'pointer', opacity: bookingLoading ? 0.7 : 1 }}
              >
                {bookingLoading ? 'Processing...' : 'Confirm & Pay'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default Home;
