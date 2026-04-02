import { TouristLocation } from '../types';

export const GRAPH_CANVAS_WIDTH = 900;
export const GRAPH_CANVAS_HEIGHT = 600;
export const GRAPH_CANVAS_PADDING = 88;

export function hasGeoCoordinates(location: TouristLocation): location is TouristLocation & { lat: number; lng: number } {
  return typeof location.lat === 'number' && typeof location.lng === 'number';
}

function mercatorY(lat: number) {
  const radians = (lat * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + radians / 2));
}

export function projectGeoLocationsToCanvas(
  locations: TouristLocation[],
  options?: {
    width?: number;
    height?: number;
    padding?: number;
  },
) {
  const width = options?.width ?? GRAPH_CANVAS_WIDTH;
  const height = options?.height ?? GRAPH_CANVAS_HEIGHT;
  const padding = options?.padding ?? GRAPH_CANVAS_PADDING;
  const geoLocations = locations.filter(hasGeoCoordinates);

  if (geoLocations.length < 2) {
    return {} as Record<string, { x: number; y: number }>;
  }

  const longitudes = geoLocations.map(location => location.lng);
  const mercatorLatitudes = geoLocations.map(location => mercatorY(location.lat));
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const minMercatorLat = Math.min(...mercatorLatitudes);
  const maxMercatorLat = Math.max(...mercatorLatitudes);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const lngSpan = Math.max(maxLng - minLng, 0.000001);
  const latSpan = Math.max(maxMercatorLat - minMercatorLat, 0.000001);

  return Object.fromEntries(
    geoLocations.map(location => {
      const projectedLat = mercatorY(location.lat);
      return [
        location.id,
        {
          x: padding + ((location.lng - minLng) / lngSpan) * usableWidth,
          y: padding + ((maxMercatorLat - projectedLat) / latSpan) * usableHeight,
        },
      ];
    }),
  );
}

export function syncLocationsToProjectedCanvas(
  locations: TouristLocation[],
  overrides?: Partial<Record<string, { x?: number; y?: number }>>,
) {
  const projectedPositions = projectGeoLocationsToCanvas(locations);

  return locations.map(location => ({
    ...location,
    x: overrides?.[location.id]?.x ?? projectedPositions[location.id]?.x ?? location.x,
    y: overrides?.[location.id]?.y ?? projectedPositions[location.id]?.y ?? location.y,
  }));
}