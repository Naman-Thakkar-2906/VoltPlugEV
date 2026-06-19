import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { socketService } from '../services/socket';
import { paymentService } from '../services/paymentService';
import MapComponent from '../components/Map';
import api from '../api/axios';
import { Search, MapPin, Zap, Navigation, LogOut, X, Check, Clock } from 'lucide-react';
import Loader from '../components/Loader';
import { logger } from '../utils/logger';

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
  
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
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

  // Touch gesture state for dragging bottom sheet
  const [dragOffsetY, setDragOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [touchStartY, setTouchStartY] = useState(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    const touch = e.touches[0];
    const diff = touch.clientY - touchStartY;
    if (diff > 0) {
      setDragOffsetY(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return;
    setIsDragging(false);
    if (dragOffsetY > 150) {
      setSelectedStation(null);
    }
    setDragOffsetY(0);
  };

  // Effect to hide bottom navigation on mobile when a station details sheet is open
  useEffect(() => {
    if (isMobile && selectedStation) {
      document.body.classList.add('hide-bottom-nav');
    } else {
      document.body.classList.remove('hide-bottom-nav');
    }
    return () => {
      document.body.classList.remove('hide-bottom-nav');
    };
  }, [selectedStation, isMobile]);

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
           logger.log(`Booking status updated to: ${response.data.status}`);
        }
      }
    } catch (error) {
      logger.error('Error checking booking status:', error);
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
          logger.log('Booking status updated to: Approved via Socket');
        }
      });

      socketService.on('bookingRejected', (updatedBooking: any) => {
        if (updatedBooking._id === lastBookingId) {
          setBookingStatus('Rejected');
          setCurrentRejectionReason(updatedBooking.rejectionReason || 'No reason provided');
          logger.log('Booking status updated to: Rejected via Socket');
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
      logger.error('Payment failed:', error);
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
          logger.error('Invalid stations data received:', response.data);
          setStations([]);
        }
      } catch (error) {
        logger.error('Error fetching stations:', error);
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
      logger.log('Submitting booking for station:', selectedStation._id);
      const response: any = await api.post('/bookings', {
        stationId: selectedStation._id,
        ...bookingData,
        totalAmount: selectedStation.pricePerHour
      });
      logger.log('Booking response:', response);
      if (response && (response.success || response.data)) {
        setShowRoute(true);
        setIsBooking(false);
        // Store the actual booking ID to check status later
        setLastBookingId(response.data._id);
        setBookingStatus('Pending');
        logger.log('Booking request submitted: Pending approval');
      } else {
        logger.warn('Booking response was not as expected:', response);
        alert('Booking failed: Unexpected server response');
      }
    } catch (error: any) {
      logger.error('Booking failed:', error);
      alert(error || 'Booking failed');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleRouteInfo = (info: { distance: string; time: string }) => {
    logger.log('Route info:', info);
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

  const bookingStatusColor = bookingStatus === 'Rejected' ? '#ef4444' : (bookingStatus === 'Approved' ? '#22c55e' : '#f59e0b');
  const bookingStatusBg = bookingStatus === 'Rejected' ? 'rgba(239, 68, 68, 0.08)' : (bookingStatus === 'Approved' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(245, 158, 11, 0.08)');

  return (
    <div className="home-container" style={{
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      height: '100vh',
      width: '100vw',
      background: '#020617',
      overflow: 'hidden',
      position: 'relative'
    }}>
      
      {/* Geolocation Status */}
      {(locationLoading || locationError) && (
        <div style={{
          position: 'absolute',
          top: isMobile ? 'calc(80px + env(safe-area-inset-top, 0px))' : '90px',
          left: isMobile ? '16px' : '20px',
          right: isMobile ? '16px' : 'auto',
          zIndex: 1000,
          background: locationError ? 'rgba(239, 68, 68, 0.9)' : 'rgba(15, 23, 42, 0.9)',
          color: 'white',
          padding: '10px 18px',
          borderRadius: '12px',
          fontSize: '13px',
          display: 'flex',
          flexDirection: 'column',
          gap: '5px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        }}>
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
      <div style={{
        position: 'absolute',
        bottom: isMobile 
          ? (selectedStation ? 'calc(370px + env(safe-area-inset-bottom, 12px))' : 'calc(85px + env(safe-area-inset-bottom, 12px))')
          : '100px',
        right: isMobile ? '16px' : '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'bottom 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <button 
          onClick={handleLocateMe}
          title="Detect Location"
          style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#1a73e8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer', transition: 'transform 0.2s' }}
        >
          <Navigation size={22} />
        </button>
        <button 
          onClick={handleSimulateLocation}
          title="Simulator Mode"
          style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#0f172a', color: '#38bdf8', border: '2px solid #38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(0,0,0,0.4)', cursor: 'pointer', transition: 'transform 0.2s' }}
        >
          <Zap size={22} />
        </button>
      </div>

      {/* Search Bar / Overlay UI */}
      <div className="overlay-ui" style={isMobile ? {
        position: 'absolute',
        top: 'calc(16px + env(safe-area-inset-top, 0px))',
        left: '16px',
        right: '16px',
        zIndex: 1000
      } : {
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000,
        width: '350px'
      }}>
        <div style={{ background: '#1e293b', padding: '12px 16px', borderRadius: '14px', display: 'flex', alignItems: 'center', boxShadow: '0 6px 25px rgba(0,0,0,0.5)', border: '1px solid #334155' }}>
          <Search size={20} color="#94a3b8" style={{ marginRight: '10px' }} />
          <input 
            type="text" 
            placeholder="Search city or station..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'white', flex: 1, padding: '2px', outline: 'none', fontSize: '15px' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          )}
        </div>

        {searchQuery && (
          <div style={{ background: '#1e293b', marginTop: '8px', borderRadius: '14px', maxHeight: '250px', overflowY: 'auto', border: '1px solid #334155', boxShadow: '0 8px 30px rgba(0,0,0,0.6)' }}>
            {filteredStations.length === 0 ? (
              <div style={{ padding: '15px', color: '#94a3b8', fontSize: '14px', textAlign: 'center' }}>No stations found</div>
            ) : (
              filteredStations.map(s => (
                <div 
                  key={s._id} 
                  onClick={() => {
                    handleStationSelect(s);
                    setSearchQuery('');
                  }}
                  style={{ padding: '12px 16px', borderBottom: '1px solid #334155', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                >
                  <div>
                    <div style={{ fontWeight: '600', color: 'white', fontSize: '14px' }}>{s.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{s.city}</div>
                  </div>
                  {s.distance !== Infinity && (
                    <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold', background: 'rgba(56, 189, 248, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>{s.distance?.toFixed(1)} km</div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Map component wrapper */}
      <div style={isMobile ? {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1
      } : {
        flex: 1,
        position: 'relative'
      }}>
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


      {/* Station details panel */}
      {selectedStation && (
        <div 
          className={isMobile ? 'bottom-sheet-mobile' : ''}
          style={isMobile ? {
            transform: `translateY(${dragOffsetY}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          } : {
            width: '400px',
            height: '100%',
            background: '#0f172a',
            borderLeft: '1px solid #334155',
            padding: '30px',
            zIndex: 1001,
            boxShadow: '-10px 0 30px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            color: 'white'
          }}
        >
          {isMobile && (
            <div 
              className="bottom-sheet-drag-handle-container"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div className="bottom-sheet-drag-handle" />
            </div>
          )}

          <div className={isMobile ? 'bottom-sheet-content' : ''} style={!isMobile ? { display: 'flex', flexDirection: 'column', gap: '15px', height: '100%' } : undefined}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isMobile ? '5px' : '20px', flexShrink: 0 }}>
              <button 
                onClick={() => setSelectedStation(null)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px', fontWeight: '500' }}
              >
                &larr; Back to map
              </button>
              {isMobile && (
                <button 
                  onClick={() => setSelectedStation(null)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#94a3b8', padding: '6px', borderRadius: '50%', cursor: 'pointer' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {import.meta.env.DEV && !showRoute && (
              <button 
                onClick={() => { setShowRoute(true); setIsBooking(false); }}
                style={{ fontSize: '10px', color: '#475569', marginBottom: '10px', background: 'transparent', border: '1px dashed #334155', padding: '5px', cursor: 'pointer', borderRadius: '4px', alignSelf: 'flex-start' }}
              >
                [DEBUG] Force Navigation Mode
              </button>
            )}

            <img 
              src="https://images.unsplash.com/photo-1593941707882-a5bba14938c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
              alt="Station" 
              style={{ width: '100%', height: isMobile ? '140px' : '180px', objectFit: 'cover', borderRadius: '12px', flexShrink: 0, marginBottom: '4px' }}
            />

            {!isBooking ? (
              <>
                {showRoute ? (
                  <div style={{ background: bookingStatusBg, border: `1px solid ${bookingStatusColor}`, borderRadius: '12px', padding: '16px', textAlign: 'center', marginBottom: '8px' }}>
                    <div style={{ background: bookingStatusColor, width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                      {bookingStatus === 'Rejected' ? <X size={20} color="white" /> : (bookingStatus === 'Approved' ? <Check size={20} color="white" /> : <Clock size={20} color="white" />)}
                    </div>
                    
                    <h3 style={{ color: bookingStatusColor, marginBottom: '4px', fontSize: '16px' }}>
                      {bookingStatus === 'Pending' && 'Request Pending'}
                      {bookingStatus === 'Approved' && 'Request Approved!'}
                      {bookingStatus === 'Rejected' && 'Request Rejected'}
                      {(bookingStatus as any) === 'Confirmed' && 'Booking Confirmed!'}
                    </h3>

                    <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '12px' }}>
                      {bookingStatus === 'Pending' && 'Waiting for station master to approve your slot.'}
                      {bookingStatus === 'Approved' && 'Please complete payment to start navigation.'}
                      {bookingStatus === 'Rejected' && 'The station master has declined your request.'}
                      {(bookingStatus as any) === 'Confirmed' && 'Your slot is ready. Safe travels!'}
                    </p>

                    {bookingStatus === 'Rejected' && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.05)', padding: '10px', borderRadius: '8px', marginBottom: '12px', border: '1px dashed rgba(239, 68, 68, 0.2)' }}>
                         <div style={{ fontSize: '10px', color: '#ef4444', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Reason</div>
                         <div style={{ fontSize: '12px', color: 'white' }}>{currentRejectionReason || 'No reason provided.'}</div>
                      </div>
                    )}
                    
                    {bookingStatus === 'Pending' && (
                      <button 
                        onClick={checkBookingStatus}
                        style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '8px 12px', borderRadius: '8px', width: '100%', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
                      >
                        <Clock size={14} /> Refresh Status
                      </button>
                    )}

                    {bookingStatus === 'Approved' && (
                      <button 
                        onClick={handlePayment}
                        disabled={bookingLoading}
                        style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '8px', width: '100%', fontWeight: '600', cursor: bookingLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.2)', opacity: bookingLoading ? 0.7 : 1, fontSize: '14px' }}
                      >
                        {bookingLoading ? <div className="loader-small" /> : <Zap size={16} />}
                        {bookingLoading ? 'Processing...' : 'Pay & Confirm'}
                      </button>
                    )}

                    {bookingStatus === 'Confirmed' && (
                      <button 
                        onClick={() => setIsNavigating(true)}
                        style={{ background: '#22c55e', color: 'white', border: 'none', padding: '10px 14px', borderRadius: '8px', width: '100%', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.2)', fontSize: '14px' }}
                      >
                        <Navigation size={16} /> Start Live Tracking
                      </button>
                    )}

                    <button 
                      onClick={() => handleDirections(selectedStation!)}
                      style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '8px 12px', borderRadius: '8px', width: '100%', fontWeight: '600', marginTop: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
                    >
                      <LogOut size={14} style={{ transform: 'rotate(90deg)' }} /> Google Maps
                    </button>
                  </div>
                ) : null}

                <div style={{ marginBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', color: 'white', margin: 0 }}>{selectedStation.name}</h2>
                    {selectedStation.distance !== Infinity && (
                       <span style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                         {selectedStation.distance?.toFixed(1)} km
                       </span>
                    )}
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', marginTop: '6px', lineHeight: '1.4' }}>
                    <MapPin size={14} style={{ marginRight: '5px', flexShrink: 0 }} /> {selectedStation.address}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Price</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8' }}>₹{selectedStation.pricePerHour}/hr</div>
                  </div>
                  <div style={{ background: '#1e293b', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid #334155' }}>
                    <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '2px' }}>Capacity</div>
                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'white' }}>{selectedStation.totalSlots} Slots</div>
                  </div>
                </div>

                <div className={isMobile ? 'bottom-sheet-sticky-footer' : ''} style={!isMobile ? { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' } : undefined}>
                  <button 
                    onClick={() => handleDirections(selectedStation)}
                    style={{ background: 'transparent', color: '#38bdf8', border: '1px solid #38bdf8', padding: '12px', borderRadius: '10px', width: '100%', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}
                  >
                    <Navigation size={16} /> Get Directions
                  </button>

                  <button 
                    onClick={() => setIsBooking(true)}
                    style={{ background: '#1a73e8', color: 'white', padding: '12px', borderRadius: '10px', width: '100%', fontWeight: '600', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                  >
                    <Zap size={18} /> Pre-Book Slot
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1, overflowY: isMobile ? 'visible' : 'auto' }}>
                  <h2 style={{ fontSize: isMobile ? '20px' : '24px', fontWeight: '700', margin: 0 }}>Select Slot</h2>
                  
                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>Date</label>
                    <input 
                      type="date" 
                      required
                      style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px' }}
                      value={bookingData.date}
                      onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>Start Time</label>
                      <input 
                        type="time" 
                        required
                        style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px' }}
                        value={bookingData.startTime}
                        onChange={(e) => setBookingData({...bookingData, startTime: e.target.value})}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>End Time</label>
                      <input 
                        type="time" 
                        required
                        style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px' }}
                        value={bookingData.endTime}
                        onChange={(e) => setBookingData({...bookingData, endTime: e.target.value})}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '13px' }}>Vehicle Number</label>
                    <input 
                      type="text" 
                      required
                      style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px' }}
                      placeholder="GJ-01-XX-0000"
                      value={bookingData.vehicleNumber}
                      onChange={(e) => setBookingData({...bookingData, vehicleNumber: e.target.value})}
                    />
                  </div>
                </div>

                <div className={isMobile ? 'bottom-sheet-sticky-footer' : ''} style={{ display: 'flex', gap: '10px', marginTop: isMobile ? '0' : '20px' }}>
                  <button 
                    type="button"
                    onClick={() => setIsBooking(false)}
                    style={{ flex: 1, background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={bookingLoading}
                    style={{ flex: 2, background: '#22c55e', color: 'white', padding: '12px', borderRadius: '10px', fontWeight: '600', border: 'none', cursor: bookingLoading ? 'not-allowed' : 'pointer', opacity: bookingLoading ? 0.7 : 1, fontSize: '14px' }}
                  >
                    {bookingLoading ? 'Processing...' : 'Confirm & Pay'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Embedded style elements for smooth transitions */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .loader-small {
          width: 18px;
          height: 18px;
          border: 2px solid transparent;
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Home;

