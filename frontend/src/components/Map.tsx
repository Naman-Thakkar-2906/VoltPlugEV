import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const stationIcon = L.divIcon({
  className: 'custom-station-icon',
  html: `<div style="background-color: #1a73e8; padding: 5px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; box-shadow: 0 2px 10px rgba(0,0,0,0.3);">
           <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
         </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});


const userIcon = L.divIcon({
  className: 'user-location-icon',
  html: `<div style="background-color: #38bdf8; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px rgba(56, 189, 248, 0.8);">
           <div style="position: absolute; top: -2px; left: -2px; width: 24px; height: 24px; border-radius: 50%; background: rgba(56, 189, 248, 0.2); animation: pulse 2s infinite;"></div>
         </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

interface Station {
  _id: string;
  name: string;
  address: string;
  city: string;
  pricePerHour: number;
  totalSlots: number;
  location: {
    coordinates: [number, number]; // [long, lat]
  };
  distance?: number;
}

import RouteNavigation from './RouteNavigation';
import LiveNavigation from './LiveNavigation';

interface MapProps {
  onStationSelect?: (station: Station) => void;
  stations: Station[];
  center: [number, number];
  zoom: number;
  userLocation?: [number, number] | null;
  showRoute?: boolean;
  routeTarget?: [number, number] | null;
  onRouteInfo?: (info: { distance: string; time: string }) => void;
  isNavigating?: boolean;
  onStopNavigation?: () => void;
}

const MapUpdater = ({ center, zoom }: { center: [number, number], zoom: number }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, {
      duration: 1.5
    });
  }, [center, zoom, map]);
  return null;
};

const MapComponent = ({ stations, center, zoom, onStationSelect, userLocation, showRoute, routeTarget, onRouteInfo, isNavigating, onStopNavigation }: MapProps) => {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        
        <MapUpdater center={center} zoom={zoom} />

        {/* Real-time Tracking Mode */}
        {isNavigating && routeTarget ? (
          <LiveNavigation 
            stationLocation={routeTarget} 
            onStop={onStopNavigation || (() => {})} 
          />
        ) : (
          /* Static Route Mode (Post-booking preview) */
          showRoute && userLocation && routeTarget && (
            <RouteNavigation 
              userLocation={userLocation}
              stationLocation={routeTarget}
              onRouteInfo={onRouteInfo}
            />
          )
        )}

        {/* User Location Marker (Hide in Nav mode as LiveNavigation has its own) */}
        {!isNavigating && userLocation && (
          <Marker position={userLocation} icon={userIcon}>
             <Popup>You are here</Popup>
          </Marker>
        )}

        {stations.map((station) => (
          <Marker
            key={station._id}
            position={[station.location.coordinates[1], station.location.coordinates[0]]}
            icon={stationIcon}
            eventHandlers={{
              click: () => onStationSelect && onStationSelect(station),
            }}
          >
            <Popup className="station-popup">
              <div style={{ minWidth: '150px' }}>
                <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{station.name}</h3>
                <p style={{ margin: '0 0 5px 0', opacity: 0.8, fontSize: '13px' }}>{station.address}</p>
                
                {station.distance && station.distance !== Infinity && (
                  <div style={{ margin: '0 0 10px 0', color: '#38bdf8', fontSize: '12px', fontWeight: 'bold' }}>
                    ⚡ {station.distance.toFixed(1)} km away
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>₹{station.pricePerHour}/hr</span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${station.location.coordinates[1]},${station.location.coordinates[0]}${userLocation ? `&origin=${userLocation[0]},${userLocation[1]}` : ''}`, '_blank');
                      }}
                      style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}
                      title="Navigate"
                    >
                      Dir
                    </button>
                    <button 
                      onClick={() => onStationSelect && onStationSelect(station)}
                      style={{ background: '#1a73e8', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}
                    >
                      Select
                    </button>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(56, 189, 248, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); }
        }
      `}</style>
    </div>
  );
};

export default MapComponent;
