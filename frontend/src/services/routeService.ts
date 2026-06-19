import axios from 'axios';

export interface RouteResponse {
  coordinates: [number, number][]; // [lat, lng]
  distance: string;
  duration: string;
  summary: string;
}

import { logger } from '../utils/logger';

/**
 * RouteService - Handles fetching directions from OSRM API
 */
export const fetchRoute = async (
  start: [number, number], // [lat, lng]
  end: [number, number]    // [lat, lng]
): Promise<RouteResponse> => {
  try {
    // OSRM expects coordinates in [lng, lat] format
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;
    
    const response = await axios.get(url);
    
    if (response.data && response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const geojson = route.geometry;
      
      // Convert [lng, lat] from GeoJSON back to [lat, lng] for Leaflet
      const coordinates: [number, number][] = geojson.coordinates.map(
        (coord: [number, number]) => [coord[1], coord[0]]
      );
      
      // Calculate human-readable distance and time
      const distance = (route.distance / 1000).toFixed(1) + ' km';
      const duration = Math.round(route.duration / 60) + ' mins';
      
      return {
        coordinates,
        distance,
        duration,
        summary: route.weight_name || 'Driving'
      };
    }
    
    throw new Error('No route found');
  } catch (error) {
    logger.error('Error fetching route from OSRM:', error);
    throw error;
  }
};
