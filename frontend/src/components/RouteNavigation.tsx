import { useEffect, useState } from 'react';
import { fetchRoute } from '../services/routeService';
import RoutePolyline from './RoutePolyline';
import { logger } from '../utils/logger';

interface RouteNavigationProps {
  userLocation: [number, number];
  stationLocation: [number, number];
  onRouteInfo?: (info: { distance: string; time: string }) => void;
}

const RouteNavigation = ({ userLocation, stationLocation, onRouteInfo }: RouteNavigationProps) => {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (!userLocation || !stationLocation) return;

    const getRoute = async () => {
      try {
        const route = await fetchRoute(userLocation, stationLocation);
        setRouteCoords(route.coordinates);
        if (onRouteInfo) {
          onRouteInfo({ distance: route.distance, time: route.duration });
        }
        setUseFallback(false);
      } catch (err) {
        logger.warn('Static OSRM routing failed, using fallback:', err);
        setUseFallback(true);
        setRouteCoords([userLocation, stationLocation]);
        if (onRouteInfo) {
          onRouteInfo({ distance: 'Unavailable', time: 'N/A' });
        }
      }
    };

    getRoute();
  }, [userLocation, stationLocation]);

  if (routeCoords.length < 2) return null;

  return (
    <RoutePolyline 
      positions={routeCoords} 
      isFallback={useFallback}
    />
  );
};

export default RouteNavigation;
