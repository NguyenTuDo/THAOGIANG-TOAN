import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight, Expand, Hand, MapPinned, Play, RotateCcw, Route as RouteIcon, TimerReset, X } from 'lucide-react';
import { findShortestHamiltonianCycle } from '../algorithms/hamiltonianCycle';
import { findShortestHamiltonianPath } from '../algorithms/hamiltonianPath';
import { findShortestSubsetRoute } from '../algorithms/subsetRoute';
import { MapCanvas } from './MapCanvas';
import { PathDisplay } from './PathDisplay';
import { AlgorithmResult, AlgorithmStep, AppMode, GraphData, PresetSelectionMap, SelectedElement, TouristLocation } from '../types';

interface AdminAlgorithmWorkbenchProps {
  graphData: GraphData;
  presets: PresetSelectionMap;
}

const MODE_LABELS: Record<AppMode, string> = {
  cycle: 'Chu trình Hamilton',
  path: 'Đường đi Hamilton',
  subset: 'Lộ trình tùy chọn',
};

const PREVIEW_LIMITS: Record<AppMode, { min: number; max: number }> = {
  cycle: { min: 5, max: 5 },
  path: { min: 5, max: 5 },
  subset: { min: 2, max: 99 },
};

const PRESENTATION_HOLD_MS = 1800;

interface PresentationSegment {
  fromId: string;
  toId: string;
  distanceKm: number;
  durationMs: number;
  cumulativeStart: number;
  cumulativeEnd: number;
}

function getPresetSelection(presets: PresetSelectionMap, mode: AppMode) {
  return [...(presets[mode]?.ids ?? [])];
}

function uniqueIds(ids: string[]) {
  return ids.filter((id, index) => ids.indexOf(id) === index);
}

function normalizePolygonOrder(order: string[], fallbackOrder: string[], startId: string) {
  const allowed = new Set(fallbackOrder);
  const merged = [...order, ...fallbackOrder].filter((id, index, source) => allowed.has(id) && source.indexOf(id) === index);

  if (startId && merged.includes(startId)) {
    return [startId, ...merged.filter(id => id !== startId)];
  }

  return merged;
}

function movePolygonVertex(order: string[], locationId: string, direction: 'up' | 'down', startId: string) {
  if (locationId === startId) return order;

  const movable = order.filter(id => id !== startId);
  const currentIndex = movable.indexOf(locationId);
  if (currentIndex === -1) return order;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= movable.length) return order;

  const next = [...movable];
  [next[currentIndex], next[targetIndex]] = [next[targetIndex], next[currentIndex]];
  return startId && order.includes(startId) ? [startId, ...next] : next;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      {children}
    </label>
  );
}

export function AdminAlgorithmWorkbench({ graphData, presets }: AdminAlgorithmWorkbenchProps) {
  const [mode, setMode] = useState<AppMode>('cycle');
  const [displayLayoutMode, setDisplayLayoutMode] = useState<'geo' | 'polygon'>('polygon');
  const [polygonVertexOrders, setPolygonVertexOrders] = useState<Record<AppMode, string[]>>({ cycle: [], path: [], subset: [] });
  const [selectedIds, setSelectedIds] = useState<string[]>(() => getPresetSelection(presets, 'cycle'));
  const [startId, setStartId] = useState<string>(() => getPresetSelection(presets, 'cycle')[0] ?? '');
  const [endId, setEndId] = useState<string | null>(() => {
    const initial = getPresetSelection(presets, 'path');
    return initial.length > 1 ? initial[initial.length - 1] : null;
  });
  const [result, setResult] = useState<AlgorithmResult | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [presentationStatus, setPresentationStatus] = useState<'intro' | 'holding' | 'moving' | 'summary'>('intro');
  const [presentationStopIndex, setPresentationStopIndex] = useState(0);
  const [presentationVehicleProgress, setPresentationVehicleProgress] = useState(0);
  const [presentationMode, setPresentationMode] = useState<'auto' | 'manual'>('auto');
  const holdTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const limit = PREVIEW_LIMITS[mode];
  const canAddMore = selectedIds.length < Math.min(limit.max, graphData.locations.length);
  const availableLocations = useMemo(
    () => graphData.locations.filter(location => selectedIds.includes(location.id)),
    [graphData.locations, selectedIds],
  );
  const availableRoutes = useMemo(
    () => graphData.routes.filter(route => selectedIds.includes(route.from) && selectedIds.includes(route.to)),
    [graphData.routes, selectedIds],
  );
  const activePath = useMemo(() => {
    if (!result?.found) return [];
    return mode === 'path' ? result.shortestPath : (result.shortestCycles[0] ?? []);
  }, [mode, result]);
  const highlightedPaths = useMemo(
    () => (result?.found && activePath.length > 0 ? [activePath] : []),
    [activePath, result?.found],
  );
  const suggestedPolygonOrder = useMemo(() => {
    const primaryIds = activePath.length > 0 ? uniqueIds(activePath) : selectedIds;

    return [
      ...primaryIds,
      ...selectedIds.filter(id => !primaryIds.includes(id)),
    ];
  }, [activePath, selectedIds]);
  const displayLayoutOrder = useMemo(
    () => normalizePolygonOrder(polygonVertexOrders[mode] ?? [], suggestedPolygonOrder, startId),
    [mode, polygonVertexOrders, startId, suggestedPolygonOrder],
  );
  const orderedPolygonLocations = useMemo(
    () => displayLayoutOrder
      .map(id => availableLocations.find(location => location.id === id) ?? null)
      .filter((location): location is TouristLocation => location !== null),
    [availableLocations, displayLayoutOrder],
  );
  const updatePolygonOrder = useCallback((updater: (current: string[]) => string[]) => {
    setPolygonVertexOrders(current => ({
      ...current,
      [mode]: updater(normalizePolygonOrder(current[mode] ?? [], suggestedPolygonOrder, startId)),
    }));
  }, [mode, startId, suggestedPolygonOrder]);
  const displayRoutes = useMemo(() => {
    if (!result?.found || activePath.length < 2) return availableRoutes;

    return availableRoutes.filter(route => {
      for (let index = 0; index < activePath.length - 1; index += 1) {
        const fromId = activePath[index];
        const toId = activePath[index + 1];
        if (
          (route.from === fromId && route.to === toId) ||
          (route.from === toId && route.to === fromId)
        ) {
          return true;
        }
      }

      return false;
    });
  }, [activePath, availableRoutes, result?.found]);
  const getSegmentDistance = useCallback((fromId: string, toId: string) => {
    const route = graphData.routes.find(
      current => (current.from === fromId && current.to === toId) || (current.to === fromId && current.from === toId),
    );
    return route?.distanceKm ?? null;
  }, [graphData.routes]);
  const presentationSegments = useMemo<PresentationSegment[]>(() => {
    if (activePath.length < 2) return [];

    const segments = activePath.slice(0, -1).map((fromId, index) => {
      const toId = activePath[index + 1];
      const distanceKm = getSegmentDistance(fromId, toId) ?? 1;
      return {
        fromId,
        toId,
        distanceKm,
        durationMs: Math.max(1600, Math.min(3600, 1200 + distanceKm * 700)),
      };
    });

    const totalDistance = segments.reduce((sum, segment) => sum + segment.distanceKm, 0) || 1;
    let cumulative = 0;

    return segments.map(segment => {
      const ratio = segment.distanceKm / totalDistance;
      const nextSegment = {
        ...segment,
        cumulativeStart: cumulative,
        cumulativeEnd: cumulative + ratio,
      };
      cumulative += ratio;
      return nextSegment;
    });
  }, [activePath, getSegmentDistance]);
  const uniqueVisited = useMemo(
    () => (activePath.length > 1 && activePath[0] === activePath[activePath.length - 1] ? activePath.slice(0, -1) : activePath),
    [activePath],
  );
  const presentationFocusLocationId = useMemo(() => {
    if (activePath.length === 0) return null;
    if (presentationStatus === 'moving') {
      return presentationSegments[presentationStopIndex]?.toId ?? activePath[activePath.length - 1];
    }

    return activePath[Math.min(presentationStopIndex, activePath.length - 1)] ?? activePath[0];
  }, [activePath, presentationSegments, presentationStatus, presentationStopIndex]);
  const presentationLocation = useMemo(
    () => graphData.locations.find(location => location.id === presentationFocusLocationId) ?? null,
    [graphData.locations, presentationFocusLocationId],
  );
  const presentationDisplayIndex = useMemo(() => {
    if (activePath.length === 0) return 0;
    if (presentationStatus === 'moving') {
      return Math.min(presentationStopIndex + 2, activePath.length);
    }

    return Math.min(presentationStopIndex + 1, activePath.length);
  }, [activePath.length, presentationStatus, presentationStopIndex]);
  const presentationCurrentStep = useMemo<AlgorithmStep | null>(() => {
    if (!presentationFocusLocationId) return null;
    return {
      type: 'visit',
      currentNodeId: presentationFocusLocationId,
      path: activePath.slice(0, Math.max(1, Math.min(presentationStopIndex + 1, activePath.length))),
      totalWeight: result?.totalDistanceKm ?? 0,
      explanation: '',
      isBacktracking: false,
    };
  }, [activePath, presentationFocusLocationId, presentationStopIndex, result?.totalDistanceKm]);
  const currentPresentationSegment = useMemo(
    () => presentationSegments[Math.min(presentationStopIndex, Math.max(presentationSegments.length - 1, 0))] ?? null,
    [presentationSegments, presentationStopIndex],
  );

  const getLocationName = useCallback(
    (id: string) => graphData.locations.find(location => location.id === id)?.fullName ?? id,
    [graphData.locations],
  );

  useEffect(() => {
    const presetIds = getPresetSelection(presets, mode).filter(id => graphData.locations.some(location => location.id === id));
    setSelectedIds(presetIds);
    setStartId(presetIds[0] ?? '');
    setEndId(mode === 'path' && presetIds.length > 1 ? presetIds[presetIds.length - 1] : null);
    setResult(null);
  }, [graphData.locations, mode, presets]);

  useEffect(() => {
    setSelectedIds(current => current.filter(id => graphData.locations.some(location => location.id === id)));
  }, [graphData.locations]);

  useEffect(() => {
    if (selectedIds.length === 0) {
      setStartId('');
      setEndId(null);
      return;
    }

    if (!selectedIds.includes(startId)) {
      setStartId(selectedIds[0]);
    }

    if (mode === 'path') {
      const currentStart = selectedIds.includes(startId) ? startId : selectedIds[0];
      if (!endId || !selectedIds.includes(endId) || endId === currentStart) {
        setEndId(selectedIds.find(id => id !== currentStart) ?? null);
      }
    } else if (endId !== null) {
      setEndId(null);
    }
  }, [endId, mode, selectedIds, startId]);

  useEffect(() => {
    setResult(null);
  }, [graphData.locations, graphData.routes, mode, selectedIds, startId, endId]);

  const resetPresentationState = useCallback(() => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setPresentationStatus('intro');
    setPresentationStopIndex(0);
    setPresentationVehicleProgress(0);
  }, []);

  useEffect(() => () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
    if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
  }, []);

  useEffect(() => {
    resetPresentationState();
    setPresentationOpen(false);
  }, [activePath, mode, resetPresentationState]);

  useEffect(() => {
    if (!selectedElement) return;

    if (selectedElement.type === 'location' && !availableLocations.some(location => location.id === selectedElement.id)) {
      setSelectedElement(null);
      return;
    }

    if (selectedElement.type === 'route' && !displayRoutes.some(route => route.id === selectedElement.id)) {
      setSelectedElement(null);
    }
  }, [availableLocations, displayRoutes, selectedElement]);

  useEffect(() => {
    if (!presentationOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPresentationOpen(false);
        resetPresentationState();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [presentationOpen, resetPresentationState]);

  useEffect(() => {
    if (!presentationOpen) return;

    uniqueVisited.forEach(locationId => {
      const location = graphData.locations.find(item => item.id === locationId);
      const imageUrl = location?.images?.[0] ?? location?.imageUrl;
      if (!imageUrl) return;

      const image = new Image();
      image.src = imageUrl;
    });
  }, [graphData.locations, presentationOpen, uniqueVisited]);

  useEffect(() => {
    if (presentationMode !== 'auto' || !presentationOpen || presentationStatus !== 'holding') return;

    holdTimerRef.current = window.setTimeout(() => {
      if (presentationStopIndex >= activePath.length - 1) {
        setPresentationStatus('summary');
        return;
      }
      setPresentationStatus('moving');
    }, PRESENTATION_HOLD_MS);

    return () => {
      if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
      }
    };
  }, [activePath.length, presentationMode, presentationOpen, presentationStatus, presentationStopIndex]);

  useEffect(() => {
    if (!presentationOpen || presentationStatus !== 'moving') return;

    const segment = presentationSegments[presentationStopIndex];
    if (!segment) {
      setPresentationStatus('summary');
      return;
    }

    let startedAt: number | null = null;

    const tick = (timestamp: number) => {
      if (startedAt === null) startedAt = timestamp;
      const elapsed = timestamp - startedAt;
      const ratio = Math.min(elapsed / segment.durationMs, 1);
      setPresentationVehicleProgress(segment.cumulativeStart + (segment.cumulativeEnd - segment.cumulativeStart) * ratio);

      if (ratio < 1) {
        animationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      setPresentationVehicleProgress(segment.cumulativeEnd);
      setPresentationStopIndex(current => current + 1);
      setPresentationStatus('holding');
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [presentationOpen, presentationSegments, presentationStatus, presentationStopIndex]);

  const handleToggleLocation = useCallback((locationId: string) => {
    setSelectedIds(current => {
      if (current.includes(locationId)) return current.filter(id => id !== locationId);
      if (current.length >= Math.min(limit.max, graphData.locations.length)) return current;
      return [...current, locationId];
    });
  }, [graphData.locations.length, limit.max]);

  const handleLoadPreset = useCallback(() => {
    const presetIds = getPresetSelection(presets, mode).filter(id => graphData.locations.some(location => location.id === id));
    setSelectedIds(presetIds);
    setStartId(presetIds[0] ?? '');
    setEndId(mode === 'path' && presetIds.length > 1 ? presetIds[presetIds.length - 1] : null);
    setResult(null);
  }, [graphData.locations, mode, presets]);

  const handleReset = useCallback(() => {
    setSelectedIds([]);
    setStartId('');
    setEndId(null);
    setResult(null);
  }, []);

  const handleRun = useCallback(() => {
    const normalizedIds = selectedIds.filter(id => graphData.locations.some(location => location.id === id));
    const subsetLocations = graphData.locations.filter(location => normalizedIds.includes(location.id));
    const subsetRoutes = graphData.routes.filter(route => normalizedIds.includes(route.from) && normalizedIds.includes(route.to));

    if (mode === 'cycle') {
      if (normalizedIds.length < PREVIEW_LIMITS.cycle.min || !startId) return;
      setResult(findShortestHamiltonianCycle(subsetLocations, subsetRoutes, startId));
      return;
    }

    if (mode === 'path') {
      if (normalizedIds.length < PREVIEW_LIMITS.path.min || !startId || !endId) return;
      setResult(findShortestHamiltonianPath(subsetLocations, subsetRoutes, startId, endId));
      return;
    }

    if (normalizedIds.length < PREVIEW_LIMITS.subset.min || !startId) return;
    setResult(findShortestSubsetRoute(graphData.locations, graphData.routes, normalizedIds, startId));
  }, [endId, graphData.locations, graphData.routes, mode, selectedIds, startId]);

  const handleOpenPresentation = useCallback(() => {
    resetPresentationState();
    setPresentationOpen(true);
  }, [resetPresentationState]);

  const handleClosePresentation = useCallback(() => {
    setPresentationOpen(false);
    resetPresentationState();
  }, [resetPresentationState]);

  const handleStartPresentation = useCallback(() => {
    setPresentationStopIndex(0);
    setPresentationVehicleProgress(0);
    setPresentationStatus('holding');
  }, []);

  const handleAdvancePresentation = useCallback(() => {
    if (presentationStatus === 'intro') {
      handleStartPresentation();
      return;
    }

    if (presentationStatus === 'moving' || presentationStatus === 'summary') {
      return;
    }

    if (presentationStopIndex >= activePath.length - 1) {
      setPresentationStatus('summary');
      return;
    }

    setPresentationStatus('moving');
  }, [activePath.length, handleStartPresentation, presentationStatus, presentationStopIndex]);

  const getPresentationImage = useCallback((location: TouristLocation | null) => {
    if (!location) return null;
    return location.images?.[0] ?? location.imageUrl ?? null;
  }, []);

  const canRun = startId !== ''
    && selectedIds.length >= limit.min
    && (mode !== 'path' || (endId !== null && endId !== startId));
  const statusText = mode === 'subset'
    ? (selectedIds.length < limit.min ? `Chọn ít nhất ${limit.min} địa điểm để chạy thử.` : `${selectedIds.length} địa điểm đã sẵn sàng để giải thử.`)
    : (selectedIds.length < limit.min ? `Chọn đủ ${limit.min} địa điểm để mô phỏng đúng bài toán.` : `Đã đủ ${limit.min} địa điểm để chạy thử.`);

  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Algorithm preview</div>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Chạy thử 3 bài toán</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Khu này dùng dữ liệu hiện có trong hệ thống để thầy kiểm tra lời giải của Bài 1, Bài 2 và Bài 3 trước khi quay lại phần quản trị nội dung.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-full border border-[#ddd1c0] bg-[#f7f1e7] p-1">
            {(['cycle', 'path', 'subset'] as AppMode[]).map(currentMode => (
              <button
                key={currentMode}
                type="button"
                onClick={() => setMode(currentMode)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${mode === currentMode ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
              >
                {currentMode === 'cycle' ? 'Bài 1' : currentMode === 'path' ? 'Bài 2' : 'Bài 3'}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              <div className="font-bold text-slate-900">{MODE_LABELS[mode]}</div>
              <div className="mt-1">{statusText}</div>
              {presets[mode]?.desc && (
                <div className="mt-2 text-xs text-slate-500">Preset hiện có: {presets[mode].desc}</div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLoadPreset}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Nạp preset của chế độ này
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" /> Làm lại
              </button>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                Chọn địa điểm ({selectedIds.length}/{Math.min(limit.max, graphData.locations.length)})
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                {graphData.locations.map(location => {
                  const selected = selectedIds.includes(location.id);
                  return (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => handleToggleLocation(location.id)}
                      disabled={!selected && !canAddMore}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${selected
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold">{location.fullName}</div>
                          <div className="mt-1 text-xs text-slate-500">{location.id} • {location.category}</div>
                        </div>
                        {selected && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Điểm xuất phát">
                <select value={startId} onChange={event => setStartId(event.target.value)} className="field-input" title="Điểm xuất phát">
                  <option value="">Chọn điểm xuất phát</option>
                  {availableLocations.map(location => <option key={location.id} value={location.id}>{location.fullName}</option>)}
                </select>
              </Field>
              {mode === 'path' ? (
                <Field label="Điểm kết thúc">
                  <select value={endId ?? ''} onChange={event => setEndId(event.target.value || null)} className="field-input" title="Điểm kết thúc">
                    <option value="">Chọn điểm kết thúc</option>
                    {availableLocations.filter(location => location.id !== startId).map(location => (
                      <option key={location.id} value={location.id}>{location.fullName}</option>
                    ))}
                  </select>
                </Field>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  {mode === 'cycle'
                    ? 'Bài 1 sẽ khép vòng về lại điểm xuất phát sau khi đi qua đủ các điểm đã chọn.'
                    : 'Bài 3 tìm chu trình tối ưu trên chính tập điểm mà thầy chọn ở bên trái.'}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleRun}
              disabled={!canRun}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white ${canRun ? 'bg-[#14342b] hover:bg-[#102b24]' : 'bg-slate-300 cursor-not-allowed'}`}
            >
              <Play className="h-4 w-4" /> Giải thử bài toán này
            </button>
          </div>

          <div className="min-w-0">
            <div className="mb-4 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Bản đồ theo tập điểm đã chọn</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Chỉ hiển thị các địa điểm đang chọn và các tuyến đường nối trực tiếp giữa chúng.
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                    <button
                      type="button"
                      onClick={() => setDisplayLayoutMode('polygon')}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${displayLayoutMode === 'polygon' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
                    >
                      Dàn đều đa giác
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisplayLayoutMode('geo')}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${displayLayoutMode === 'geo' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-white'}`}
                    >
                      Theo bản đồ thật
                    </button>
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-6 text-amber-800">
                  Chế độ <strong>dàn đều đa giác</strong> giúp các điểm không chồng lên nhau khi thầy kiểm tra từng bài toán. Điểm bắt đầu luôn được ghim ở đỉnh trên cùng và nền map sẽ tự ẩn để nhìn rõ sơ đồ.
                </div>
                {displayLayoutMode === 'polygon' && orderedPolygonLocations.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Thứ tự đỉnh đa giác</div>
                        <div className="mt-1 text-xs text-slate-500">Thầy có thể đổi vị trí từng đỉnh. Điểm xuất phát luôn cố định ở trên cùng.</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPolygonVertexOrders(current => ({ ...current, [mode]: suggestedPolygonOrder }))}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100"
                      >
                        Đặt lại theo lời giải
                      </button>
                    </div>
                    <div className="mt-3 space-y-2">
                      {orderedPolygonLocations.map((location, index) => {
                        const isStart = location.id === startId;
                        const movableOrder = displayLayoutOrder.filter(id => id !== startId);
                        const movableIndex = movableOrder.indexOf(location.id);
                        const canMoveUp = !isStart && movableIndex > 0;
                        const canMoveDown = !isStart && movableIndex < movableOrder.length - 1;

                        return (
                          <div key={location.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-3 py-2 shadow-sm">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-2 text-[11px] font-black ${isStart ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                                  {index + 1}
                                </span>
                                <div className="truncate text-sm font-bold text-slate-900">{location.fullName}</div>
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {isStart ? 'Điểm bắt đầu, luôn ở đỉnh trên cùng.' : `${location.id} • Có thể đổi vị trí trong đa giác.`}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                              <button
                                type="button"
                                onClick={() => updatePolygonOrder(current => movePolygonVertex(current, location.id, 'up', startId))}
                                disabled={!canMoveUp}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Đưa đỉnh lên trước"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => updatePolygonOrder(current => movePolygonVertex(current, location.id, 'down', startId))}
                                disabled={!canMoveDown}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Đưa đỉnh xuống sau"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div className="h-[25rem] p-4">
                {availableLocations.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm leading-7 text-slate-500">
                    Chưa có địa điểm nào được chọn để hiển thị trên bản đồ.
                  </div>
                ) : (
                  <MapCanvas
                    locations={availableLocations}
                    routes={displayRoutes}
                    appMode={mode}
                    uiMode="view"
                    startId={startId}
                    endId={endId}
                    selectedSubset={selectedIds}
                    currentStep={null}
                    highlightedPaths={highlightedPaths}
                    activePathIndex={0}
                    selectedElement={selectedElement}
                    onLocationClick={() => {}}
                    onLocationDrag={() => {}}
                    onCanvasDoubleClick={() => {}}
                    onRouteClick={id => setSelectedElement({ type: 'route', id })}
                    onSelectElement={setSelectedElement}
                    edgeStart={null}
                    onEdgeStartSet={() => {}}
                    onAddRoute={() => {}}
                    showOrderedFlow={false}
                    animatePathVehicle={false}
                    displayLayoutMode={displayLayoutMode}
                    displayLayoutOrder={displayLayoutOrder}
                  />
                )}
              </div>
            </div>

            {!result ? (
              <div className="flex h-full min-h-[22rem] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm leading-7 text-slate-500">
                Chọn bộ địa điểm, điểm đầu và bấm <strong className="mx-1 text-slate-700">Giải thử bài toán này</strong> để kiểm tra kết quả ngay tại route này.
              </div>
            ) : !result.found ? (
              <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm leading-7 text-red-700">
                <div className="text-lg font-black text-red-800">Không tìm được lời giải</div>
                <div className="mt-2">{result.steps[result.steps.length - 1]?.explanation ?? 'Đồ thị hiện tại chưa thỏa điều kiện của bài toán.'}</div>
              </div>
            ) : (
              <div className="space-y-4 rounded-[28px] border border-emerald-200 bg-white p-5 shadow-[0_18px_40px_rgba(16,43,36,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-600">Kết quả thử nghiệm</div>
                    <div className="mt-1 text-xl font-black text-slate-900">{MODE_LABELS[mode]}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-emerald-700">{result.totalDistanceKm.toFixed(1)} km</div>
                    <div className="text-xs text-slate-500">
                      {mode === 'path'
                        ? 'Đường đi đại diện ngắn nhất'
                        : `${result.allCycles.length} phương án hợp lệ, lấy 1 phương án tối ưu đại diện`}
                    </div>
                  </div>
                </div>

                <PathDisplay
                  path={activePath}
                  totalKm={result.totalDistanceKm}
                  locations={graphData.locations}
                  appMode={mode}
                  allCount={1}
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleOpenPresentation}
                    className="inline-flex items-center gap-2 rounded-full bg-[#9f1239] px-5 py-3 text-sm font-bold text-white hover:bg-[#881337]"
                  >
                    <Expand className="h-4 w-4" /> Trình chiếu toàn màn hình
                  </button>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500">
                    Bấm để chạy xe qua từng điểm và dừng lại ở màn tổng kết cuối cùng.
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                  <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                    Lời giải đại diện
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      {activePath.slice(0, -1).map((nodeId, index) => {
                        const nextId = activePath[index + 1];
                        const distance = getSegmentDistance(nodeId, nextId);
                        return (
                          <tr key={`${nodeId}-${nextId}-${index}`} className="border-b border-slate-50 last:border-b-0">
                            <td className="w-12 px-4 py-3 font-mono text-xs text-slate-400">{index + 1}.</td>
                            <td className="px-4 py-3 text-slate-700">
                              <span className="font-semibold">{getLocationName(nodeId)}</span>
                              <span className="mx-2 text-slate-300">→</span>
                              <span className="font-semibold">{getLocationName(nextId)}</span>
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-slate-500">
                              {distance !== null ? `${distance.toFixed(1)} km` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  {result.steps[result.steps.length - 1]?.explanation ?? 'Đã hoàn tất mô phỏng.'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {presentationOpen && result?.found && (
        <div className="fixed inset-0 z-[10040] bg-[#120b10] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,24,93,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.22),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.22),rgba(15,23,42,0.68))]" />

          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 md:px-8">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55">Slideshow route</div>
                <h3 className="mt-1 text-2xl font-black">{MODE_LABELS[mode]} trên bản đồ trình chiếu</h3>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold text-white/70 md:block">
                  Esc để thoát trình chiếu
                </div>
                <button
                  type="button"
                  onClick={handleClosePresentation}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white transition hover:bg-white/18"
                  title="Đóng trình chiếu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid min-h-0 flex-1 gap-4 px-4 py-4 md:grid-cols-[minmax(0,1.35fr)_26rem] md:px-6 md:py-6">
              <div className="relative min-h-[24rem] overflow-hidden rounded-[32px] border border-white/12 bg-black/20 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                <MapCanvas
                  locations={availableLocations}
                  routes={displayRoutes}
                  appMode={mode}
                  uiMode="view"
                  startId={startId}
                  endId={endId}
                  selectedSubset={selectedIds}
                  currentStep={presentationCurrentStep}
                  highlightedPaths={highlightedPaths}
                  activePathIndex={0}
                  selectedElement={null}
                  onLocationClick={() => {}}
                  onLocationDrag={() => {}}
                  onCanvasDoubleClick={() => {}}
                  onRouteClick={() => {}}
                  onSelectElement={() => {}}
                  edgeStart={null}
                  onEdgeStartSet={() => {}}
                  onAddRoute={() => {}}
                  showOrderedFlow={false}
                  animatePathVehicle={false}
                  vehicleProgressOverride={presentationStatus === 'intro' ? null : presentationVehicleProgress}
                  hideMapControls
                  defaultShowDistanceLabels={false}
                  defaultShowMapBackground
                  defaultTileTheme="dark"
                  focusedLocationId={presentationLocation?.id ?? null}
                  onFocusedLocationScreenPositionChange={() => {}}
                  displayLayoutMode={displayLayoutMode}
                  displayLayoutOrder={displayLayoutOrder}
                />

                <div className="pointer-events-none absolute left-5 top-5 w-[22rem] rounded-[28px] border border-white/12 bg-black/32 px-4 py-4 backdrop-blur-md">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">Tiến độ hành trình</div>
                  <div className="mt-2 flex items-center gap-3">
                    <div className="text-3xl font-black">{presentationStatus === 'summary' ? '100%' : `${Math.round(presentationVehicleProgress * 100)}%`}</div>
                    <div className="text-sm leading-6 text-white/72">
                      {presentationStatus === 'intro'
                        ? 'Sẵn sàng khởi hành'
                        : presentationStatus === 'moving'
                          ? `Đang tiến tới điểm ${presentationDisplayIndex}/${activePath.length}`
                          : presentationStatus === 'summary'
                            ? 'Đã hoàn tất hành trình'
                            : `Đang dừng tại điểm ${presentationDisplayIndex}/${activePath.length}`}
                    </div>
                  </div>

                  {presentationStatus !== 'summary' && presentationLocation && (
                    <div className="mt-4 rounded-[22px] border border-white/10 bg-white/8 p-3 text-white">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
                            {presentationStatus === 'moving' ? 'Điểm sắp đến' : 'Điểm hiện tại'}
                          </div>
                          <div className="mt-1 text-lg font-black leading-tight">{presentationLocation.fullName}</div>
                        </div>
                        <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-bold text-white/78">
                          {presentationDisplayIndex} / {activePath.length}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-white/70">
                        <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1">{presentationLocation.category}</span>
                        {presentationLocation.neighborhood && (
                          <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1">{presentationLocation.neighborhood}</span>
                        )}
                      </div>

                      {getPresentationImage(presentationLocation) && (
                        <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                          <img
                            src={getPresentationImage(presentationLocation) ?? undefined}
                            alt={presentationLocation.fullName}
                            className="h-28 w-full object-cover"
                          />
                        </div>
                      )}

                      <div className="mt-3 text-sm leading-6 text-white/74">
                        {presentationStatus === 'moving' && currentPresentationSegment
                          ? `Đang đi từ ${getLocationName(currentPresentationSegment.fromId)} tới ${getLocationName(currentPresentationSegment.toId)} với quãng đường ${currentPresentationSegment.distanceKm.toFixed(1)} km.`
                          : (presentationLocation.shortIntro ?? presentationLocation.description)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex min-h-0 flex-col gap-4">
                <div className="rounded-[30px] border border-white/12 bg-white/8 p-5 text-sm leading-7 text-white/74 shadow-[0_24px_48px_rgba(0,0,0,0.18)] backdrop-blur-md">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">Khung tóm tắt</div>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <span>Điểm xuất phát</span>
                      <strong className="text-white">{getLocationName(startId)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Tổng số chặng</span>
                      <strong className="text-white">{presentationSegments.length}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Tổng quãng đường</span>
                      <strong className="text-white">{result.totalDistanceKm.toFixed(1)} km</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Loại bài toán</span>
                      <strong className="text-white">{MODE_LABELS[mode]}</strong>
                    </div>
                  </div>
                </div>

                <div className="rounded-[30px] border border-white/12 bg-white/8 p-5 shadow-[0_24px_48px_rgba(0,0,0,0.18)] backdrop-blur-md">
                  {presentationStatus === 'intro' ? (
                    <>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">Mở màn</div>
                      <div className="mt-2 text-3xl font-black">Bắt đầu trình chiếu lộ trình</div>
                      <p className="mt-3 text-sm leading-7 text-white/72">
                        Xe sẽ chạy qua từng địa điểm trong phương án tối ưu, dừng lại để hiện thông tin điểm đến và khép lại bằng bảng tổng kết sau khi hoàn tất một vòng.
                      </p>
                      <div className="mt-5 grid gap-3 rounded-3xl border border-white/10 bg-black/14 p-4 text-sm text-white/74">
                        <div className="flex items-center justify-between gap-3">
                          <span>Tổng quãng đường</span>
                          <strong className="text-xl text-white">{result.totalDistanceKm.toFixed(1)} km</strong>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Số địa điểm ghé</span>
                          <strong className="text-white">{uniqueVisited.length} điểm</strong>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span>Số chặng di chuyển</span>
                          <strong className="text-white">{presentationSegments.length} chặng</strong>
                        </div>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2 rounded-full border border-white/10 bg-black/16 p-1">
                        <button
                          type="button"
                          onClick={() => setPresentationMode('auto')}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${presentationMode === 'auto' ? 'bg-white text-slate-900' : 'text-white/72 hover:bg-white/10'}`}
                        >
                          <TimerReset className="h-4 w-4" /> Tự chạy
                        </button>
                        <button
                          type="button"
                          onClick={() => setPresentationMode('manual')}
                          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${presentationMode === 'manual' ? 'bg-white text-slate-900' : 'text-white/72 hover:bg-white/10'}`}
                        >
                          <Hand className="h-4 w-4" /> Bấm qua điểm
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartPresentation}
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-rose-50"
                      >
                        <Play className="h-4 w-4" /> Bắt đầu chạy xe
                      </button>
                    </>
                  ) : presentationStatus === 'summary' ? (
                    <>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/80">Tổng kết</div>
                      <div className="mt-2 text-3xl font-black">Hoàn tất hành trình tối ưu</div>
                      <p className="mt-3 text-sm leading-7 text-white/72">
                        {mode === 'path'
                          ? 'Xe đã đi hết toàn bộ lộ trình từ điểm đầu tới điểm cuối theo phương án ngắn nhất.'
                          : 'Xe đã hoàn thành một vòng trọn vẹn và quay về điểm xuất phát theo phương án tối ưu.'}
                      </p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-3xl border border-white/10 bg-black/16 p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Tổng quãng đường</div>
                          <div className="mt-2 text-3xl font-black text-white">{result.totalDistanceKm.toFixed(1)} km</div>
                        </div>
                        <div className="rounded-3xl border border-white/10 bg-black/16 p-4">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Điểm đã ghé</div>
                          <div className="mt-2 text-3xl font-black text-white">{uniqueVisited.length}</div>
                        </div>
                      </div>
                      <div className="mt-5 rounded-[28px] border border-white/10 bg-black/14 p-4">
                        <PathDisplay
                          path={activePath}
                          totalKm={result.totalDistanceKm}
                          locations={graphData.locations}
                          appMode={mode}
                          allCount={1}
                        />
                      </div>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleStartPresentation}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-rose-50"
                        >
                          <Play className="h-4 w-4" /> Chạy lại trình chiếu
                        </button>
                        <button
                          type="button"
                          onClick={handleClosePresentation}
                          className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/14"
                        >
                          <X className="h-4 w-4" /> Đóng trình chiếu
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">Điều khiển trình chiếu</div>
                          <div className="mt-2 text-3xl font-black leading-tight">{presentationMode === 'auto' ? 'Tự chạy theo hành trình' : 'Bấm để sang điểm kế tiếp'}</div>
                        </div>
                        <div className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-xs font-bold text-white/78">
                          {Math.min(presentationStopIndex + 1, activePath.length)} / {activePath.length}
                        </div>
                      </div>

                      <div className="mt-4 rounded-[28px] border border-white/10 bg-black/16 p-4 text-sm leading-7 text-white/76">
                        {presentationStatus === 'moving' && currentPresentationSegment ? (
                          <>
                            <div className="inline-flex items-center gap-2 font-semibold text-rose-200">
                              <RouteIcon className="h-4 w-4" />
                              {getLocationName(currentPresentationSegment.fromId)} → {getLocationName(currentPresentationSegment.toId)}
                            </div>
                            <div className="mt-2 text-white/72">
                              Mũi tên đang tiến tới điểm kế tiếp theo đúng chặng tối ưu, quãng đường chặng này là {currentPresentationSegment.distanceKm.toFixed(1)} km.
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="inline-flex items-center gap-2 font-semibold text-emerald-200">
                              <MapPinned className="h-4 w-4" />
                              {presentationMode === 'auto' ? 'Tự dừng ở mỗi điểm' : 'Chờ người dùng bấm để đi tiếp'}
                            </div>
                            <div className="mt-2 text-white/72">
                              {presentationMode === 'auto'
                                ? 'Hệ thống sẽ tự chạy hết hành trình và tự chuyển sang điểm kế tiếp sau khoảng dừng ngắn.'
                                : 'Khi mũi tên đã dừng tại một điểm, bấm nút bên dưới để chuyển sang chặng tiếp theo.'}
                            </div>
                          </>
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-3">
                        {presentationMode === 'manual' && presentationStatus !== 'moving' && (
                          <button
                            type="button"
                            onClick={handleAdvancePresentation}
                            className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-rose-50"
                          >
                            <ChevronRight className="h-4 w-4" /> {presentationStatus === 'holding' ? 'Chạy qua điểm tiếp theo' : 'Bắt đầu trình chiếu'}
                          </button>
                        )}
                        <div className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-black/16 p-1">
                          <button
                            type="button"
                            onClick={() => setPresentationMode('auto')}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${presentationMode === 'auto' ? 'bg-white text-slate-900' : 'text-white/72 hover:bg-white/10'}`}
                          >
                            <TimerReset className="h-4 w-4" /> Tự chạy
                          </button>
                          <button
                            type="button"
                            onClick={() => setPresentationMode('manual')}
                            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition ${presentationMode === 'manual' ? 'bg-white text-slate-900' : 'text-white/72 hover:bg-white/10'}`}
                          >
                            <Hand className="h-4 w-4" /> Bấm qua điểm
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
