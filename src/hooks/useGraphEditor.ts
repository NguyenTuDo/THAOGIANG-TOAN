import { useCallback } from 'react';
import { GraphData, TouristLocation, Route } from '../types';

function routeId(a: string, b: string): string {
  return [a, b].sort().join('__');
}

interface UseGraphEditorProps {
  graphData: GraphData;
  setGraphData: React.Dispatch<React.SetStateAction<GraphData>>;
  startId: string;
  setStartId: (id: string) => void;
  endId: string | null;
  setEndId: (id: string | null) => void;
}

export function useGraphEditor({
  graphData,
  setGraphData,
  startId,
  setStartId,
  endId,
  setEndId,
}: UseGraphEditorProps) {
  const handleAddLocation = useCallback(
    (loc: Omit<TouristLocation, 'id'> & { id?: string }, x: number, y: number) => {
      const newId = loc.id?.toUpperCase().trim() || 'NEW';
      // Avoid duplicate IDs
      const exists = graphData.locations.some(l => l.id === newId);
      if (exists) return false;

      const newLocation: TouristLocation = {
        id: newId,
        label: newId,
        fullName: loc.fullName || newId,
        category: loc.category || 'Danh lam thắng cảnh',
        description: loc.description || '',
        x,
        y,
      };

      setGraphData(prev => ({
        ...prev,
        locations: [...prev.locations, newLocation],
      }));
      return true;
    },
    [graphData.locations, setGraphData]
  );

  const handleDeleteLocation = useCallback(
    (id: string) => {
      setGraphData(prev => ({
        locations: prev.locations.filter(l => l.id !== id),
        routes: prev.routes.filter(r => r.from !== id && r.to !== id),
      }));
      if (startId === id) setStartId('');
      if (endId === id) setEndId(null);
    },
    [startId, endId, setStartId, setEndId, setGraphData]
  );

  const handleMoveLocation = useCallback(
    (id: string, x: number, y: number) => {
      setGraphData(prev => ({
        ...prev,
        locations: prev.locations.map(l => (l.id === id ? { ...l, x, y } : l)),
      }));
    },
    [setGraphData]
  );

  const handleAddRoute = useCallback(
    (from: string, to: string, distanceKm: number) => {
      if (from === to) return;
      const id = routeId(from, to);
      const exists = graphData.routes.some(r => r.id === id);
      if (exists) return;
      const newRoute: Route = { id, from, to, distanceKm };
      setGraphData(prev => ({ ...prev, routes: [...prev.routes, newRoute] }));
    },
    [graphData.routes, setGraphData]
  );

  const handleUpdateRouteDistance = useCallback(
    (id: string, distanceKm: number) => {
      setGraphData(prev => ({
        ...prev,
        routes: prev.routes.map(r =>
          r.id === id ? { ...r, distanceKm: Math.max(0.1, distanceKm) } : r
        ),
      }));
    },
    [setGraphData]
  );

  const handleDeleteRoute = useCallback(
    (id: string) => {
      setGraphData(prev => ({
        ...prev,
        routes: prev.routes.filter(r => r.id !== id),
      }));
    },
    [setGraphData]
  );

  return {
    handleAddLocation,
    handleDeleteLocation,
    handleMoveLocation,
    handleAddRoute,
    handleUpdateRouteDistance,
    handleDeleteRoute,
  };
}
