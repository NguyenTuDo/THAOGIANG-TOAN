import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L, { type DivIcon, type LatLngExpression, type LatLngLiteral, type Map as LeafletMap } from 'leaflet';
import { Layers, LocateFixed, Route as RouteIcon, Settings2, X } from 'lucide-react';
import { MapContainer, Marker, Polyline, ScaleControl, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { GraphCanvasProps } from './GraphCanvas';
import { haversineKm } from '../lib/geo';
import { CATEGORY_EN, useLang } from '../contexts/LanguageContext';
import { getEdgeColor, getNodeColor } from '../lib/graphColors';
import { Route, TouristLocation } from '../types';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_NO_LABELS_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
const DARK_TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const DARK_NO_LABELS_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png';
const VOYAGER_TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const VOYAGER_NO_LABELS_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png';
const OSM_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; CARTO';
const DEFAULT_CENTER: LatLngExpression = [10.7799, 106.6957];
const DEFAULT_ZOOM = 15;
const FALLBACK_LAT_SCALE = 0.00008;
const FALLBACK_LNG_SCALE = 0.00008;

function hasCoordinates(location: TouristLocation): location is TouristLocation & { lat: number; lng: number } {
  return typeof location.lat === 'number' && typeof location.lng === 'number';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getFallbackLatLng(location: TouristLocation): LatLngLiteral {
  return {
    lat: (DEFAULT_CENTER as [number, number])[0] + (300 - location.y) * FALLBACK_LAT_SCALE,
    lng: (DEFAULT_CENTER as [number, number])[1] + (location.x - 450) * FALLBACK_LNG_SCALE,
  };
}

function getLocationLatLng(location: TouristLocation): LatLngLiteral {
  if (hasCoordinates(location)) {
    return { lat: location.lat, lng: location.lng };
  }

  return getFallbackLatLng(location);
}

function getAverageLatLng(latLngs: LatLngLiteral[]): LatLngLiteral {
  if (latLngs.length === 0) {
    return { lat: (DEFAULT_CENTER as [number, number])[0], lng: (DEFAULT_CENTER as [number, number])[1] };
  }

  return {
    lat: latLngs.reduce((sum, location) => sum + location.lat, 0) / latLngs.length,
    lng: latLngs.reduce((sum, location) => sum + location.lng, 0) / latLngs.length,
  };
}

function buildPolygonLayoutPositions(locations: TouristLocation[], order: string[], startId: string): Record<string, LatLngLiteral> {
  if (locations.length === 0) return {};

  const basePositions = Object.fromEntries(locations.map(location => [location.id, getLocationLatLng(location)])) as Record<string, LatLngLiteral>;
  const normalizedOrder = [
    ...order.filter(id => basePositions[id]),
    ...locations.map(location => location.id).filter(id => !order.includes(id)),
  ];
  const orderedIds = startId && normalizedOrder.includes(startId)
    ? [startId, ...normalizedOrder.filter(id => id !== startId)]
    : normalizedOrder;

  const baseLatLngs = locations.map(getLocationLatLng);
  const center = getAverageLatLng(baseLatLngs);
  const centerLatRad = (center.lat * Math.PI) / 180;
  const lngKmFactor = Math.max(Math.cos(centerLatRad), 0.3) * 111;
  const spreadKm = baseLatLngs.reduce((maxDistance, position) => {
    const latKm = (position.lat - center.lat) * 111;
    const lngKm = (position.lng - center.lng) * lngKmFactor;
    return Math.max(maxDistance, Math.hypot(latKm, lngKm));
  }, 0);
  const radiusKm = Math.max(0.85, Math.min(2.8, Math.max(spreadKm * 0.72, 0.65 + orderedIds.length * 0.22)));
  const latRadius = radiusKm / 111;
  const lngRadius = radiusKm / lngKmFactor;

  if (orderedIds.length === 1) {
    return {
      [orderedIds[0]]: center,
    };
  }

  if (orderedIds.length === 2) {
    return {
      [orderedIds[0]]: {
        lat: center.lat + latRadius,
        lng: center.lng,
      },
      [orderedIds[1]]: {
        lat: center.lat - latRadius,
        lng: center.lng,
      },
    };
  }

  return orderedIds.reduce<Record<string, LatLngLiteral>>((accumulator, id, index) => {
    const angle = (-Math.PI / 2) + (index * (2 * Math.PI / orderedIds.length));
    accumulator[id] = {
      lat: center.lat - (Math.sin(angle) * latRadius),
      lng: center.lng + (Math.cos(angle) * lngRadius),
    };
    return accumulator;
  }, {});
}

function fitMapToLocations(
  map: LeafletMap,
  locations: TouristLocation[],
  padding = 40,
  singleLocationZoom = 17,
) {
  if (locations.length === 0) return;

  const latLngs = locations.map(getLocationLatLng);

  if (latLngs.length >= 2) {
    map.fitBounds(L.latLngBounds(latLngs), { padding: [padding, padding] });
    return;
  }

  map.setView(latLngs[0], singleLocationZoom);
}

function midpointLatLng(from: LatLngLiteral, to: LatLngLiteral): LatLngLiteral {
  return {
    lat: (from.lat + to.lat) / 2,
    lng: (from.lng + to.lng) / 2,
  };
}

function isLatLngLiteral(value: unknown): value is LatLngLiteral {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<LatLngLiteral>;
  return typeof candidate.lat === 'number' && typeof candidate.lng === 'number';
}

function computeRotationDeg(from: LatLngLiteral, to: LatLngLiteral, mapInstance?: LeafletMap | null): number {
  if (mapInstance) {
    const fromPoint = mapInstance.latLngToContainerPoint(from);
    const toPoint = mapInstance.latLngToContainerPoint(to);
    return (Math.atan2(toPoint.y - fromPoint.y, toPoint.x - fromPoint.x) * 180) / Math.PI;
  }

  const centerLatRad = (((from.lat + to.lat) / 2) * Math.PI) / 180;
  const dx = (to.lng - from.lng) * Math.max(Math.cos(centerLatRad), 0.3);
  const dy = from.lat - to.lat;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

function sanitizePolyline(points: LatLngLiteral[]): LatLngLiteral[] {
  return points.filter((point, index, array) => {
    if (index === 0) return true;
    const previous = array[index - 1];
    return Math.abs(previous.lat - point.lat) > 0.000001 || Math.abs(previous.lng - point.lng) > 0.000001;
  });
}

function getRoutePolyline(
  route: Route,
  locationPositions: Record<string, LatLngLiteral>,
  fromId: string,
  toId: string,
): LatLngLiteral[] {
  const start = locationPositions[fromId];
  const end = locationPositions[toId];
  if (!start || !end) return [];

  const storedWaypoints = Array.isArray(route.routePoints)
    ? route.routePoints.filter(isLatLngLiteral)
    : [];

  const orientedPoints = route.from === fromId && route.to === toId
    ? [start, ...storedWaypoints, end]
    : route.from === toId && route.to === fromId
      ? [start, ...[...storedWaypoints].reverse(), end]
      : [start, end];

  if (storedWaypoints.length > 0) {
    return sanitizePolyline(orientedPoints);
  }

  return [start, end];
}

function getPolylineLength(points: LatLngLiteral[]): number {
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    total += haversineKm(points[index].lat, points[index].lng, points[index + 1].lat, points[index + 1].lng);
  }
  return total;
}

function getPointAlongPolyline(
  points: LatLngLiteral[],
  ratio: number,
  mapInstance?: LeafletMap | null,
): { position: LatLngLiteral; rotationDeg: number } | null {
  if (points.length === 0) return null;
  if (points.length === 1) {
    return { position: points[0], rotationDeg: 0 };
  }

  const clampedRatio = Math.min(Math.max(ratio, 0), 1);
  const segmentLengths = points.slice(0, -1).map((point, index) => (
    haversineKm(point.lat, point.lng, points[index + 1].lat, points[index + 1].lng)
  ));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0) || 1;
  const targetLength = totalLength * clampedRatio;

  let traversed = 0;
  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];
    const nextTraversed = traversed + segmentLength;
    if (targetLength <= nextTraversed || index === segmentLengths.length - 1) {
      const localRatio = segmentLength <= 0 ? 0 : (targetLength - traversed) / segmentLength;
      const from = points[index];
      const to = points[index + 1];
      return {
        position: {
          lat: from.lat + (to.lat - from.lat) * localRatio,
          lng: from.lng + (to.lng - from.lng) * localRatio,
        },
        rotationDeg: computeRotationDeg(from, to, mapInstance),
      };
    }
    traversed = nextTraversed;
  }

  const fallbackFrom = points[points.length - 2];
  const fallbackTo = points[points.length - 1];
  return {
    position: fallbackTo,
    rotationDeg: computeRotationDeg(fallbackFrom, fallbackTo, mapInstance),
  };
}

function createNodeIcon({
  label,
  fill,
  ring,
  ringWidth,
  isSelected,
  isCurrent,
  isEdgeStart,
  mini,
  compact,
}: {
  label: string;
  fill: string;
  ring: string | null;
  ringWidth: number;
  isSelected: boolean;
  isCurrent: boolean;
  isEdgeStart: boolean;
  mini: boolean;
  compact: boolean;
}): DivIcon {
  const ringColor = isSelected ? '#1d4ed8' : isEdgeStart ? '#f59e0b' : ring;
  const ringSize = isSelected ? 3 : isEdgeStart ? 3 : ringWidth;
  const effectiveRingSize = mini
    ? Math.max(Math.min(ringSize, 1.5), ringColor ? 1 : 0)
    : Math.max(ringSize, 2);
  const ringShadow = ringColor ? `0 0 0 ${effectiveRingSize}px ${ringColor}` : 'none';

  if (mini) {
    return L.divIcon({
      className: 'map-node-icon map-node-icon--mini',
      html: `
        <div class="map-node-shell map-node-shell--mini ${isCurrent ? 'is-current' : ''} ${isSelected ? 'is-selected' : ''}">
          <div class="map-node map-node--mini" style="background:${fill}; box-shadow:${ringShadow};"></div>
        </div>
      `,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });
  }

  const lines = label.split('\n').slice(0, 3);
  const labelHtml = lines
    .map(line => `<span class="map-node__line">${escapeHtml(line)}</span>`)
    .join('');

  if (compact) {
    const compactLabelHtml = lines
      .slice(0, 2)
      .map(line => `<span style="display:block; line-height:1.05;">${escapeHtml(line)}</span>`)
      .join('');

    return L.divIcon({
      className: 'map-node-icon map-node-icon--compact',
      html: `
        <div class="map-node-shell map-node-shell--compact ${isCurrent ? 'is-current' : ''} ${isSelected ? 'is-selected' : ''}" style="display:flex; flex-direction:column; align-items:center;">
          <div class="map-node" style="background:${fill}; box-shadow:${ringShadow}; width:34px; height:34px; border-radius:9999px;"></div>
          <div style="margin-top:5px; min-width:44px; max-width:78px; border:1px solid rgba(255,255,255,0.82); border-radius:9999px; background:rgba(255,255,255,0.92); padding:4px 7px; text-align:center; font-size:11px; font-weight:800; color:#1e293b; letter-spacing:-0.01em; box-shadow:0 8px 18px rgba(15,23,42,0.10); text-shadow:0 1px 0 rgba(255,255,255,0.45);">
            ${compactLabelHtml}
          </div>
        </div>
      `,
      iconSize: [82, 56],
      iconAnchor: [41, 17],
    });
  }

  return L.divIcon({
    className: 'map-node-icon',
    html: `
      <div class="map-node-shell ${isCurrent ? 'is-current' : ''} ${isSelected ? 'is-selected' : ''}">
        <div class="map-node-pulse"></div>
        <div class="map-node" style="background:${fill}; box-shadow:${ringShadow};">
          <div class="map-node__label">${labelHtml}</div>
        </div>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function createEdgeLabelIcon(
  distanceKm: number,
  isSelected: boolean,
  labelRing: string,
  labelText: string,
  highContrast: boolean,
  stateClass = '',
  subtle = false,
): DivIcon {
  return L.divIcon({
    className: 'map-edge-label-icon',
    html: `<div class="map-edge-label ${stateClass} ${isSelected ? 'is-selected' : ''} ${highContrast ? 'is-contrast' : ''}" style="--map-label-ring:${labelRing}; --map-label-text:${labelText}; ${subtle ? 'opacity:0.82; transform:scale(0.88); box-shadow:0 6px 14px rgba(15,23,42,0.08);' : ''}">${distanceKm.toFixed(1)}</div>`,
    iconSize: subtle ? [32, 18] : [36, 20],
    iconAnchor: subtle ? [16, 9] : [18, 10],
  });
}

function createDistanceBadgeIcon(
  distanceKm: number | null,
  status: 'current' | 'settled' | 'frontier' | 'unreached' | 'target',
  directionClass: string,
  subtle = false,
): DivIcon {
  const displayText = distanceKm === null ? '∞' : distanceKm.toFixed(1);

  return L.divIcon({
    className: 'map-distance-badge-icon',
    html: `<div class="map-distance-badge is-${status} ${directionClass}" style="${subtle ? 'opacity:0.84; transform:scale(0.88); box-shadow:0 6px 14px rgba(15,23,42,0.08);' : ''}">${displayText}</div>`,
    iconSize: subtle ? [36, 20] : [42, 22],
    iconAnchor: subtle ? [18, 10] : [21, 11],
  });
}

function createOrderBadgeIcon(order: number, isStart: boolean, isEnd: boolean): DivIcon {
  const stateClass = isStart ? 'is-start' : isEnd ? 'is-end' : '';
  return L.divIcon({
    className: 'map-route-order-icon',
    html: `<div class="map-route-order ${stateClass}">${order}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

function createFlowArrowIcon(rotationDeg: number): DivIcon {
  return L.divIcon({
    className: 'map-route-flow-icon',
    html: `<div class="map-route-flow" style="transform: rotate(${rotationDeg}deg)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h11" /><path d="M12 6l6 6-6 6" /></svg></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

function createVehicleIcon(rotationDeg: number): DivIcon {
  return L.divIcon({
    className: 'map-route-vehicle-icon',
    html: `<div class="map-route-vehicle-glow"><div class="map-route-vehicle" style="transform: rotate(${rotationDeg}deg)"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h10" /><path d="M12 6l8 6-8 6" /></svg></div></div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function MapViewportSync({
  locations,
  fitPadding,
  singleLocationZoom,
}: {
  locations: TouristLocation[];
  fitPadding: number;
  singleLocationZoom: number;
}) {
  const map = useMap();
  const fittedLocationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const fitKey = locations
      .map(location => {
        const position = getLocationLatLng(location);
        return `${location.id}:${position.lat.toFixed(5)}:${position.lng.toFixed(5)}`;
      })
      .sort()
      .join('|');

    let cancelled = false;
    let retryTimerId: number | null = null;

    const syncViewport = () => {
      if (cancelled) return;

      const size = map.getSize();
      if (size.x <= 0 || size.y <= 0) {
        retryTimerId = window.setTimeout(syncViewport, 16);
        return;
      }

      map.invalidateSize({ pan: false, debounceMoveend: true });

      if (fitKey && fittedLocationKeyRef.current !== fitKey) {
        fitMapToLocations(map, locations, fitPadding, singleLocationZoom);
        fittedLocationKeyRef.current = fitKey;
      }
    };

    retryTimerId = window.setTimeout(syncViewport, 0);

    return () => {
      cancelled = true;
      if (retryTimerId !== null) {
        window.clearTimeout(retryTimerId);
      }
    };
  }, [fitPadding, locations, map, singleLocationZoom]);

  return null;
}

function MapResizeSync() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (typeof ResizeObserver === 'undefined') return;

    let frameId: number | null = null;
    const observer = new ResizeObserver(() => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        map.invalidateSize({ pan: false, debounceMoveend: true });
        frameId = null;
      });
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [map]);

  return null;
}

function MapInteractionSync({
  onMapReady,
  onBackgroundClick,
}: {
  onMapReady: (map: LeafletMap) => void;
  onBackgroundClick: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  useMapEvents({
    click: onBackgroundClick,
  });

  return null;
}

export const MapCanvas: React.FC<GraphCanvasProps> = ({
  locations,
  routes,
  appMode,
  uiMode,
  startId,
  endId,
  selectedSubset,
  currentStep,
  highlightedPaths,
  activePathIndex,
  selectedElement,
  onLocationClick,
  onLocationDrag,
  onRouteClick,
  onSelectElement,
  edgeStart,
  onEdgeStartSet,
  onAddRoute,
  showOrderedFlow = false,
  animatePathVehicle = false,
  vehicleProgressOverride = null,
  vehiclePositionOverride = null,
  vehicleRotationOverride = null,
  hideMapControls = false,
  hideScaleControl = false,
  hideZoomControl = false,
  hideAttributionControl = false,
  disableMapInteraction = false,
  miniNodeIcons = false,
  compactNodeLabels = false,
  fitPadding = 40,
  singleLocationZoom = 17,
  defaultShowDistanceLabels = true,
  subtleWeightLabels = false,
  defaultShowMapBackground = false,
  defaultTileTheme = 'light',
  allowedTileThemes = ['light', 'voyager', 'street', 'dark'],
  compactMapControls = false,
  focusedLocationId = null,
  onFocusedLocationScreenPositionChange,
  displayLayoutMode = 'geo',
  displayLayoutOrder = [],
}) => {
  const { lang, t } = useLang();
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const suppressClickLocationIdRef = useRef<string | null>(null);
  const [tileTheme, setTileTheme] = useState<'light' | 'voyager' | 'street' | 'dark'>(
    allowedTileThemes.includes(defaultTileTheme) ? defaultTileTheme : allowedTileThemes[0] ?? 'light',
  );
  const [showDistanceLabels, setShowDistanceLabels] = useState(defaultShowDistanceLabels);
  const [showMapBackground, setShowMapBackground] = useState(defaultShowMapBackground);
  const [vehicleProgress, setVehicleProgress] = useState(0);
  const [mapControlsOpen, setMapControlsOpen] = useState(!compactMapControls);
  const [pendingRoute, setPendingRoute] = useState<{
    fromId: string;
    toId: string;
    suggestedKm: number | null;
    distanceValue: string;
  } | null>(null);
  const [edgeNotice, setEdgeNotice] = useState<string | null>(null);

  const highlightPath = highlightedPaths[activePathIndex] ?? [];
  const isSubsetStepMode = appMode === 'subset' && Boolean(currentStep?.distanceSnapshot?.length);
  const orderedPath = useMemo(
    () => (highlightPath.length > 1 && highlightPath[0] === highlightPath[highlightPath.length - 1]
      ? highlightPath.slice(0, -1)
      : highlightPath),
    [highlightPath],
  );
  const modeAccent = appMode === 'path'
    ? { edgeHalo: 'rgba(255, 241, 242, 0.98)', edgeStroke: '#e11d48', labelRing: '#fb7185', labelText: '#9f1239' }
    : appMode === 'subset'
      ? { edgeHalo: 'rgba(255, 247, 237, 0.98)', edgeStroke: '#d97706', labelRing: '#f59e0b', labelText: '#9a3412' }
      : { edgeHalo: 'rgba(236, 253, 245, 0.98)', edgeStroke: '#059669', labelRing: '#34d399', labelText: '#065f46' };
  const hasHighlightedRoute = highlightPath.length > 1;
  const highlightedAccent = hasHighlightedRoute
    ? { edgeHalo: 'rgba(254, 226, 226, 0.98)', edgeStroke: '#ef4444', labelRing: '#f87171', labelText: '#b91c1c' }
    : modeAccent;
  const polygonLayoutActive = displayLayoutMode === 'polygon';
  const effectiveShowMapBackground = polygonLayoutActive ? false : showMapBackground;
  const tileUrl = useMemo(() => {
    if (tileTheme === 'dark') {
      return effectiveShowMapBackground ? DARK_TILE_URL : DARK_NO_LABELS_URL;
    }
    if (tileTheme === 'voyager') {
      return effectiveShowMapBackground ? VOYAGER_TILE_URL : VOYAGER_NO_LABELS_URL;
    }
    if (tileTheme === 'street') {
      return effectiveShowMapBackground ? OSM_TILE_URL : TILE_NO_LABELS_URL;
    }
    return effectiveShowMapBackground ? TILE_URL : TILE_NO_LABELS_URL;
  }, [effectiveShowMapBackground, tileTheme]);

  useEffect(() => {
    if (!allowedTileThemes.includes(tileTheme)) {
      setTileTheme(allowedTileThemes[0] ?? 'light');
    }
  }, [allowedTileThemes, tileTheme]);

  const locationMap = useMemo(
    () => new Map(locations.map(location => [location.id, location])),
    [locations],
  );
  const routeMap = useMemo(
    () => new Map(routes.map(route => [route.id, route])),
    [routes],
  );

  const locationPositions = useMemo(() => {
    if (displayLayoutMode === 'polygon') {
      return buildPolygonLayoutPositions(locations, displayLayoutOrder, startId);
    }

    return Object.fromEntries(locations.map(location => [location.id, getLocationLatLng(location)])) as Record<string, LatLngLiteral>;
  }, [displayLayoutMode, displayLayoutOrder, locations]);

  const displayLocations = useMemo(
    () => locations.map(location => {
      const position = locationPositions[location.id] ?? getLocationLatLng(location);
      return {
        ...location,
        lat: position.lat,
        lng: position.lng,
      };
    }),
    [locationPositions, locations],
  );

  const initialCenter = useMemo<LatLngExpression>(() => {
    if (displayLocations.length === 0) return DEFAULT_CENTER;

    const average = getAverageLatLng(displayLocations.map(getLocationLatLng));
    return [average.lat, average.lng];
  }, [displayLocations]);

  useEffect(() => {
    if (!onFocusedLocationScreenPositionChange || !mapInstance || !focusedLocationId) {
      onFocusedLocationScreenPositionChange?.(null);
      return;
    }

    const updatePosition = () => {
      const position = locationPositions[focusedLocationId] as LatLngLiteral | undefined;
      if (!position) {
        onFocusedLocationScreenPositionChange(null);
        return;
      }

      const point = mapInstance.latLngToContainerPoint(position);
      onFocusedLocationScreenPositionChange({ x: point.x, y: point.y });
    };

    updatePosition();
    mapInstance.on('move zoom resize', updatePosition);

    return () => {
      mapInstance.off('move zoom resize', updatePosition);
    };
  }, [focusedLocationId, locationPositions, mapInstance, onFocusedLocationScreenPositionChange]);

  const flowSegments = useMemo(() => {
    if (highlightPath.length < 2) return [] as Array<{
      fromId: string;
      toId: string;
      from: LatLngLiteral;
      to: LatLngLiteral;
      midpoint: LatLngLiteral;
      rotationDeg: number;
      length: number;
      cumulativeStart: number;
      cumulativeEnd: number;
    }>;

    const rawSegments = highlightPath.slice(0, -1).flatMap((fromId, index) => {
      const toId = highlightPath[index + 1];
      const routeId = [fromId, toId].sort().join('__');
      const route = routeMap.get(routeId);
      if (!route) return [];

      const polyline = getRoutePolyline(route, locationPositions, fromId, toId);
      if (polyline.length < 2) return [];

      return polyline.slice(0, -1).map((from, polylineIndex) => {
        const to = polyline[polylineIndex + 1];
        return {
          fromId,
          toId,
          from,
          to,
          midpoint: midpointLatLng(from, to),
          rotationDeg: computeRotationDeg(from, to, mapInstance),
          length: Math.max(haversineKm(from.lat, from.lng, to.lat, to.lng), 0.00001),
        };
      });
    }) as Array<{
      fromId: string;
      toId: string;
      from: LatLngLiteral;
      to: LatLngLiteral;
      midpoint: LatLngLiteral;
      rotationDeg: number;
      length: number;
    }>;

    const totalLength = rawSegments.reduce((sum, segment) => sum + segment.length, 0) || 1;
    let cumulative = 0;
    return rawSegments.map(segment => {
      const normalizedLength = segment.length / totalLength;
      const flowSegment = {
        ...segment,
        cumulativeStart: cumulative,
        cumulativeEnd: cumulative + normalizedLength,
      };
      cumulative += normalizedLength;
      return flowSegment;
    });
  }, [highlightPath, locationPositions, mapInstance, routeMap]);

  const animatedVehicle = useMemo(() => {
    const motionEnabled = animatePathVehicle || vehicleProgressOverride !== null || vehiclePositionOverride !== null;
    if (!motionEnabled || flowSegments.length === 0) return null;

    if (vehiclePositionOverride) {
      const effectiveProgress = vehicleProgressOverride ?? vehicleProgress;
      const activeSegment = flowSegments.find(segment => effectiveProgress <= segment.cumulativeEnd) ?? flowSegments[flowSegments.length - 1];

      return {
        position: vehiclePositionOverride,
        rotationDeg: vehicleRotationOverride ?? activeSegment.rotationDeg,
      };
    }

    const effectiveProgress = vehicleProgressOverride ?? vehicleProgress;
    const activeSegment = flowSegments.find(segment => effectiveProgress <= segment.cumulativeEnd) ?? flowSegments[flowSegments.length - 1];
    const segmentSpan = Math.max(activeSegment.cumulativeEnd - activeSegment.cumulativeStart, 0.00001);
    const localProgress = Math.min(Math.max((effectiveProgress - activeSegment.cumulativeStart) / segmentSpan, 0), 1);
    const basePosition = {
      lat: activeSegment.from.lat + (activeSegment.to.lat - activeSegment.from.lat) * localProgress,
      lng: activeSegment.from.lng + (activeSegment.to.lng - activeSegment.from.lng) * localProgress,
    };
    const isStoppedAtNode = vehicleProgressOverride !== null && localProgress >= 0.995;

    return {
      position: isStoppedAtNode
        ? {
            lat: basePosition.lat + 0.00014,
            lng: basePosition.lng + 0.00008,
          }
        : basePosition,
      rotationDeg: activeSegment.rotationDeg,
    };
  }, [animatePathVehicle, flowSegments, vehiclePositionOverride, vehicleProgress, vehicleProgressOverride, vehicleRotationOverride]);

  const handleRouteClick = useCallback((routeId: string) => {
    onEdgeStartSet(null);
    onRouteClick(routeId);
    onSelectElement({ type: 'route', id: routeId });
  }, [onEdgeStartSet, onRouteClick, onSelectElement]);

  useEffect(() => {
    if (!edgeNotice) return;
    const timerId = window.setTimeout(() => setEdgeNotice(null), 2800);
    return () => window.clearTimeout(timerId);
  }, [edgeNotice]);

  useEffect(() => {
    if (vehicleProgressOverride !== null || vehiclePositionOverride !== null) {
      return;
    }

    if (!animatePathVehicle || flowSegments.length === 0) {
      setVehicleProgress(0);
      return;
    }

    const timerId = window.setInterval(() => {
      setVehicleProgress(current => (current >= 0.995 ? 0 : current + 0.015));
    }, 80);

    return () => window.clearInterval(timerId);
  }, [animatePathVehicle, flowSegments, vehiclePositionOverride, vehicleProgressOverride]);

  const openPendingRoute = useCallback((fromId: string, toId: string) => {
    const fromLocation = locationMap.get(fromId);
    const toLocation = locationMap.get(toId);
    if (!fromLocation || !toLocation) return;

    const suggestedKm = hasCoordinates(fromLocation) && hasCoordinates(toLocation)
      ? haversineKm(fromLocation.lat, fromLocation.lng, toLocation.lat, toLocation.lng)
      : null;

    setPendingRoute({
      fromId,
      toId,
      suggestedKm,
      distanceValue: suggestedKm ? suggestedKm.toFixed(1) : '',
    });
  }, [locationMap]);

  const handleLocationSelect = useCallback((locationId: string) => {
    if (uiMode === 'edit') {
      if (edgeStart && edgeStart !== locationId) {
        const existingRoute = routes.find(route =>
          (route.from === edgeStart && route.to === locationId) ||
          (route.from === locationId && route.to === edgeStart),
        );

        if (!existingRoute) {
          openPendingRoute(edgeStart, locationId);
        } else {
          setEdgeNotice(`Cạnh ${existingRoute.from} → ${existingRoute.to} đã tồn tại.`);
          onSelectElement({ type: 'route', id: existingRoute.id });
        }

        onEdgeStartSet(null);
        return;
      }

      onEdgeStartSet(edgeStart === locationId ? null : locationId);
      onSelectElement({ type: 'location', id: locationId });
      return;
    }

    onLocationClick(locationId);
    onSelectElement({ type: 'location', id: locationId });
  }, [edgeStart, onEdgeStartSet, onLocationClick, onSelectElement, openPendingRoute, routes, uiMode]);

  const handlePendingRouteConfirm = useCallback(() => {
    if (!pendingRoute) return;

    const distanceKm = Number(pendingRoute.distanceValue);
    if (!Number.isFinite(distanceKm) || distanceKm <= 0) return;

    onAddRoute(pendingRoute.fromId, pendingRoute.toId, distanceKm);
    setPendingRoute(null);
  }, [onAddRoute, pendingRoute]);

  const updateDraggedLocation = useCallback((location: TouristLocation, latLng: LatLngLiteral) => {
    if (!mapInstance) return;

    const size = mapInstance.getSize();
    const point = mapInstance.latLngToContainerPoint(latLng);
    const x = (point.x / Math.max(size.x, 1)) * 900;
    const y = (point.y / Math.max(size.y, 1)) * 600;
    onLocationDrag(location.id, x, y, { lat: latLng.lat, lng: latLng.lng });
  }, [mapInstance, onLocationDrag]);

  return (
    <div className={`relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm ${effectiveShowMapBackground ? '' : 'map-background-muted'}`}>
      <MapContainer
        center={initialCenter}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={!disableMapInteraction}
        dragging={!disableMapInteraction}
        doubleClickZoom={!disableMapInteraction}
        touchZoom={!disableMapInteraction}
        boxZoom={!disableMapInteraction}
        keyboard={!disableMapInteraction}
        zoomControl={!hideZoomControl}
        attributionControl={!hideAttributionControl}
        zoomAnimation={false}
        markerZoomAnimation={true}
        fadeAnimation={false}
        className="h-full w-full z-0"
      >
        {!polygonLayoutActive && <TileLayer attribution={TILE_ATTRIBUTION} url={tileUrl} />}
        {!hideScaleControl && <ScaleControl position="bottomleft" metric imperial={false} />}
        <MapViewportSync
          locations={displayLocations}
          fitPadding={fitPadding}
          singleLocationZoom={singleLocationZoom}
        />
        <MapResizeSync />
        <MapInteractionSync onMapReady={setMapInstance} onBackgroundClick={() => {
          onSelectElement(null);
          onEdgeStartSet(null);
          setPendingRoute(null);
          setEdgeNotice(null);
        }} />

        {routes.map(route => {
          const from = locationMap.get(route.from);
          const to = locationMap.get(route.to);
          if (!from || !to) return null;

          const fromPosition = locationPositions[from.id] as LatLngLiteral;
          const toPosition = locationPositions[to.id] as LatLngLiteral;
          const routePolyline = getRoutePolyline(route, locationPositions, route.from, route.to);
          if (routePolyline.length < 2) return null;

          const midpoint = getPointAlongPolyline(routePolyline, 0.5, mapInstance)?.position ?? midpointLatLng(fromPosition, toPosition);
          const isSelected = selectedElement?.type === 'route' && selectedElement.id === route.id;
          const { stroke, width, dashed } = getEdgeColor(route, currentStep, highlightPath);
          const edgeEvaluation = currentStep?.edgeEvaluations?.find(item => (
            (item.fromId === route.from && item.toId === route.to) ||
            (item.fromId === route.to && item.toId === route.from)
          ));
          const edgeLabelStateClass = edgeEvaluation
            ? edgeEvaluation.accepted
              ? 'is-accepted'
              : 'is-rejected'
            : '';

          const shouldShowEdgeDistanceLabel = showDistanceLabels && (
            appMode === 'subset' ||
            !isSubsetStepMode ||
            Boolean(edgeEvaluation) ||
            isSelected
          );

          return (
            <React.Fragment key={route.id}>
              <Polyline
                positions={routePolyline}
                pathOptions={{
                  color: edgeEvaluation
                    ? (edgeEvaluation.accepted ? 'rgba(219,234,254,0.98)' : 'rgba(255,247,ed,0.98)')
                    : (effectiveShowMapBackground ? 'rgba(255,255,255,0.96)' : 'rgba(255,255,255,0.94)'),
                  weight: edgeEvaluation
                    ? (edgeEvaluation.accepted ? 14 : 12)
                    : (effectiveShowMapBackground ? (isSelected ? 8 : width + 4) : (isSelected ? 9 : width + 5)),
                  lineCap: 'round',
                  dashArray: dashed ? '8 4' : undefined,
                }}
                interactive={false}
              />
              <Polyline
                positions={routePolyline}
                pathOptions={{ color: '#000000', opacity: 0.001, weight: 18 }}
                eventHandlers={{ click: () => handleRouteClick(route.id) }}
              />
              <Polyline
                positions={routePolyline}
                pathOptions={{
                  color: isSelected ? '#f59e0b' : stroke,
                  weight: edgeEvaluation
                    ? width
                    : (effectiveShowMapBackground ? (isSelected ? 5 : width) : (isSelected ? 5.5 : width + 0.7)),
                  dashArray: dashed ? '8 4' : undefined,
                  lineCap: 'round',
                  opacity: edgeEvaluation ? 1 : (isSelected ? 1 : 0.95),
                }}
                eventHandlers={{ click: () => handleRouteClick(route.id) }}
              />
              {shouldShowEdgeDistanceLabel && (
                <Marker
                  position={midpoint}
                  icon={createEdgeLabelIcon(
                    route.distanceKm,
                    isSelected,
                    highlightedAccent.labelRing,
                    highlightedAccent.labelText,
                    !effectiveShowMapBackground,
                    edgeLabelStateClass,
                    subtleWeightLabels,
                  )}
                  interactive={false}
                  keyboard={false}
                  zIndexOffset={100}
                />
              )}
            </React.Fragment>
          );
        })}

        {showOrderedFlow && flowSegments.map((segment, index) => (
          <Marker
            key={`flow-${segment.fromId}-${segment.toId}-${index}`}
            position={segment.midpoint}
            icon={createFlowArrowIcon(segment.rotationDeg)}
            interactive={false}
            keyboard={false}
            zIndexOffset={520}
          />
        ))}

        {showOrderedFlow && orderedPath.map((locationId, index) => {
          const position = locationPositions[locationId] as LatLngLiteral | undefined;
          if (!position) return null;
          return (
            <Marker
              key={`order-${locationId}-${index}`}
              position={position}
              icon={createOrderBadgeIcon(index + 1, index === 0, appMode === 'path' && index === orderedPath.length - 1)}
              interactive={false}
              keyboard={false}
              zIndexOffset={650}
            />
          );
        })}

        {locations.map(location => {
          const position = locationPositions[location.id] as LatLngLiteral;
          const locationIndex = locations.findIndex(item => item.id === location.id);
          const { fill, ring, ringWidth } = getNodeColor(
            location,
            currentStep,
            highlightPath,
            startId,
            endId,
            appMode,
            selectedSubset,
          );
          const isCurrent = currentStep?.currentNodeId === location.id;
          const isSelected = selectedElement?.type === 'location' && selectedElement.id === location.id;
          const badgeDirectionClass = locationIndex % 2 === 0 ? 'dir-top-left' : 'dir-top-right';

          return (
            <React.Fragment key={location.id}>
              <Marker
                position={position}
                icon={createNodeIcon({
                  label: location.label,
                  fill,
                  ring,
                  ringWidth,
                  isSelected,
                  isCurrent,
                  isEdgeStart: uiMode === 'edit' && edgeStart === location.id,
                  mini: miniNodeIcons,
                  compact: compactNodeLabels,
                })}
                draggable={uiMode === 'edit'}
                autoPan={false}
                zIndexOffset={isSelected ? 600 : isCurrent ? 500 : 400}
                eventHandlers={{
                  click: () => {
                    if (suppressClickLocationIdRef.current === location.id) {
                      suppressClickLocationIdRef.current = null;
                      return;
                    }
                    handleLocationSelect(location.id);
                  },
                  dragstart: () => {
                    mapInstance?.dragging.disable();
                  },
                  dragend: event => {
                    mapInstance?.dragging.enable();
                    suppressClickLocationIdRef.current = location.id;
                    updateDraggedLocation(location, event.target.getLatLng());
                  },
                }}
              >
                <Tooltip direction="top" offset={[0, -18]} className="map-node-tooltip">
                  <div className="space-y-1.5">
                    <div className="text-sm font-bold text-slate-900">{t(location.fullName, location.fullNameEn)}</div>
                    <div className="text-[11px] font-semibold text-slate-500">{lang === 'en' ? (CATEGORY_EN[location.category] ?? location.category) : location.category}</div>
                    <div className="max-w-[220px] text-xs leading-5 text-slate-600">
                      {t(location.shortIntro ?? location.description ?? '', location.shortIntroEn ?? location.descriptionEn)}
                    </div>
                    {location.visitDuration && (
                      <div className="text-[11px] text-slate-400">{t('Gợi ý thời lượng', 'Suggested visit')}: {location.visitDuration}</div>
                    )}
                  </div>
                </Tooltip>
              </Marker>

              {currentStep?.distanceSnapshot?.find(item => item.nodeId === location.id) && !miniNodeIcons && (() => {
                const snapshot = currentStep.distanceSnapshot?.find(item => item.nodeId === location.id);
                if (!snapshot) return null;
                return (
                  <Marker
                    position={position}
                    icon={createDistanceBadgeIcon(snapshot.distanceKm, snapshot.status, badgeDirectionClass, subtleWeightLabels)}
                    interactive={false}
                    keyboard={false}
                    zIndexOffset={720}
                  />
                );
              })()}
            </React.Fragment>
          );
        })}

        {animatedVehicle && (
          <Marker
            position={animatedVehicle.position}
            icon={createVehicleIcon(animatedVehicle.rotationDeg)}
            interactive={false}
            keyboard={false}
            zIndexOffset={5000}
          />
        )}
      </MapContainer>

      <div className={`pointer-events-none absolute inset-0 z-[350] ${effectiveShowMapBackground ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.14))]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.22))]'}`} />

      {uiMode === 'edit' && (
        <div className="absolute bottom-3 left-3 z-[520] max-w-sm rounded-2xl border border-white/70 bg-white/94 px-4 py-3 text-xs leading-6 text-slate-600 shadow-[0_16px_34px_rgba(15,23,42,0.16)] backdrop-blur">
          {edgeStart
            ? `Đã chọn ${edgeStart}. Bấm điểm thứ hai để tạo cạnh, hoặc bấm nền để hủy.`
            : 'Kéo điểm để đổi vị trí. Muốn thêm cạnh mới, bấm vào một điểm rồi bấm điểm thứ hai. Tắt nền map nếu muốn nhìn gọn như đồ thị.'}
        </div>
      )}

      {edgeNotice && (
        <div className="absolute left-1/2 top-4 z-[535] -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 shadow-[0_12px_28px_rgba(146,64,14,0.14)]">
          {edgeNotice}
        </div>
      )}

      {pendingRoute && (
        <div className="absolute bottom-3 left-1/2 z-[530] w-[22rem] -translate-x-1/2 rounded-2xl border border-white/70 bg-white/96 p-4 shadow-[0_20px_40px_rgba(15,23,42,0.18)] backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Thêm cạnh mới</div>
          <div className="mt-2 text-sm font-bold text-slate-900">{pendingRoute.fromId} → {pendingRoute.toId}</div>
          <div className="mt-1 text-xs text-slate-500">
            {pendingRoute.suggestedKm
              ? `Khoảng cách gợi ý theo tọa độ: ${pendingRoute.suggestedKm.toFixed(1)} km`
              : 'Nhập trọng số cho cạnh mới.'}
          </div>
          <input
            type="number"
            min="0"
            step="0.1"
            value={pendingRoute.distanceValue}
            onChange={event => setPendingRoute(current => current ? { ...current, distanceValue: event.target.value } : null)}
            className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-slate-400"
            placeholder="Ví dụ: 1.2"
            title="Nhập khoảng cách cho cạnh mới"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPendingRoute(null)}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handlePendingRouteConfirm}
              className="rounded-full bg-[#14342b] px-4 py-2 text-sm font-semibold text-white"
            >
              Lưu cạnh
            </button>
          </div>
        </div>
      )}

      {!hideMapControls && (
        <>
        {compactMapControls && (
          <button
            type="button"
            onClick={() => setMapControlsOpen(current => !current)}
            className="absolute right-3 top-3 z-[500] inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/92 px-4 py-2 text-sm font-semibold text-slate-800 shadow-[0_14px_26px_rgba(15,23,42,0.14)] backdrop-blur hover:bg-white"
            title={t('Cài đặt bản đồ', 'Map settings')}
          >
            {mapControlsOpen ? <X className="h-4 w-4" /> : <Settings2 className="h-4 w-4" />} {t('Cài đặt', 'Settings')}
          </button>
        )}
        {mapControlsOpen && (
        <div className={`absolute right-3 ${compactMapControls ? 'top-16' : 'top-3'} z-[500] w-56 rounded-2xl border border-white/70 bg-white/92 p-3 shadow-[0_16px_34px_rgba(15,23,42,0.16)] backdrop-blur`}>
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{t('Bản đồ nâng cao', 'Advanced map')}</div>
        <div className="mt-2 text-sm font-bold text-slate-900">{t('Điều khiển hiển thị', 'Display controls')}</div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-1">
          {allowedTileThemes.includes('light') && (
            <button
              type="button"
              onClick={() => setTileTheme('light')}
              className={`rounded-xl px-2 py-2 text-[11px] font-semibold ${tileTheme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              {t('Sáng', 'Light')}
            </button>
          )}
          {allowedTileThemes.includes('voyager') && (
            <button
              type="button"
              onClick={() => setTileTheme('voyager')}
              className={`rounded-xl px-2 py-2 text-[11px] font-semibold ${tileTheme === 'voyager' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              {t('Màu', 'Color')}
            </button>
          )}
          {allowedTileThemes.includes('street') && (
            <button
              type="button"
              onClick={() => setTileTheme('street')}
              className={`rounded-xl px-2 py-2 text-[11px] font-semibold ${tileTheme === 'street' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Street
            </button>
          )}
          {allowedTileThemes.includes('dark') && (
            <button
              type="button"
              onClick={() => setTileTheme('dark')}
              className={`rounded-xl px-2 py-2 text-[11px] font-semibold ${tileTheme === 'dark' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              {t('Tối', 'Dark')}
            </button>
          )}
        </div>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => mapInstance && fitMapToLocations(mapInstance, displayLocations, fitPadding, singleLocationZoom)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2"><LocateFixed className="h-4 w-4" /> {t('Căn lại khung nhìn', 'Fit view')}</span>
            <span className="text-[11px] text-slate-400">Fit</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDistanceLabels(current => !current)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2"><RouteIcon className="h-4 w-4" /> {t('Nhãn khoảng cách', 'Distance labels')}</span>
            <span className="text-[11px] text-slate-400">{showDistanceLabels ? t('Bật', 'On') : t('Tắt', 'Off')}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowMapBackground(current => !current)}
            disabled={polygonLayoutActive}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex items-center gap-2"><Layers className="h-4 w-4" /> {t('Nền map', 'Map background')}</span>
            <span className="text-[11px] text-slate-400">{polygonLayoutActive ? t('Ẩn trong Dễ nhìn', 'Hidden in Easy view') : (effectiveShowMapBackground ? t('Bật', 'On') : t('Tắt', 'Off'))}</span>
          </button>
        </div>

        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><Layers className="h-3.5 w-3.5" /> {t('Cơ chế nâng cao', 'Advanced mode')}</div>
          <div className="mt-1">{t('Đổi kiểu nền, bật hoặc tắt nền map và tô nhấn khác nhau theo từng bài để dữ liệu nổi bật hơn.', 'Switch tile style, toggle map background, and apply per-mode highlights to make data stand out.')}</div>
        </div>
        </div>
        )}
        </>
      )}
    </div>
  );
};
