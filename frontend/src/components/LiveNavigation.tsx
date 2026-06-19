import { useEffect, useState, useRef } from 'react';
import { useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Navigation, Target, LogOut, AlertCircle } from 'lucide-react';
import { fetchRoute } from '../services/routeService';
import RoutePolyline from './RoutePolyline';

interface LiveNavigationProps {
  stationLocation: [number, number];
  onStop: () => void;
}

const navIcon = L.divIcon({
  className: 'nav-marker',
  html: `<div style="background-color: #38bdf8; width: 22px; height: 22px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 20px rgba(56, 189, 248, 0.9); display: flex; align-items: center; justify-content: center;">
            <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(56, 189, 248, 0.2); animation: pulse 1.5s infinite;"></div>
         </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const LiveNavigation = ({ stationLocation, onStop }: LiveNavigationProps) => {
  const map = useMap();
  const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; time: string } | null>(null);
  const [followMode, setFollowMode] = useState(true);
  const [useFallback, setUseFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const watchIdRef = useRef<number | null>(null);
  const lastFlyToRef = useRef<number>(0);
  const lastRouteFetchRef = useRef<number>(0);
  const followModeRef = useRef(followMode);

  // Sync followMode state to ref for watcher access
  useEffect(() => {
    followModeRef.current = followMode;
  }, [followMode]);

  const updateNavigation = async (userCoords: [number, number]) => {
    const now = Date.now();
    
    // Throttle route fetching to every 5 seconds
    if (now - lastRouteFetchRef.current > 5000) {
      try {
        const route = await fetchRoute(userCoords, stationLocation);
        setRouteCoords(route.coordinates);
        setRouteInfo({ distance: route.distance, time: route.duration });
        setUseFallback(false);
        lastRouteFetchRef.current = now;
      } catch (err) {
        console.warn('OSRM routing failed, using fallback:', err);
        setUseFallback(true);
        // On failure, use direct line for polyline
        setRouteCoords([userCoords, stationLocation]);
      }
    }
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported.");
      return;
    }

    console.log('Starting stabilized GPS tracking...');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCoords: [number, number] = [latitude, longitude];
        
        setCurrentLocation(newCoords);
        setError(null);

        // Update route and info
        updateNavigation(newCoords);

        // Map Follow Mode
        const now = Date.now();
        if (followModeRef.current && now - lastFlyToRef.current > 4000) {
          map.flyTo(newCoords, 17, { 
            duration: 1.5,
            easeLinearity: 0.25
          });
          lastFlyToRef.current = now;
        }
      },
      (err) => {
        console.error("GPS Error:", err);
        setError(err.code === 1 ? "Location access denied." : "Waiting for GPS signal...");
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [map]);

  const handleRecenter = () => {
    if (currentLocation) {
      setFollowMode(true);
      map.flyTo(currentLocation, 17, { duration: 1.5 });
      lastFlyToRef.current = Date.now();
    }
  };

  return (
    <>
      {/* Blue Route Polyline - Clean rendering */}
      {routeCoords.length > 0 && (
        <RoutePolyline 
          positions={routeCoords} 
          isFallback={useFallback}
        />
      )}

      {/* Live Location Marker */}
      {currentLocation && (
        <Marker position={currentLocation} icon={navIcon}>
          <Popup>Current Location</Popup>
        </Marker>
      )}

      {/* Navigation UI Overlay */}
      <div style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', zIndex: 1000, width: '90%', maxWidth: '420px' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '20px', padding: '18px', backdropFilter: 'blur(12px)', boxShadow: '0 12px 40px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: '#38bdf8', padding: '10px', borderRadius: '12px' }}>
                <Navigation size={22} color="white" />
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>Live Tracking</div>
                <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'white' }}>Heading to Station</div>
              </div>
            </div>
            <button 
              onClick={onStop}
              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Stop
            </button>
          </div>

          {error && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '12px', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {routeInfo ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>DISTANCE</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#38bdf8' }}>{routeInfo.distance}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', marginBottom: '4px' }}>ARRIVAL</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e' }}>{routeInfo.time}</div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontSize: '13px' }}>
              Calculating optimal path...
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button 
              onClick={handleRecenter}
              style={{ flex: 1, background: '#1a73e8', color: 'white', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer' }}
            >
              <Target size={20} /> Recenter
            </button>
            <button 
              onClick={() => setFollowMode(!followMode)}
              style={{ 
                background: followMode ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)', 
                color: followMode ? '#22c55e' : '#94a3b8', 
                border: '1px solid', 
                borderColor: followMode ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.2)', 
                padding: '14px', 
                borderRadius: '12px', 
                cursor: 'pointer'
              }}
              title={followMode ? "Auto-follow enabled" : "Auto-follow disabled"}
            >
              <LogOut size={20} style={{ transform: followMode ? 'rotate(0deg)' : 'rotate(180deg)' }} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </>
  );
};

export default LiveNavigation;
