import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Expand, ExternalLink, GripVertical, PencilLine, Plus, Trash2, X } from 'lucide-react';
import { AppMode, GraphData, PresetSelection, PresetSelectionMap, Route, SelectedElement, TouristLocation } from '../types';
import { MapCanvas } from './MapCanvas';
import { LocationCard } from './LocationCard';
import { LocationDetailModal } from './LocationDetailModal';
import { projectGeoLocationsToCanvas, syncLocationsToProjectedCanvas } from '../lib/geoProjection';

interface AdminDashboardProps {
  graphData: GraphData;
  presets: PresetSelectionMap;
  onSaveLocation: (location: TouristLocation) => Promise<void>;
  onDeleteLocation: (locationId: string) => Promise<void>;
  onSaveLocationOrder: (locationIds: string[]) => Promise<void>;
  onSaveRoute: (route: Route) => Promise<void>;
  onDeleteRoute: (routeId: string) => Promise<void>;
  onSavePreset: (mode: AppMode, preset: Pick<PresetSelection, 'ids' | 'startId' | 'endId'>) => Promise<void>;
  onSeedInitialData?: () => Promise<void>;
}

const EMPTY_LOCATION: TouristLocation = {
  id: '',
  label: '',
  fullName: '',
  fullNameEn: '',
  category: 'Danh lam thắng cảnh',
  description: '',
  descriptionEn: '',
  shortIntro: '',
  shortIntroEn: '',
  imageUrl: undefined,
  images: [],
  googleMapsUrl: '',
  neighborhood: '',
  neighborhoodEn: '',
  visitDuration: '',
  bestFor: '',
  bestForEn: '',
  highlights: [],
  highlightsEn: [],
  lat: undefined,
  lng: undefined,
  x: 450,
  y: 280,
};

const EMPTY_ROUTE: Route = {
  id: '',
  from: '',
  to: '',
  distanceKm: 0,
};

const MODE_LABELS: Record<AppMode, string> = {
  cycle: 'Chu trình Hamilton',
  path: 'Đường đi Hamilton',
  subset: 'Đường đi ngắn nhất',
};

const CATEGORY_OPTIONS: TouristLocation['category'][] = [
  'Di sản học đường',
  'Danh lam thắng cảnh',
  'Ẩm thực',
  'Mua sắm',
  'Bảo tàng',
  'Công viên',
  'Khách sạn',
];

const POSITION_AUTOSAVE_DELAY_MS = 1200;

type LocalPositionDraft = {
  x: number;
  y: number;
  lat?: number;
  lng?: number;
  source: 'map' | 'graph';
};

function isSameLocalPosition(a?: LocalPositionDraft, b?: LocalPositionDraft) {
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.lat === b.lat && a.lng === b.lng && a.source === b.source;
}

function buildRouteId(from: string, to: string) {
  return [from, to].sort().join('__');
}

export function AdminDashboard({
  graphData,
  presets,
  onSaveLocation,
  onDeleteLocation,
  onSaveLocationOrder,
  onSaveRoute,
  onDeleteRoute,
  onSavePreset,
  onSeedInitialData,
}: AdminDashboardProps) {
  const [locationForm, setLocationForm] = useState<TouristLocation>(EMPTY_LOCATION);
  const [highlightsDraft, setHighlightsDraft] = useState('');
  const [highlightsEnDraft, setHighlightsEnDraft] = useState('');
  const [routeForm, setRouteForm] = useState<Route>(EMPTY_ROUTE);
  const [routeWeights, setRouteWeights] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);
  const [savingPositions, setSavingPositions] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [locationPreviewOpen, setLocationPreviewOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [edgeStart, setEdgeStart] = useState<string | null>(null);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null);
  const [hiddenLocationIds, setHiddenLocationIds] = useState<string[]>([]);
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
  const [draggedLocationId, setDraggedLocationId] = useState<string | null>(null);
  const [dragOverLocation, setDragOverLocation] = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const localPositionsRef = useRef<Record<string, LocalPositionDraft>>({});
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local canvas positions: updated instantly on drag, then persisted after a short idle delay.
  const [localPositions, setLocalPositions] = useState<Record<string, LocalPositionDraft>>({});
  const hasPendingPositions = Object.keys(localPositions).length > 0;

  const persistPositions = useCallback(async (
    positionsToSave: Record<string, LocalPositionDraft>,
    options?: { showSuccessMessage?: boolean }
  ) => {
    if (Object.keys(positionsToSave).length === 0) return;

    setSavingPositions(true);
    try {
      const mergedLocations = graphData.locations.map(location => {
        const local = positionsToSave[location.id];
        return local
          ? {
              ...location,
              x: local.x,
              y: local.y,
              lat: local.lat ?? location.lat,
              lng: local.lng ?? location.lng,
            }
          : location;
      });
      const projectedPositions = projectGeoLocationsToCanvas(mergedLocations);
      const hasMapChanges = Object.values(positionsToSave).some(position => position.source === 'map');

      const locationsToPersist = hasMapChanges ? mergedLocations : mergedLocations.filter(location => positionsToSave[location.id]);

      for (const location of locationsToPersist) {
        const local = positionsToSave[location.id];
        const projected = projectedPositions[location.id];
        await onSaveLocation({
          ...location,
          x: Math.round(local?.source === 'graph' ? local.x : (projected?.x ?? location.x)),
          y: Math.round(local?.source === 'graph' ? local.y : (projected?.y ?? location.y)),
          lat: local?.lat ?? location.lat,
          lng: local?.lng ?? location.lng,
        });
      }

      setLocalPositions(current => {
        const next = { ...current };
        for (const [id, savedPosition] of Object.entries(positionsToSave)) {
          if (isSameLocalPosition(current[id], savedPosition)) {
            delete next[id];
          }
        }
        return next;
      });

      if (options?.showSuccessMessage) {
        showSuccess('Đã lưu vị trí các điểm trên bản đồ và đồ thị.');
      }
    } catch (error) {
      showError(error);
    } finally {
      setSavingPositions(false);
    }
  }, [graphData.locations, onSaveLocation]);

  const handleSavePositions = useCallback(async (options?: { showSuccessMessage?: boolean }) => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    const positionsSnapshot = localPositionsRef.current;
    if (Object.keys(positionsSnapshot).length === 0) return;
    await persistPositions(positionsSnapshot, options);
  }, [persistPositions]);

  const allLocationIds = useMemo(() => graphData.locations.map(location => location.id), [graphData.locations]);
  const hiddenLocationIdSet = useMemo(() => new Set(hiddenLocationIds), [hiddenLocationIds]);
  const selectedRoute = useMemo(() => {
    if (selectedElement?.type !== 'route') return null;
    return graphData.routes.find(route => route.id === selectedElement.id) ?? null;
  }, [graphData.routes, selectedElement]);
  const orderedLocations = useMemo(() => graphData.locations, [graphData.locations]);
  const locationPreviewDraft = useMemo<TouristLocation>(() => {
    const trimmedId = locationForm.id.trim().toUpperCase() || 'NEW';
    const fullName = locationForm.fullName.trim() || 'Tên địa danh sẽ hiện ở đây';
    const description = locationForm.description.trim() || 'Mô tả chi tiết sẽ hiện trong modal để thầy thấy khách sẽ đọc gì sau khi bấm vào card.';

    return {
      ...EMPTY_LOCATION,
      ...locationForm,
      id: trimmedId,
      label: (locationForm.label || trimmedId).trim() || trimmedId,
      fullName,
      fullNameEn: locationForm.fullNameEn?.trim() || fullName,
      shortIntro: locationForm.shortIntro?.trim() || description,
      shortIntroEn: locationForm.shortIntroEn?.trim() || locationForm.shortIntro?.trim() || description,
      description,
      descriptionEn: locationForm.descriptionEn?.trim() || description,
      neighborhood: locationForm.neighborhood?.trim() || 'Khu vực sẽ hiện ở đây',
      neighborhoodEn: locationForm.neighborhoodEn?.trim() || locationForm.neighborhood?.trim() || 'Area badge',
      bestFor: locationForm.bestFor?.trim() || 'Nhóm khách phù hợp',
      bestForEn: locationForm.bestForEn?.trim() || locationForm.bestFor?.trim() || 'Best-fit audience',
      visitDuration: locationForm.visitDuration?.trim() || '20-30 phút',
      googleMapsUrl: locationForm.googleMapsUrl?.trim() || 'https://maps.google.com',
      images: (locationForm.images ?? []).map(url => url.trim()).filter(Boolean),
      highlights: highlightsDraft.split(',').map(item => item.trim()).filter(Boolean),
      highlightsEn: highlightsEnDraft.split(',').map(item => item.trim()).filter(Boolean),
    };
  }, [highlightsDraft, highlightsEnDraft, locationForm]);

  // Canvas locations = Supabase data + in-flight drag overrides + auto-spread if all at default
  const canvasLocations = useMemo(() => {
    const locs = graphData.locations;
    if (locs.length <= 1) return locs;

    const mergedLocations = locs.map(loc => {
      const local = localPositions[loc.id];
      return local
        ? { ...loc, x: local.x, y: local.y, lat: local.lat ?? loc.lat, lng: local.lng ?? loc.lng }
        : loc;
    });

    const withLocal = syncLocationsToProjectedCanvas(
      mergedLocations,
      Object.fromEntries(
        Object.entries(localPositions)
          .filter(([, position]) => position.source === 'graph')
          .map(([id, position]) => [id, { x: position.x, y: position.y }]),
      ),
    );

    // Auto-spread nodes that are still at the default position (no real position set yet)
    const DEFAULT_X = 450, DEFAULT_Y = 280;
    const isAtDefault = (orig: TouristLocation) =>
      !localPositions[orig.id] &&
      Math.abs(orig.x - DEFAULT_X) < 5 &&
      Math.abs(orig.y - DEFAULT_Y) < 5;
    const defaultCount = locs.filter(isAtDefault).length;
    if (defaultCount <= 1) return withLocal;

    const cols = Math.ceil(Math.sqrt(locs.length));
    const spacing = 140;
    const startX = DEFAULT_X - ((cols - 1) * spacing) / 2;
    const startY = DEFAULT_Y - ((Math.ceil(locs.length / cols) - 1) * spacing) / 2;
    // Use the node's original array index `i` as the grid slot — NOT a sequential counter.
    // If we used autoIdx++, dragging one node out of the default pool would shift all
    // subsequent default nodes to lower slots, causing the "nearest node to the right"
    // to jump into the dragged node's old position.
    return withLocal.map((loc, i) => {
      if (!isAtDefault(locs[i])) return loc;
      return { ...loc, x: startX + (i % cols) * spacing, y: startY + Math.floor(i / cols) * spacing };
    });
  }, [graphData.locations, localPositions]);
  const selectedLocation = useMemo(() => {
    if (selectedElement?.type !== 'location') return null;
    return canvasLocations.find(location => location.id === selectedElement.id) ?? null;
  }, [canvasLocations, selectedElement]);
  const selectedLocationHasPendingPosition = selectedLocation
    ? Boolean(localPositions[selectedLocation.id])
    : false;
  const focusedLocation = useMemo(
    () => (focusedLocationId ? canvasLocations.find(location => location.id === focusedLocationId) ?? null : null),
    [canvasLocations, focusedLocationId],
  );
  const visibleCanvasLocations = useMemo(
    () => focusedLocationId
      ? canvasLocations.filter(location => location.id === focusedLocationId)
      : canvasLocations.filter(location => !hiddenLocationIdSet.has(location.id)),
    [canvasLocations, focusedLocationId, hiddenLocationIdSet],
  );
  const visibleRoutes = useMemo(
    () => graphData.routes.filter(route => {
      if (focusedLocationId) {
        return route.from === focusedLocationId && route.to === focusedLocationId;
      }
      return !hiddenLocationIdSet.has(route.from) && !hiddenLocationIdSet.has(route.to);
    }),
    [focusedLocationId, graphData.routes, hiddenLocationIdSet],
  );
  const hiddenRouteCount = graphData.routes.length - visibleRoutes.length;

  const toggleLocationVisibility = useCallback((locationId: string) => {
    setFocusedLocationId(current => current === locationId ? null : current);
    setHiddenLocationIds(current => (
      current.includes(locationId)
        ? current.filter(id => id !== locationId)
        : [...current, locationId]
    ));
  }, []);

  const showAllLocationsOnMap = useCallback(() => {
    setFocusedLocationId(null);
    setHiddenLocationIds([]);
  }, []);

  const focusLocationOnMap = useCallback((locationId: string) => {
    setFocusedLocationId(current => current === locationId ? null : locationId);
    setSelectedElement({ type: 'location', id: locationId });
    setEdgeStart(null);
  }, []);

  React.useEffect(() => {
    setRouteWeights(
      Object.fromEntries(graphData.routes.map(route => [route.id, route.distanceKm])),
    );
  }, [graphData.routes]);

  useEffect(() => {
    localPositionsRef.current = localPositions;
  }, [localPositions]);

  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (!hasPendingPositions || savingPositions) return;

    autosaveTimerRef.current = setTimeout(() => {
      void handleSavePositions();
    }, POSITION_AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [hasPendingPositions, localPositions, savingPositions, handleSavePositions]);

  useEffect(() => {
    if (!selectedElement) return;

    if (selectedElement.type === 'route' && !graphData.routes.some(route => route.id === selectedElement.id)) {
      setSelectedElement(null);
    }

    if (selectedElement.type === 'location' && !graphData.locations.some(location => location.id === selectedElement.id)) {
      setSelectedElement(null);
    }
  }, [graphData.locations, graphData.routes, selectedElement]);

  useEffect(() => {
    setHiddenLocationIds(current => current.filter(id => allLocationIds.includes(id)));
  }, [allLocationIds]);

  useEffect(() => {
    if (focusedLocationId && !allLocationIds.includes(focusedLocationId)) {
      setFocusedLocationId(null);
    }
  }, [allLocationIds, focusedLocationId]);

  useEffect(() => {
    if (edgeStart && hiddenLocationIdSet.has(edgeStart)) {
      setEdgeStart(null);
    }

    if (focusedLocationId && edgeStart && edgeStart !== focusedLocationId) {
      setEdgeStart(null);
    }

    if (!selectedElement) return;

    if (selectedElement.type === 'location' && (hiddenLocationIdSet.has(selectedElement.id) || (focusedLocationId !== null && selectedElement.id !== focusedLocationId))) {
      setSelectedElement(null);
      return;
    }

    if (selectedElement.type === 'route') {
      const route = graphData.routes.find(item => item.id === selectedElement.id);
      const routeHiddenByFocus = focusedLocationId !== null && (route?.from !== focusedLocationId || route?.to !== focusedLocationId);
      if (!route || hiddenLocationIdSet.has(route.from) || hiddenLocationIdSet.has(route.to) || routeHiddenByFocus) {
        setSelectedElement(null);
      }
    }
  }, [edgeStart, focusedLocationId, graphData.routes, hiddenLocationIdSet, selectedElement]);

  useEffect(() => {
    if (!isFullscreenMap) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreenMap(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreenMap]);

  const showSuccess = (message: string) => {
    setStatusTone('success');
    setStatus(message);
  };

  const showError = (error: unknown) => {
    const rawMessage = error instanceof Error ? error.message : 'Không thể lưu dữ liệu.';
    const missingColumnKeywords = [
      'googleMapsUrl', 'fullNameEn', 'descriptionEn', 'shortIntroEn',
      'neighborhoodEn', 'bestForEn', 'highlightsEn', 'displayOrder',
    ];
    const permissionKeywords = [
      'row-level security',
      'permission denied',
      'new row violates row-level security policy',
    ];
    const friendlyMessage = missingColumnKeywords.some(col => rawMessage.includes(col))
      ? 'Supabase đang thiếu cột. Vào SUPABASE_SETUP.md → Bước 2b và chạy SQL nâng cấp schema.'
      : permissionKeywords.some(keyword => rawMessage.toLowerCase().includes(keyword))
        ? 'Tài khoản hiện tại chưa có quyền ghi dữ liệu trên Supabase. Hãy cập nhật policy theo email admin trong SUPABASE_SETUP.md, hoặc thêm User Metadata {"role":"admin"} cho tài khoản này rồi đăng nhập lại.'
      : rawMessage;
    setStatusTone('error');
    setStatus(friendlyMessage);
  };

  const handleLocationSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const normalized: TouristLocation = {
        ...locationForm,
        id: locationForm.id.trim().toUpperCase(),
        label: (locationForm.label || locationForm.id).trim().slice(0, 8),
        fullName: locationForm.fullName.trim(),
        fullNameEn: locationForm.fullNameEn?.trim() || undefined,
        description: locationForm.description.trim(),
        descriptionEn: locationForm.descriptionEn?.trim() || undefined,
        shortIntro: locationForm.shortIntro?.trim() || undefined,
        shortIntroEn: locationForm.shortIntroEn?.trim() || undefined,
        images: (locationForm.images ?? []).map(u => u.trim()).filter(Boolean),
        imageUrl: undefined,
        googleMapsUrl: locationForm.googleMapsUrl?.trim() || undefined,
        neighborhood: locationForm.neighborhood?.trim() || undefined,
        neighborhoodEn: locationForm.neighborhoodEn?.trim() || undefined,
        visitDuration: undefined,
        bestFor: locationForm.bestFor?.trim() || undefined,
        bestForEn: locationForm.bestForEn?.trim() || undefined,
        highlights: highlightsDraft.split(',').map(s => s.trim()).filter(Boolean),
        highlightsEn: highlightsEnDraft.split(',').map(s => s.trim()).filter(Boolean),
        lat: locationForm.lat || undefined,
        lng: locationForm.lng || undefined,
      };
      await onSaveLocation(normalized);
      showSuccess(`Đã lưu địa điểm ${normalized.fullName}.`);
      setLocationForm(EMPTY_LOCATION);
      setHighlightsDraft('');
      setHighlightsEnDraft('');
      setLocationModalOpen(false);
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleRouteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!routeForm.from || !routeForm.to || routeForm.from === routeForm.to) return;

    setSaving(true);
    setStatus(null);
    try {
      const route: Route = {
        ...routeForm,
        id: buildRouteId(routeForm.from, routeForm.to),
      };
      await onSaveRoute(route);
      showSuccess(`Đã lưu cạnh ${route.from} - ${route.to}.`);
      setRouteForm(EMPTY_ROUTE);
      setRouteModalOpen(false);
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const openNewLocationModal = () => {
    setLocationForm(EMPTY_LOCATION);
    setHighlightsDraft('');
    setHighlightsEnDraft('');
    setLocationPreviewOpen(false);
    setLocationModalOpen(true);
  };

  const openEditLocationModal = (location: TouristLocation) => {
    setLocationForm({
      ...location,
      fullNameEn: location.fullNameEn ?? '',
      descriptionEn: location.descriptionEn ?? '',
      shortIntro: location.shortIntro ?? '',
      shortIntroEn: location.shortIntroEn ?? '',
      imageUrl: undefined,
      images: location.images ?? (location.imageUrl ? [location.imageUrl] : []),
      googleMapsUrl: location.googleMapsUrl ?? '',
      neighborhood: location.neighborhood ?? '',
      neighborhoodEn: location.neighborhoodEn ?? '',
      bestFor: location.bestFor ?? '',
      bestForEn: location.bestForEn ?? '',
      highlights: location.highlights ?? [],
      highlightsEn: location.highlightsEn ?? [],
    });
    setHighlightsDraft((location.highlights ?? []).join(', '));
    setHighlightsEnDraft((location.highlightsEn ?? []).join(', '));
    setLocationPreviewOpen(false);
    setLocationModalOpen(true);
  };

  const openNewRouteModal = () => {
    setRouteForm(EMPTY_ROUTE);
    setRouteModalOpen(true);
  };

  const openEditRouteModal = (route: Route) => {
    setRouteForm(route);
    setRouteModalOpen(true);
  };

  const handleCanvasAddRoute = async (from: string, to: string, distanceKm: number) => {
    const id = buildRouteId(from, to);
    setSaving(true);
    try {
      await onSaveRoute({ id, from, to, distanceKm });
      setSelectedElement({ type: 'route', id });
      showSuccess(`Đã thêm cạnh ${from} – ${to} (${distanceKm.toFixed(1)} km).`);
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  // Instant visual update — persisted after a short idle delay to keep dragging smooth.
  // Wrapped in useCallback so GraphCanvas gets a stable prop reference and doesn't
  // recreate handleNodeMouseDown (which has onLocationDrag in its deps) mid-drag.
  const handleCanvasMoveLocation = useCallback((id: string, x: number, y: number, geo?: { lat: number; lng: number }) => {
    setLocalPositions(prev => ({
      ...prev,
      [id]: {
        x,
        y,
        lat: geo?.lat ?? prev[id]?.lat,
        lng: geo?.lng ?? prev[id]?.lng,
        source: geo ? 'map' : 'graph',
      },
    }));
  }, []);

  const persistDraggedLocationOrder = useCallback(async (draggedId: string, targetId: string, position: 'before' | 'after') => {
    if (draggedId === targetId) return;

    const nextLocations = [...orderedLocations];
    const draggedIndex = nextLocations.findIndex(location => location.id === draggedId);
    const targetIndex = nextLocations.findIndex(location => location.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const [movedLocation] = nextLocations.splice(draggedIndex, 1);
    const adjustedTargetIndex = nextLocations.findIndex(location => location.id === targetId);
    const insertIndex = position === 'before' ? adjustedTargetIndex : adjustedTargetIndex + 1;
    nextLocations.splice(insertIndex, 0, movedLocation);

    setSaving(true);
    setStatus(null);
    try {
      await onSaveLocationOrder(nextLocations.map(location => location.id));
      showSuccess(`Đã cập nhật thứ tự hiển thị của ${movedLocation.fullName}.`);
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
      setDraggedLocationId(null);
      setDragOverLocation(null);
    }
  }, [onSaveLocationOrder, orderedLocations]);

  const handleLocationDragStart = useCallback((event: React.DragEvent<HTMLButtonElement>, locationId: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', locationId);
    setDraggedLocationId(locationId);
  }, []);

  const handleLocationDragOver = useCallback((event: React.DragEvent<HTMLDivElement>, locationId: string) => {
    if (!draggedLocationId || draggedLocationId === locationId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    setDragOverLocation(current => (
      current?.id === locationId && current.position === position
        ? current
        : { id: locationId, position }
    ));
  }, [draggedLocationId]);

  const handleLocationDrop = useCallback((event: React.DragEvent<HTMLDivElement>, locationId: string) => {
    event.preventDefault();
    const draggedId = event.dataTransfer.getData('text/plain') || draggedLocationId;
    if (!draggedId || draggedId === locationId) {
      setDraggedLocationId(null);
      setDragOverLocation(null);
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
    void persistDraggedLocationOrder(draggedId, locationId, position);
  }, [draggedLocationId, persistDraggedLocationOrder]);

  const handleLocationDragEnd = useCallback(() => {
    setDraggedLocationId(null);
    setDragOverLocation(null);
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Admin panel</div>
        <h2 className="mt-2 text-3xl font-black text-slate-900">Quản trị dữ liệu cẩm nang</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Tập trung vào các nội dung cần thiết: tên điểm, mô tả, hình ảnh, Google Maps và trọng số các cạnh của đồ thị.
          Vị trí trên sơ đồ sẽ được đặt sau ở bảng trực quan, không nhập tay tại đây.
        </p>
        {status && (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
              statusTone === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {status}
          </div>
        )}

        {onSeedInitialData && graphData.locations.length === 0 && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="text-sm font-bold text-amber-800">Chưa có dữ liệu nào trong hệ thống</div>
            <p className="mt-1 text-sm text-amber-700">
              Bấm nút bên dưới để nạp toàn bộ dữ liệu mẫu gồm 10 địa điểm, 23 cung đường và 3 preset vào Supabase một lần.
            </p>
            <button
              type="button"
              disabled={seeding}
              onClick={async () => {
                setSeeding(true);
                setStatus(null);
                try {
                  await onSeedInitialData();
                  showSuccess('Đã nạp xong dữ liệu mẫu lên Supabase. Trang cẩm nang đã sẵn sàng để dùng.');
                } catch (error) {
                  showError(error);
                } finally {
                  setSeeding(false);
                }
              }}
              className="mt-3 rounded-full bg-amber-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {seeding ? 'Đang nạp dữ liệu...' : 'Nạp dữ liệu mẫu vào hệ thống'}
            </button>
          </div>
        )}
      </div>

      {/* Visual graph editor */}
      {graphData.locations.length > 0 && (
        <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-black text-slate-900">Bản đồ tương tác</div>
              <div className="mt-1 text-sm text-slate-500">
                Kéo node trực tiếp trên nền bản đồ để cập nhật vị trí thật. Muốn thêm cạnh mới thì bấm vào một điểm rồi bấm điểm thứ hai. Nếu cần nhìn gọn như đồ thị, chỉ việc tắt nền map ngay trong lớp bản đồ.
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">
                  Đang hiện {visibleCanvasLocations.length}/{canvasLocations.length} điểm
                </span>
                {focusedLocation && (
                  <span className="rounded-full bg-emerald-100 px-3 py-1.5 font-semibold text-emerald-800">
                    Đang tập trung: {focusedLocation.fullName}
                  </span>
                )}
                {hiddenLocationIds.length > 0 && (
                  <>
                    <span className="rounded-full bg-amber-100 px-3 py-1.5 font-semibold text-amber-800">
                      Đang ẩn {hiddenLocationIds.length} điểm
                    </span>
                    <span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                      Ẩn kèm {hiddenRouteCount} cạnh liên quan
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {(hiddenLocationIds.length > 0 || focusedLocationId) && (
                <button
                  type="button"
                  onClick={showAllLocationsOnMap}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 px-4 py-2 text-sm font-bold text-amber-800 transition hover:bg-amber-50"
                >
                  Hiện lại tất cả
                </button>
              )}
              {hasPendingPositions && (
                <span className="text-xs text-amber-600 font-medium">
                  {savingPositions
                    ? 'Đang tự lưu vị trí...'
                    : `${Object.keys(localPositions).length} điểm chờ tự lưu`}
                </span>
              )}
              <button
                type="button"
                onClick={() => setIsFullscreenMap(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Expand className="h-4 w-4" /> Toàn màn hình
              </button>
              <button
                type="button"
                disabled={!hasPendingPositions || savingPositions}
                onClick={() => void handleSavePositions({ showSuccessMessage: true })}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#14342b] px-4 py-2 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {savingPositions ? 'Đang lưu…' : 'Lưu ngay'}
              </button>
            </div>
          </div>
          <div className="relative h-[520px] overflow-hidden rounded-2xl">
            <>
              <MapCanvas
                locations={visibleCanvasLocations}
                routes={visibleRoutes}
                appMode="cycle"
                uiMode="edit"
                startId=""
                endId={null}
                selectedSubset={[]}
                currentStep={null}
                highlightedPaths={[]}
                activePathIndex={0}
                selectedElement={selectedElement}
                onLocationClick={() => {}}
                onLocationDrag={handleCanvasMoveLocation}
                onCanvasDoubleClick={() => {}}
                onRouteClick={id => setSelectedElement({ type: 'route', id })}
                onSelectElement={setSelectedElement}
                edgeStart={edgeStart}
                onEdgeStartSet={setEdgeStart}
                onAddRoute={(from, to, km) => void handleCanvasAddRoute(from, to, km)}
              />
              <button
                type="button"
                onClick={() => setIsFullscreenMap(true)}
                className="absolute left-3 top-3 z-[600] inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/92 px-4 py-2 text-sm font-semibold text-slate-800 shadow-[0_14px_26px_rgba(15,23,42,0.14)] backdrop-blur hover:bg-white"
              >
                <Expand className="h-4 w-4" /> Xem toàn màn hình
              </button>
              {selectedLocation && (
                <AdminLocationQuickPanel
                  location={selectedLocation}
                  hiddenOnMap={hiddenLocationIdSet.has(selectedLocation.id)}
                  hasPendingPosition={selectedLocationHasPendingPosition}
                  onClose={() => setSelectedElement(null)}
                  onEdit={() => openEditLocationModal(selectedLocation)}
                  onToggleVisibility={() => toggleLocationVisibility(selectedLocation.id)}
                  onDelete={async () => {
                    setSaving(true);
                    setStatus(null);
                    try {
                      await onDeleteLocation(selectedLocation.id);
                      setSelectedElement(null);
                      showSuccess(`Đã xóa địa điểm ${selectedLocation.fullName}.`);
                    } catch (error) {
                      showError(error);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  onSavePositions={selectedLocationHasPendingPosition ? () => void handleSavePositions({ showSuccessMessage: true }) : undefined}
                  saving={saving || savingPositions}
                />
              )}
              {selectedRoute && (
                <AdminRouteQuickPanel
                  route={selectedRoute}
                  routeWeight={routeWeights[selectedRoute.id] ?? selectedRoute.distanceKm}
                  onClose={() => setSelectedElement(null)}
                  onWeightChange={value => setRouteWeights(current => ({
                    ...current,
                    [selectedRoute.id]: value,
                  }))}
                  onQuickSave={async () => {
                    setSaving(true);
                    setStatus(null);
                    try {
                      await onSaveRoute({
                        ...selectedRoute,
                        distanceKm: routeWeights[selectedRoute.id] ?? selectedRoute.distanceKm,
                      });
                      showSuccess(`Đã cập nhật trọng số cạnh ${selectedRoute.from} - ${selectedRoute.to}.`);
                    } catch (error) {
                      showError(error);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  onOpenForm={() => openEditRouteModal(selectedRoute)}
                  onDelete={async () => {
                    setSaving(true);
                    setStatus(null);
                    try {
                      await onDeleteRoute(selectedRoute.id);
                      setSelectedElement(null);
                      showSuccess(`Đã xóa cạnh ${selectedRoute.from} - ${selectedRoute.to}.`);
                    } catch (error) {
                      showError(error);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  saving={saving}
                />
              )}
            </>
          </div>
        </div>
      )}

      {isFullscreenMap && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#e8e1d4]">
          <div className="flex h-full flex-col p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Admin Map Studio</div>
                <div className="text-lg font-bold text-slate-900">Căn chỉnh vị trí địa điểm toàn màn hình</div>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreenMap(false)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" /> Đóng
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl">
              <MapCanvas
                locations={visibleCanvasLocations}
                routes={visibleRoutes}
                appMode="cycle"
                uiMode="edit"
                startId=""
                endId={null}
                selectedSubset={[]}
                currentStep={null}
                highlightedPaths={[]}
                activePathIndex={0}
                selectedElement={selectedElement}
                onLocationClick={() => {}}
                onLocationDrag={handleCanvasMoveLocation}
                onCanvasDoubleClick={() => {}}
                onRouteClick={id => setSelectedElement({ type: 'route', id })}
                onSelectElement={setSelectedElement}
                edgeStart={edgeStart}
                onEdgeStartSet={setEdgeStart}
                onAddRoute={(from, to, km) => void handleCanvasAddRoute(from, to, km)}
              />
              {selectedLocation && (
                <AdminLocationQuickPanel
                  className="absolute bottom-10 left-10 z-[610]"
                  location={selectedLocation}
                  hiddenOnMap={hiddenLocationIdSet.has(selectedLocation.id)}
                  hasPendingPosition={selectedLocationHasPendingPosition}
                  onClose={() => setSelectedElement(null)}
                  onEdit={() => openEditLocationModal(selectedLocation)}
                  onToggleVisibility={() => toggleLocationVisibility(selectedLocation.id)}
                  onDelete={async () => {
                    setSaving(true);
                    setStatus(null);
                    try {
                      await onDeleteLocation(selectedLocation.id);
                      setSelectedElement(null);
                      showSuccess(`Đã xóa địa điểm ${selectedLocation.fullName}.`);
                    } catch (error) {
                      showError(error);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  onSavePositions={selectedLocationHasPendingPosition ? () => void handleSavePositions({ showSuccessMessage: true }) : undefined}
                  saving={saving || savingPositions}
                />
              )}
              {selectedRoute && (
                <AdminRouteQuickPanel
                  className="absolute bottom-10 right-10 z-[610]"
                  route={selectedRoute}
                  routeWeight={routeWeights[selectedRoute.id] ?? selectedRoute.distanceKm}
                  onClose={() => setSelectedElement(null)}
                  onWeightChange={value => setRouteWeights(current => ({
                    ...current,
                    [selectedRoute.id]: value,
                  }))}
                  onQuickSave={async () => {
                    setSaving(true);
                    setStatus(null);
                    try {
                      await onSaveRoute({
                        ...selectedRoute,
                        distanceKm: routeWeights[selectedRoute.id] ?? selectedRoute.distanceKm,
                      });
                      showSuccess(`Đã cập nhật trọng số cạnh ${selectedRoute.from} - ${selectedRoute.to}.`);
                    } catch (error) {
                      showError(error);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  onOpenForm={() => openEditRouteModal(selectedRoute)}
                  onDelete={async () => {
                    setSaving(true);
                    setStatus(null);
                    try {
                      await onDeleteRoute(selectedRoute.id);
                      setSelectedElement(null);
                      showSuccess(`Đã xóa cạnh ${selectedRoute.from} - ${selectedRoute.to}.`);
                    } catch (error) {
                      showError(error);
                    } finally {
                      setSaving(false);
                    }
                  }}
                  saving={saving}
                />
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-black text-slate-900">Danh sách địa điểm</div>
              <div className="mt-1 text-sm text-slate-500">Kéo tay nắm ở đầu mỗi dòng để đổi thứ tự. Bấm vào thẻ địa điểm để map chỉ hiện riêng điểm đó, giống cách chọn tập điểm ở admin/algorithms.</div>
            </div>
            <button
              type="button"
              onClick={openNewLocationModal}
              className="inline-flex items-center gap-2 rounded-full bg-[#14342b] px-4 py-2 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Thêm địa điểm
            </button>
          </div>
          <div className="max-h-[820px] space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-12rem)]">
            {orderedLocations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
                Chưa có địa điểm nào trong hệ thống. Thầy có thể bấm <strong>Thêm địa điểm</strong> để nhập mới, hoặc dùng nút
                <strong> Nạp dữ liệu mẫu vào hệ thống</strong> ở phía trên.
              </div>
            ) : (
              orderedLocations.map((location, index) => (
                <div
                  key={location.id}
                  onDragOver={handleLocationDragOver ? event => handleLocationDragOver(event, location.id) : undefined}
                  onDrop={event => handleLocationDrop(event, location.id)}
                  onDragLeave={() => {
                    if (dragOverLocation?.id === location.id) {
                      setDragOverLocation(null);
                    }
                  }}
                  className={`rounded-2xl border px-4 py-4 transition ${draggedLocationId === location.id ? 'border-dashed border-emerald-300 bg-emerald-50/50 opacity-70' : 'border-slate-100'} ${dragOverLocation?.id === location.id ? 'border-emerald-300 bg-emerald-50/40' : ''} ${focusedLocationId === location.id ? 'border-emerald-300 bg-emerald-50/70 shadow-[0_12px_28px_rgba(16,43,36,0.08)]' : ''}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <button
                        type="button"
                        draggable={!saving}
                        title={`Kéo để đổi vị trí của ${location.fullName}`}
                        aria-label={`Kéo để đổi vị trí của ${location.fullName}`}
                        onDragStart={event => handleLocationDragStart(event, location.id)}
                        onDragEnd={handleLocationDragEnd}
                        className="mt-0.5 inline-flex h-9 w-9 shrink-0 cursor-grab items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                        disabled={saving}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => focusLocationOnMap(location.id)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            focusLocationOnMap(location.id);
                          }
                        }}
                        className="min-w-0 text-left"
                        title={`Hiện riêng ${location.fullName} trên bản đồ`}
                      >
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-[11px] font-black text-slate-600">
                          {index + 1}
                        </span>
                        <span>{location.fullName}</span>
                        {focusedLocationId === location.id && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-800">
                            Đang hiện
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {location.id} • {location.category} • ({location.x}, {location.y})
                        {typeof location.lat === 'number' && typeof location.lng === 'number'
                          ? ` • ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
                          : ''}
                      </div>
                      {dragOverLocation?.id === location.id && draggedLocationId !== location.id && (
                        <div className="mt-2 text-[11px] font-semibold text-emerald-700">
                          {dragOverLocation.position === 'before' ? 'Thả vào trước địa điểm này' : 'Thả vào sau địa điểm này'}
                        </div>
                      )}
                      {focusedLocationId === location.id && (
                        <div className="mt-2 text-[11px] font-semibold text-emerald-700">
                          Map đang chỉ hiện riêng điểm này. Bấm lại để thoát chế độ tập trung.
                        </div>
                      )}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                        {location.googleMapsUrl && (
                          <a href={location.googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Mở Google Maps
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => toggleLocationVisibility(location.id)}
                          className={`rounded-full px-3 py-1 ${hiddenLocationIdSet.has(location.id) ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                          {hiddenLocationIdSet.has(location.id) ? 'Hiện lại trên bản đồ' : 'Ẩn trên bản đồ'}
                        </button>
                        {hiddenLocationIdSet.has(location.id) && (
                          <span className="text-amber-700">Các cạnh nối với điểm này cũng đang bị ẩn trên map.</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" onClick={() => openEditLocationModal(location)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                        <span className="inline-flex items-center gap-1"><PencilLine className="h-3.5 w-3.5" /> Sửa</span>
                      </button>
                      <button type="button" onClick={() => void onDeleteLocation(location.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">
                        <span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-black text-slate-900">Danh sách cạnh / cung đường</div>
                <div className="mt-1 text-sm text-slate-500">Đây là phần thầy dùng để thiết lập trọng số của đồ thị.</div>
              </div>
              <button
                type="button"
                onClick={openNewRouteModal}
                className="inline-flex items-center gap-2 rounded-full bg-[#133654] px-4 py-2 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Thêm cạnh
              </button>
            </div>

            <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
              {graphData.routes.map(route => (
                <div key={route.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{route.from} → {route.to}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      Trọng số: {route.distanceKm.toFixed(1)} • {route.id}
                      {(hiddenLocationIdSet.has(route.from) || hiddenLocationIdSet.has(route.to)) ? ' • Đang ẩn trên map' : ''}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEditRouteModal(route)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                      <span className="inline-flex items-center gap-1"><PencilLine className="h-3.5 w-3.5" /> Sửa</span>
                    </button>
                    <button type="button" onClick={() => void onDeleteRoute(route.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">
                      <span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Xóa</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6">
            <div className="mb-4 text-xl font-black text-slate-900">Thiết lập nhanh trọng số tất cả cạnh</div>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              Sửa trực tiếp trọng số rồi bấm <code>Lưu</code> ở từng dòng. Đây là phần cốt lõi để thiết lập đồ thị cho 3 bài toán.
            </div>
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {graphData.routes.map(route => (
                <div key={route.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{route.from} → {route.to}</div>
                    <div className="mt-1 text-xs text-slate-500">Mã cạnh: {route.id}</div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={routeWeights[route.id] ?? route.distanceKm}
                    onChange={event => setRouteWeights(current => ({
                      ...current,
                      [route.id]: Number(event.target.value),
                    }))}
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      setSaving(true);
                      setStatus(null);
                      try {
                        await onSaveRoute({
                          ...route,
                          distanceKm: routeWeights[route.id] ?? route.distanceKm,
                        });
                        showSuccess(`Đã cập nhật trọng số cạnh ${route.from} - ${route.to}.`);
                      } catch (error) {
                        showError(error);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    Lưu
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6">
            <div className="mb-4 text-xl font-black text-slate-900">Preset cho từng chế độ</div>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              Chọn nhanh bộ điểm mẫu cho từng bài toán. Với <code>Chu trình Hamilton</code> và <code>Đường đi Hamilton</code> nên giữ đúng 5 điểm.
            </div>
            <div className="space-y-4">
              {(Object.keys(MODE_LABELS) as AppMode[]).map(mode => (
                <PresetEditor
                  key={mode}
                  mode={mode}
                  label={MODE_LABELS[mode]}
                  preset={presets[mode]}
                  locations={graphData.locations}
                  onSave={preset => onSavePreset(mode, preset)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {locationModalOpen && (
        <ModalShell title={locationForm.id ? `Sửa địa điểm ${locationForm.id}` : 'Thêm địa điểm mới'} onClose={() => setLocationModalOpen(false)}>
          <form onSubmit={handleLocationSubmit} className="space-y-5">
            <div className="grid gap-6 xl:grid-cols-[400px_minmax(0,1fr)]">
              <div className="space-y-4 xl:sticky xl:top-0 self-start">
                <div className="rounded-[28px] border border-[#ded5c7] bg-[#f8f3eb] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Xem mở rộng</div>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    Cột trái là preview đúng giao diện trang chính. Bấm vào card hoặc nút bên dưới để mở thử modal chi tiết ngay trong lúc nhập.
                  </div>
                </div>

                <div className="rounded-[28px] border border-[#ded5c7] bg-[#f8f3eb] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Card location</div>
                  <div className="mt-4">
                    <LocationCard
                      location={locationPreviewDraft}
                      selectionIndex={null}
                      isStart={false}
                      isEnd={false}
                      isDisabled={false}
                      onOpen={() => setLocationPreviewOpen(true)}
                      onToggle={() => {}}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setLocationPreviewOpen(true)}
                    className="mt-4 w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white"
                  >
                    Mở thử modal chi tiết
                  </button>
                </div>

                <div className="rounded-[24px] border border-slate-200 bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Mapping dữ liệu</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <div><strong>Tên đầy đủ</strong>: tiêu đề lớn trên card và modal.</div>
                    <div><strong>Mô tả ngắn</strong>: phần tóm tắt trên card.</div>
                    <div><strong>Mô tả đầy đủ</strong>: nội dung chính trong modal chi tiết.</div>
                    <div><strong>Điểm nhấn</strong>: các badge ngắn gọn.</div>
                    <div><strong>Google Maps</strong>: nút mở bản đồ.</div>
                    <div><strong>Ảnh</strong>: ảnh card và bộ ảnh trong modal.</div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                    Thông tin địa danh
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Mã địa điểm" hint="Dùng cho quản trị và preset.">
                      <input value={locationForm.id} placeholder="Ví dụ: DS" onChange={event => setLocationForm(current => ({ ...current, id: event.target.value }))} className="field-input" />
                    </Field>
                    <Field label="Nhãn node" hint="Badge ngắn trên card ảnh.">
                      <input value={locationForm.label} placeholder="Ví dụ: Nhà\\nThờ" onChange={event => setLocationForm(current => ({ ...current, label: event.target.value }))} className="field-input" />
                    </Field>
                    <Field label="Tên đầy đủ (VI)" hint="Tiêu đề lớn trên card và modal.">
                      <input value={locationForm.fullName} placeholder="Ví dụ: Nhà Thờ Đức Bà" onChange={event => setLocationForm(current => ({ ...current, fullName: event.target.value }))} className="field-input" />
                    </Field>
                    <Field label="Tên đầy đủ (EN)" hint="Bản tiếng Anh của tiêu đề lớn.">
                      <input value={locationForm.fullNameEn ?? ''} placeholder="Example: Notre-Dame Cathedral" onChange={event => setLocationForm(current => ({ ...current, fullNameEn: event.target.value }))} className="field-input" />
                    </Field>
                    <Field label="Danh mục" hint="Ảnh hưởng màu và phong cách card.">
                      <select value={locationForm.category} onChange={event => setLocationForm(current => ({ ...current, category: event.target.value as TouristLocation['category'] }))} className="field-input">
                        {CATEGORY_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </Field>
                    <Field label="Google Maps" hint="Nút Maps trên trang chính và trong modal.">
                      <input value={locationForm.googleMapsUrl ?? ''} placeholder="https://maps.app.goo.gl/..." onChange={event => setLocationForm(current => ({ ...current, googleMapsUrl: event.target.value }))} className="field-input" />
                    </Field>
                    <Field label="Khu vực (VI)" hint="Badge khu vực ở card và dòng vị trí trong modal.">
                      <input value={locationForm.neighborhood ?? ''} placeholder="Ví dụ: Công xã Paris, Quận 1" onChange={event => setLocationForm(current => ({ ...current, neighborhood: event.target.value }))} className="field-input" />
                    </Field>
                    <Field label="Khu vực (EN)" hint="Bản tiếng Anh của badge khu vực.">
                      <input value={locationForm.neighborhoodEn ?? ''} placeholder="Example: Paris Commune Square, District 1" onChange={event => setLocationForm(current => ({ ...current, neighborhoodEn: event.target.value }))} className="field-input" />
                    </Field>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  Cột phải là phần chỉnh sửa. Cột trái là phần xem trước đúng giao diện thật, nên thầy có thể vừa nhập vừa kiểm tra ngay card và modal trên trang chính sẽ trông như thế nào.
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2 space-y-2">
                    <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ảnh địa điểm (carousel — ảnh đầu tiên là ảnh chính)</div>
                    {(locationForm.images ?? []).map((url, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            value={url}
                            placeholder={`Ảnh ${i + 1}: https://...`}
                            onChange={e => setLocationForm(curr => {
                              const imgs = [...(curr.images ?? [])];
                              imgs[i] = e.target.value;
                              return { ...curr, images: imgs };
                            })}
                            className="field-input flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => setLocationForm(curr => ({ ...curr, images: (curr.images ?? []).filter((_, j) => j !== i) }))}
                            className="shrink-0 rounded-full px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                          >
                            Xóa
                          </button>
                        </div>
                        {url && (
                          <img src={url} alt={`preview-${i}`} className="max-h-40 w-full rounded-xl border border-slate-200 object-cover" />
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setLocationForm(curr => ({ ...curr, images: [...(curr.images ?? []), ''] }))}
                      className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      + Thêm ảnh
                    </button>
                  </div>

                  <Field label="Vĩ độ (lat)">
                    <input type="number" step="any" value={locationForm.lat ?? ''} placeholder="Ví dụ: 10.7769" onChange={e => setLocationForm(curr => ({ ...curr, lat: e.target.value ? parseFloat(e.target.value) : undefined }))} className="field-input" />
                  </Field>
                  <Field label="Kinh độ (lng)">
                    <input type="number" step="any" value={locationForm.lng ?? ''} placeholder="Ví dụ: 106.6951" onChange={e => setLocationForm(curr => ({ ...curr, lng: e.target.value ? parseFloat(e.target.value) : undefined }))} className="field-input" />
                  </Field>
                  <Field label="Mô tả ngắn (VI)" hint="Dòng mô tả ngắn trên card trang chính." full>
                    <textarea value={locationForm.shortIntro ?? ''} placeholder="Ví dụ: Điểm mang tính biểu tượng, hợp cho khách lần đầu đến trung tâm thành phố." onChange={event => setLocationForm(current => ({ ...current, shortIntro: event.target.value }))} rows={2} className="field-input min-h-[92px]" />
                  </Field>
                  <Field label="Mô tả ngắn (EN)" hint="Bản tiếng Anh của mô tả ngắn trên card." full>
                    <textarea value={locationForm.shortIntroEn ?? ''} placeholder="Example: An iconic stop that works well for first-time visitors." onChange={event => setLocationForm(current => ({ ...current, shortIntroEn: event.target.value }))} rows={2} className="field-input min-h-[92px]" />
                  </Field>
                  <Field label="Mô tả đầy đủ (VI)" hint="Nội dung chính trong modal khi bấm card." full>
                    <textarea value={locationForm.description} placeholder="Ví dụ: Điểm ghé nổi bật để chụp ảnh, ngắm kiến trúc và nối tiếp hành trình quanh trường." onChange={event => setLocationForm(current => ({ ...current, description: event.target.value }))} rows={3} className="field-input min-h-[110px]" />
                  </Field>
                  <Field label="Mô tả đầy đủ (EN)" hint="Bản tiếng Anh của nội dung modal." full>
                    <textarea value={locationForm.descriptionEn ?? ''} placeholder="Example: A standout stop for photos, architecture and continuing the school-area journey." onChange={event => setLocationForm(current => ({ ...current, descriptionEn: event.target.value }))} rows={3} className="field-input min-h-[110px]" />
                  </Field>
                  <Field label="Phù hợp cho (VI)" hint="Dùng trong modal chi tiết.">
                    <input value={locationForm.bestFor ?? ''} placeholder="Ví dụ: Chụp ảnh, kiến trúc, khách lần đầu đến Sài Gòn" onChange={event => setLocationForm(current => ({ ...current, bestFor: event.target.value }))} className="field-input" />
                  </Field>
                  <Field label="Phù hợp cho (EN)" hint="Bản tiếng Anh dùng trong modal.">
                    <input value={locationForm.bestForEn ?? ''} placeholder="Example: Photography, architecture, first-time Saigon visitors" onChange={event => setLocationForm(current => ({ ...current, bestForEn: event.target.value }))} className="field-input" />
                  </Field>
                  <Field label="Điểm nhấn (VI, cách nhau bằng dấu phẩy)" hint="Tạo badge ngắn trên card và modal." full>
                    <input value={highlightsDraft} placeholder="Ví dụ: Mặt tiền biểu tượng, Cụm du lịch trung tâm, Dễ nối sang Bưu điện" onChange={event => setHighlightsDraft(event.target.value)} className="field-input" />
                  </Field>
                  <Field label="Điểm nhấn (EN, cách nhau bằng dấu phẩy)" hint="Bản tiếng Anh của nhóm badge." full>
                    <input value={highlightsEnDraft} placeholder="Example: Iconic facade, Central tourist cluster, Easy connection to Post Office" onChange={event => setHighlightsEnDraft(event.target.value)} className="field-input" />
                  </Field>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setLocationModalOpen(false)} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
                Hủy
              </button>
              <button type="submit" disabled={saving} className="rounded-full bg-[#14342b] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {locationForm.id ? 'Lưu địa điểm' : 'Thêm địa điểm'}
              </button>
            </div>
          </form>
          <LocationDetailModal
            location={locationPreviewDraft}
            isOpen={locationPreviewOpen}
            isSelected={false}
            isStart={false}
            isEnd={false}
            isDisabled={false}
            onClose={() => setLocationPreviewOpen(false)}
            onToggle={() => {}}
          />
        </ModalShell>
      )}

      {routeModalOpen && (
        <ModalShell title={routeForm.id ? `Sửa cạnh ${routeForm.id}` : 'Thêm cạnh mới'} onClose={() => setRouteModalOpen(false)}>
          <form onSubmit={handleRouteSubmit} className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              Trường cần nhập cho cạnh chỉ gồm: <strong>điểm đi</strong>, <strong>điểm đến</strong> và <strong>trọng số</strong>.
              Hệ thống tự tạo mã cạnh.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Điểm đi">
                <select value={routeForm.from} onChange={event => setRouteForm(current => ({ ...current, from: event.target.value }))} className="field-input">
                  <option value="">Chọn điểm đi</option>
                  {graphData.locations.map(location => <option key={location.id} value={location.id}>{location.fullName}</option>)}
                </select>
              </Field>
              <Field label="Điểm đến">
                <select value={routeForm.to} onChange={event => setRouteForm(current => ({ ...current, to: event.target.value }))} className="field-input">
                  <option value="">Chọn điểm đến</option>
                  {graphData.locations.map(location => <option key={location.id} value={location.id}>{location.fullName}</option>)}
                </select>
              </Field>
              <Field label="Trọng số cạnh" full>
                <input type="number" min="0" step="0.1" value={routeForm.distanceKm} onChange={event => setRouteForm(current => ({ ...current, distanceKm: Number(event.target.value) }))} className="field-input" />
              </Field>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setRouteModalOpen(false)} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
                Hủy
              </button>
              <button type="submit" disabled={saving} className="rounded-full bg-[#133654] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {routeForm.id ? 'Lưu cạnh' : 'Thêm cạnh'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </section>
  );
}

function PresetEditor({
  mode,
  label,
  preset,
  locations,
  onSave,
}: {
  mode: AppMode;
  label: string;
  preset: PresetSelection;
  locations: TouristLocation[];
  onSave: (preset: Pick<PresetSelection, 'ids' | 'startId' | 'endId'>) => Promise<void>;
}) {
  const allLocationIds = useMemo(() => locations.map(location => location.id), [locations]);
  const [draft, setDraft] = useState<string[]>(preset.ids);
  const [startId, setStartId] = useState<string | null>(preset.startId ?? preset.ids[0] ?? null);
  const [endId, setEndId] = useState<string | null>(preset.endId ?? null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    const validIds = preset.ids.filter(id => allLocationIds.includes(id));
    setDraft(validIds);
    const nextStartId = preset.startId && validIds.includes(preset.startId)
      ? preset.startId
      : validIds[0] ?? null;
    setStartId(nextStartId);
    setEndId(
      mode === 'cycle'
        ? null
        : preset.endId && validIds.includes(preset.endId) && preset.endId !== nextStartId
          ? preset.endId
          : validIds.find(id => id !== nextStartId) ?? null,
    );
  }, [allLocationIds, mode, preset]);

  React.useEffect(() => {
    if (draft.length === 0) {
      setStartId(null);
      setEndId(null);
      return;
    }

    if (!startId || !draft.includes(startId)) {
      setStartId(draft[0]);
      return;
    }

    if (mode === 'cycle') {
      if (endId !== null) {
        setEndId(null);
      }
      return;
    }

    if (!endId || !draft.includes(endId) || endId === startId) {
      setEndId(draft.find(id => id !== startId) ?? null);
    }
  }, [draft, endId, mode, startId]);

  const toggle = (id: string) => {
    setDraft(current => {
      if (current.includes(id)) {
        return current.filter(item => item !== id);
      }
      const limit = mode === 'subset' ? allLocationIds.length : 5;
      if (current.length >= limit) return current;
      return [...current, id];
    });
  };

  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="text-sm font-bold text-slate-900">{label}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {allLocationIds.map(id => (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              draft.includes(id) ? 'bg-[#14342b] text-white' : 'border border-slate-200 text-slate-700'
            }`}
          >
            {id}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="Điểm đầu mặc định">
          <select value={startId ?? ''} onChange={event => setStartId(event.target.value || null)} className="field-input" title="Điểm đầu mặc định">
            <option value="">Chọn điểm đầu</option>
            {draft.map(id => {
              const location = locations.find(item => item.id === id);
              return <option key={id} value={id}>{location?.fullName ?? id}</option>;
            })}
          </select>
        </Field>
        {mode !== 'cycle' ? (
          <Field label="Điểm cuối mặc định">
            <select value={endId ?? ''} onChange={event => setEndId(event.target.value || null)} className="field-input" title="Điểm cuối mặc định">
              <option value="">Chọn điểm cuối</option>
              {draft.filter(id => id !== startId).map(id => {
                const location = locations.find(item => item.id === id);
                return <option key={id} value={id}>{location?.fullName ?? id}</option>;
              })}
            </select>
          </Field>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">
            Bài 1 chỉ cần điểm xuất phát mặc định để mô tả chu trình mẫu.
          </div>
        )}
      </div>
      <div className="mt-3 text-xs text-slate-500">
        Đã chọn {draft.length} điểm. {mode === 'subset' ? 'Bài 3 có thể chọn tùy ý trong toàn bộ danh sách địa điểm hiện có.' : 'Nên giữ đúng 5 điểm.'}
      </div>
      <button
        type="button"
        disabled={saving || draft.length < (mode === 'subset' ? 2 : 5) || !startId || (mode !== 'cycle' && (!endId || endId === startId))}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave({ ids: draft, startId, endId: mode === 'cycle' ? null : endId });
          } finally {
            setSaving(false);
          }
        }}
        className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
      >
        Lưu preset {mode}
      </button>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[10020] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-7xl overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="text-xl font-black text-slate-900">{title}</div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Field({
  label,
  hint,
  children,
  full = false,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      {hint && <div className="mb-2 text-xs leading-5 text-slate-500">{hint}</div>}
      {children}
    </label>
  );
}

function AdminLocationQuickPanel({
  location,
  hiddenOnMap,
  hasPendingPosition,
  onClose,
  onEdit,
  onToggleVisibility,
  onDelete,
  onSavePositions,
  saving,
  className = 'absolute bottom-3 right-3 z-[610]',
}: {
  location: TouristLocation;
  hiddenOnMap: boolean;
  hasPendingPosition: boolean;
  onClose: () => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => Promise<void>;
  onSavePositions?: () => void;
  saving: boolean;
  className?: string;
}) {
  return (
    <div className={`${className} w-[22rem] rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_20px_38px_rgba(15,23,42,0.16)] backdrop-blur`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Địa điểm đang chọn</div>
          <div className="mt-1 text-base font-black text-slate-900">{location.fullName}</div>
          <div className="mt-1 text-xs text-slate-500">{location.id} • {location.category}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Đóng
        </button>
      </div>
      <div className="mt-4 space-y-2 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-700">
        <div>Canvas: ({Math.round(location.x)}, {Math.round(location.y)})</div>
        <div>
          Tọa độ: {typeof location.lat === 'number' && typeof location.lng === 'number'
            ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`
            : 'Chưa có tọa độ thật'}
        </div>
        {hasPendingPosition && (
          <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
            Điểm này có vị trí mới chưa lưu.
          </div>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full bg-[#14342b] px-4 py-2 text-sm font-bold text-white"
        >
          Sửa nội dung
        </button>
        {location.googleMapsUrl && (
          <a
            href={location.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Mở Maps
          </a>
        )}
        <button
          type="button"
          onClick={onToggleVisibility}
          className={`rounded-full px-4 py-2 text-sm font-bold ${hiddenOnMap ? 'border border-amber-200 text-amber-800 hover:bg-amber-50' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
        >
          {hiddenOnMap ? 'Hiện lại trên map' : 'Ẩn khỏi map'}
        </button>
        {onSavePositions && (
          <button
            type="button"
            disabled={saving}
            onClick={onSavePositions}
            className="rounded-full border border-amber-200 px-4 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50 disabled:opacity-60"
          >
            Lưu vị trí
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => void onDelete()}
          className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          Xóa điểm
        </button>
      </div>
    </div>
  );
}

function AdminRouteQuickPanel({
  route,
  routeWeight,
  onClose,
  onWeightChange,
  onQuickSave,
  onOpenForm,
  onDelete,
  saving,
  className = 'absolute bottom-3 right-3 z-[610]',
}: {
  route: Route;
  routeWeight: number;
  onClose: () => void;
  onWeightChange: (value: number) => void;
  onQuickSave: () => Promise<void>;
  onOpenForm: () => void;
  onDelete: () => Promise<void>;
  saving: boolean;
  className?: string;
}) {
  return (
    <div className={`${className} w-[22rem] rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_20px_38px_rgba(15,23,42,0.16)] backdrop-blur`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Cạnh đang chọn</div>
          <div className="mt-1 text-base font-black text-slate-900">{route.from} → {route.to}</div>
          <div className="mt-1 text-xs text-slate-500">{route.id}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          Đóng
        </button>
      </div>
      <div className="mt-4">
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Trọng số</div>
        <input
          type="number"
          min="0"
          step="0.1"
          title="Chỉnh trọng số cạnh đang chọn"
          placeholder="Ví dụ: 1.2"
          value={routeWeight}
          onChange={event => onWeightChange(Number(event.target.value))}
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900"
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => void onQuickSave()}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
        >
          Lưu nhanh
        </button>
        <button
          type="button"
          onClick={onOpenForm}
          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Mở form sửa
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void onDelete()}
          className="rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          Xóa cạnh
        </button>
      </div>
    </div>
  );
}
