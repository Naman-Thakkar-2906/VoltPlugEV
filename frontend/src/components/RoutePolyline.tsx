import { Polyline } from 'react-leaflet';
// navigation path
interface RoutePolylineProps {
  positions: [number, number][];
  color?: string;
  isFallback?: boolean;
}

const RoutePolyline = ({ positions, color = '#38bdf8', isFallback = false }: RoutePolylineProps) => {
  if (!positions || positions.length < 2) return null;

  return (
    <>
      {/* Outer line */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: '#0ea5e9',
          weight: 8,
          opacity: 0.3,
          lineJoin: 'round',
          lineCap: 'round',
        }}
      />
      
      {/* Core line */}
      <Polyline
        positions={positions}
        pathOptions={{
          color: color,
          weight: 5,
          opacity: 0.9,
          dashArray: isFallback ? '10, 10' : undefined,
          lineJoin: 'round',
          lineCap: 'round',
        }}
      />

      <style>{`
        .leaflet-interactive {
          transition: stroke-dashoffset 0.1s linear;
        }
      `}</style>
    </>
  );
};

export default RoutePolyline;
