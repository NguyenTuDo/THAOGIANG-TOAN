import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import L, { type DivIcon, type LatLngExpression, type LatLngLiteral, type Map as LeafletMap } from 'leaflet';
import { Layers, LocateFixed, Route as RouteIcon } from 'lucide-react';
import { MapContainer, Marker, Polyline, ScaleControl, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import { GraphCanvasProps } from './GraphCanvas';
import { haversineKm } from '../lib/geo';
import { getEdgeColor, getNodeColor } from '../lib/graphColors';
import { TouristLocation } from '../types';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_NO_LABELS_URL = 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png';
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

function fitMapToLocations(map: LeafletMap, locations: TouristLocation[]) {
  if (locations.length === 0) return;

  const latLngs = locations.map(getLocationLatLng);

  if (latLngs.length >= 2) {
    map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
    return;
  }

  map.setView(latLngs[0], 17);
}

function midpointLatLng(from: LatLngLiteral, to: LatLngLiteral): LatLngLiteral {
  return {
    lat: (from.lat + to.lat) / 2,
    lng: (from.lng + to.lng) / 2,
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
}: {
  label: string;
  fill: string;
  ring: string | null;
  ringWidth: number;
  isSelected: boolean;
  isCurrent: boolean;
  isEdgeStart: boolean;
}): DivIcon {
  const lines = label.split('\n').slice(0, 3);
  const labelHtml = lines
    .map(line => `<span class="map-node__line">${escapeHtml(line)}</span>`)
    .join('');

  const ringColor = isSelected ? '#1d4ed8' : isEdgeStart ? '#f59e0b' : ring;
  const ringSize = isSelected ? 3 : isEdgeStart ? 3 : ringWidth;
  const ringShadow = ringColor ? `0 0 0 ${Math.max(ringSize, 2)}px ${ringColor}` : 'none';

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
): DivIcon {
  return L.divIcon({
    className: 'map-edge-label-icon',
    html: `<div class="map-edge-label ${isSelected ? 'is-selected' : ''} ${highContrast ? 'is-contrast' : ''}" style="--map-label-ring:${labelRing}; --map-label-text:${labelText};">${distanceKm.toFixed(1)}</div>`,
    iconSize: [36, 20],
    iconAnchor: [18, 10],
  });
}

function MapViewportSync({
  locations,
}: {
  locations: TouristLocation[];
}) {
  const map = useMap();
  const fittedLocationKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const fitKey = locations
      .map(location => `${location.id}:${hasCoordinates(location) ? 'geo' : 'fallback'}`)
      .sort()
      .join('|');

    if (fitKey && fittedLocationKeyRef.current !== fitKey) {
      fitMapToLocations(map, locations);
      fittedLocationKeyRef.current = fitKey;
    }

    const timerId = window.setTimeout(() => {
      map.invalidateSize();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [locations, map]);

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
}) => {
  const [mapInstance, setMapInstance] = useState<LeafletMap | null>(null);
  const suppressClickLocationIdRef = useRef<string | null>(null);
  const [tileTheme, setTileTheme] = useState<'light' | 'voyager' | 'street'>('light');
  const [showDistanceLabels, setShowDistanceLabels] = useState(true);
  const [showMapBackground, setShowMapBackground] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<{
    fromId: string;
    toId: string;
    suggestedKm: number | null;
    distanceValue: string;
  } | null>(null);
  const [edgeNotice, setEdgeNotice] = useState<string | null>(null);

  const highlightPath = highlightedPaths[activePathIndex] ?? [];
  const modeAccent = appMode === 'path'
    ? { edgeHalo: 'rgba(255, 241, 242, 0.98)', edgeStroke: '#e11d48', labelRing: '#fb7185', labelText: '#9f1239' }
    : appMode === 'subset'
      ? { edgeHalo: 'rgba(255, 247, 237, 0.98)', edgeStroke: '#d97706', labelRing: '#f59e0b', labelText: '#9a3412' }
      : { edgeHalo: 'rgba(236, 253, 245, 0.98)', edgeStroke: '#059669', labelRing: '#34d399', labelText: '#065f46' };
  const tileUrl = useMemo(() => {
    if (tileTheme === 'voyager') {
      return showMapBackground ? VOYAGER_TILE_URL : VOYAGER_NO_LABELS_URL;
    }
    if (tileTheme === 'street') {
      return showMapBackground ? OSM_TILE_URL : TILE_NO_LABELS_URL;
    }
    return showMapBackground ? TILE_URL : TILE_NO_LABELS_URL;
  }, [showMapBackground, tileTheme]);

  const initialCenter = useMemo<LatLngExpression>(() => {
    if (locations.length === 0) return DEFAULT_CENTER;

    const latLngs = locations.map(getLocationLatLng);
    const averageLat = latLngs.reduce((sum, location) => sum + location.lat, 0) / latLngs.length;
    const averageLng = latLngs.reduce((sum, location) => sum + location.lng, 0) / latLngs.length;
    return [averageLat, averageLng];
  }, [locations]);

  const locationMap = useMemo(
    () => new Map(locations.map(location => [location.id, location])),
    [locations],
  );

  const locationPositions = useMemo(
    () => Object.fromEntries(locations.map(location => [location.id, getLocationLatLng(location)])),
    [locations],
  );

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
    <div className={`relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 shadow-sm ${showMapBackground ? '' : 'map-background-muted'}`}>
      <MapContainer
        center={initialCenter}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        zoomAnimation={false}
        markerZoomAnimation={true}
        fadeAnimation={false}
        className="h-full w-full z-0"
      >
        <TileLayer attribution={TILE_ATTRIBUTION} url={tileUrl} />
        <ScaleControl position="bottomleft" metric imperial={false} />
        <MapViewportSync locations={locations} />
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
          const midpoint = midpointLatLng(fromPosition, toPosition);
          const isSelected = selectedElement?.type === 'route' && selectedElement.id === route.id;
          const { stroke, width, dashed } = getEdgeColor(route, currentStep, highlightPath);

          return (
            <React.Fragment key={route.id}>
              <Polyline
                positions={[fromPosition, toPosition]}
                pathOptions={{
                  color: showMapBackground ? 'rgba(255,255,255,0.92)' : modeAccent.edgeHalo,
                  weight: showMapBackground ? (isSelected ? 7 : width + 3) : (isSelected ? 8 : width + 4),
                  lineCap: 'round',
                  dashArray: dashed ? '8 4' : undefined,
                }}
                interactive={false}
              />
              <Polyline
                positions={[fromPosition, toPosition]}
                pathOptions={{ color: '#000000', opacity: 0.001, weight: 18 }}
                eventHandlers={{ click: () => handleRouteClick(route.id) }}
              />
              <Polyline
                positions={[fromPosition, toPosition]}
                pathOptions={{
                  color: isSelected ? '#f59e0b' : (showMapBackground ? stroke : modeAccent.edgeStroke),
                  weight: showMapBackground ? (isSelected ? 5 : width) : (isSelected ? 5.5 : width + 0.7),
                  dashArray: dashed ? '8 4' : undefined,
                  lineCap: 'round',
                  opacity: isSelected ? 1 : 0.95,
                }}
                eventHandlers={{ click: () => handleRouteClick(route.id) }}
              />
              {showDistanceLabels && (
                <Marker
                  position={midpoint}
                  icon={createEdgeLabelIcon(route.distanceKm, isSelected, modeAccent.labelRing, modeAccent.labelText, !showMapBackground)}
                  interactive={false}
                  keyboard={false}
                  zIndexOffset={100}
                />
              )}
            </React.Fragment>
          );
        })}

        {locations.map(location => {
          const position = locationPositions[location.id] as LatLngLiteral;
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

          return (
            <Marker
              key={location.id}
              position={position}
              icon={createNodeIcon({
                label: location.label,
                fill,
                ring,
                ringWidth,
                isSelected,
                isCurrent,
                isEdgeStart: uiMode === 'edit' && edgeStart === location.id,
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
                  <div className="text-sm font-bold text-slate-900">{location.fullName}</div>
                  <div className="text-[11px] font-semibold text-slate-500">{location.category}</div>
                  <div className="max-w-[220px] text-xs leading-5 text-slate-600">
                    {location.shortIntro ?? location.description}
                  </div>
                  {location.visitDuration && (
                    <div className="text-[11px] text-slate-400">Gợi ý thời lượng: {location.visitDuration}</div>
                  )}
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      <div className={`pointer-events-none absolute inset-0 z-[350] ${showMapBackground ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.14))]' : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.22))]'}`} />

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

      <div className="absolute right-3 top-3 z-[500] w-56 rounded-2xl border border-white/70 bg-white/92 p-3 shadow-[0_16px_34px_rgba(15,23,42,0.16)] backdrop-blur">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Bản đồ nâng cao</div>
        <div className="mt-2 text-sm font-bold text-slate-900">Điều khiển hiển thị</div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setTileTheme('light')}
            className={`rounded-xl px-2 py-2 text-[11px] font-semibold ${tileTheme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Sáng
          </button>
          <button
            type="button"
            onClick={() => setTileTheme('voyager')}
            className={`rounded-xl px-2 py-2 text-[11px] font-semibold ${tileTheme === 'voyager' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Voyager
          </button>
          <button
            type="button"
            onClick={() => setTileTheme('street')}
            className={`rounded-xl px-2 py-2 text-[11px] font-semibold ${tileTheme === 'street' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
          >
            Street
          </button>
        </div>

        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => mapInstance && fitMapToLocations(mapInstance, locations)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2"><LocateFixed className="h-4 w-4" /> Căn lại khung nhìn</span>
            <span className="text-[11px] text-slate-400">Fit</span>
          </button>
          <button
            type="button"
            onClick={() => setShowDistanceLabels(current => !current)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2"><RouteIcon className="h-4 w-4" /> Nhãn khoảng cách</span>
            <span className="text-[11px] text-slate-400">{showDistanceLabels ? 'Bật' : 'Tắt'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowMapBackground(current => !current)}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2"><Layers className="h-4 w-4" /> Nền map</span>
            <span className="text-[11px] text-slate-400">{showMapBackground ? 'Bật' : 'Tắt'}</span>
          </button>
        </div>

        <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
          <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700"><Layers className="h-3.5 w-3.5" /> Cơ chế nâng cao</div>
          <div className="mt-1">Đổi kiểu nền, bật hoặc tắt nền map và tô nhấn khác nhau theo từng bài để dữ liệu nổi bật hơn.</div>
        </div>
      </div>
    </div>
  );
};
