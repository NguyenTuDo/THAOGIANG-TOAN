import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Hand, MapPinned, Play, Route as RouteIcon, TimerReset, X } from 'lucide-react';
import { AlgorithmStep, AppMode, Route, TouristLocation } from '../types';
import { MapCanvas } from './MapCanvas';
import { PathDisplay } from './PathDisplay';

interface RoutePresentationModalProps {
  open: boolean;
  onClose: () => void;
  locations: TouristLocation[];
  routes: Route[];
  appMode: AppMode;
  startId: string;
  endId: string | null;
  activePath: string[];
  totalDistanceKm: number;
}

interface PresentationSegment {
  fromId: string;
  toId: string;
  distanceKm: number;
  durationMs: number;
  cumulativeStart: number;
  cumulativeEnd: number;
}

const MODE_LABELS: Record<AppMode, string> = {
  cycle: 'Chu trình Hamilton',
  path: 'Đường đi Hamilton',
  subset: 'Đường đi ngắn nhất',
};

const PRESENTATION_HOLD_MS = 1800;

export function RoutePresentationModal({
  open,
  onClose,
  locations,
  routes,
  appMode,
  startId,
  endId,
  activePath,
  totalDistanceKm,
}: RoutePresentationModalProps) {
  const [presentationStatus, setPresentationStatus] = useState<'intro' | 'holding' | 'moving' | 'summary'>('intro');
  const [presentationStopIndex, setPresentationStopIndex] = useState(0);
  const [presentationVehicleProgress, setPresentationVehicleProgress] = useState(0);
  const [presentationMode, setPresentationMode] = useState<'auto' | 'manual'>('auto');
  const holdTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const getLocationName = useCallback(
    (id: string) => locations.find(location => location.id === id)?.fullName ?? id,
    [locations],
  );

  const getSegmentDistance = useCallback((fromId: string, toId: string) => {
    const route = routes.find(
      current => (current.from === fromId && current.to === toId) || (current.to === fromId && current.from === toId),
    );
    return route?.distanceKm ?? null;
  }, [routes]);

  const highlightedPaths = useMemo(
    () => (activePath.length > 0 ? [activePath] : []),
    [activePath],
  );

  const displayRoutes = useMemo(() => {
    if (activePath.length < 2) return routes;

    return routes.filter(route => {
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
  }, [activePath, routes]);

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
    () => locations.find(location => location.id === presentationFocusLocationId) ?? null,
    [locations, presentationFocusLocationId],
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
      totalWeight: totalDistanceKm,
      explanation: '',
      isBacktracking: false,
    };
  }, [activePath, presentationFocusLocationId, presentationStopIndex, totalDistanceKm]);

  const currentPresentationSegment = useMemo(
    () => presentationSegments[Math.min(presentationStopIndex, Math.max(presentationSegments.length - 1, 0))] ?? null,
    [presentationSegments, presentationStopIndex],
  );

  const getPresentationImage = useCallback((location: TouristLocation | null) => {
    if (!location) return null;
    return location.images?.[0] ?? location.imageUrl ?? null;
  }, []);

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
    if (!open) {
      resetPresentationState();
    }
  }, [open, resetPresentationState]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;

    uniqueVisited.forEach(locationId => {
      const location = locations.find(item => item.id === locationId);
      const imageUrl = location?.images?.[0] ?? location?.imageUrl;
      if (!imageUrl) return;

      const image = new Image();
      image.src = imageUrl;
    });
  }, [locations, open, uniqueVisited]);

  useEffect(() => {
    if (presentationMode !== 'auto' || !open || presentationStatus !== 'holding') return;

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
  }, [activePath.length, open, presentationMode, presentationStatus, presentationStopIndex]);

  useEffect(() => {
    if (!open || presentationStatus !== 'moving') return;

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
  }, [open, presentationSegments, presentationStatus, presentationStopIndex]);

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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10040] bg-[#120b10] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(190,24,93,0.28),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.22),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.22),rgba(15,23,42,0.68))]" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 md:px-8">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/55">Slideshow route</div>
            <h3 className="mt-1 text-2xl font-black">{MODE_LABELS[appMode]} trên bản đồ trình chiếu</h3>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-semibold text-white/70 md:block">
              Esc để thoát trình chiếu
            </div>
            <button
              type="button"
              onClick={onClose}
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
              locations={locations}
              routes={displayRoutes}
              appMode={appMode}
              uiMode="view"
              startId={startId}
              endId={endId}
              selectedSubset={locations.map(location => location.id)}
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
                  <strong className="text-white">{totalDistanceKm.toFixed(1)} km</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Loại bài toán</span>
                  <strong className="text-white">{MODE_LABELS[appMode]}</strong>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/12 bg-white/8 p-5 shadow-[0_24px_48px_rgba(0,0,0,0.18)] backdrop-blur-md">
              {presentationStatus === 'intro' ? (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/55">Mở màn</div>
                  <div className="mt-2 text-3xl font-black">Bắt đầu trình chiếu lộ trình</div>
                  <p className="mt-3 text-sm leading-7 text-white/72">
                    Mũi tên sẽ đi qua từng địa điểm trong phương án tối ưu, dừng lại để hiện thông tin điểm đến và khép lại bằng bảng tổng kết sau khi hoàn tất hành trình.
                  </p>
                  <div className="mt-5 grid gap-3 rounded-3xl border border-white/10 bg-black/14 p-4 text-sm text-white/74">
                    <div className="flex items-center justify-between gap-3">
                      <span>Tổng quãng đường</span>
                      <strong className="text-xl text-white">{totalDistanceKm.toFixed(1)} km</strong>
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
                    <Play className="h-4 w-4" /> Bắt đầu chạy lộ trình
                  </button>
                </>
              ) : presentationStatus === 'summary' ? (
                <>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200/80">Tổng kết</div>
                  <div className="mt-2 text-3xl font-black">Hoàn tất hành trình tối ưu</div>
                  <p className="mt-3 text-sm leading-7 text-white/72">
                    {appMode === 'path'
                      ? 'Đã đi hết toàn bộ lộ trình từ điểm đầu tới điểm cuối theo phương án ngắn nhất.'
                      : 'Đã hoàn thành hành trình tối ưu theo đúng tuyến đường đại diện.'}
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-black/16 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Tổng quãng đường</div>
                      <div className="mt-2 text-3xl font-black text-white">{totalDistanceKm.toFixed(1)} km</div>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/16 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Điểm đã ghé</div>
                      <div className="mt-2 text-3xl font-black text-white">{uniqueVisited.length}</div>
                    </div>
                  </div>
                  <div className="mt-5 rounded-[28px] border border-white/10 bg-black/14 p-4">
                    <PathDisplay
                      path={activePath}
                      totalKm={totalDistanceKm}
                      locations={locations}
                      appMode={appMode}
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
                      onClick={onClose}
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
                      {presentationDisplayIndex} / {activePath.length}
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
  );
}