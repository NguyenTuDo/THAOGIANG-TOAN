import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, Clapperboard, Play, RotateCcw, ShieldCheck } from 'lucide-react';
import { TouristLocation, Route, AppMode, AlgorithmResult, SelectedElement } from '../types';
import { MapCanvas } from './MapCanvas';
import { LocationInsightPanel } from './LocationInsightPanel';
import { PathDisplay } from './PathDisplay';
import { RoutePresentationModal } from './RoutePresentationModal';

interface PreviewCase {
  id: string;
  title: string;
  description: string;
  path: string[];
  totalDistanceKm: number | null;
  valid: boolean;
  note: string;
}

interface GraphViewProps {
  locations: TouristLocation[];
  routes: Route[];
  selectedIds: string[];
  appMode: AppMode;
  startId: string;
  endId: string | null;
  stage: 'preview' | 'result';
  result: AlgorithmResult | null;
  onBack: () => void;
  onSolve: () => void;
  onRerun: () => void;
}

function buildRouteKey(fromId: string, toId: string) {
  return [fromId, toId].sort().join('__');
}

function arePathsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function MiniCycleMap({
  locations,
  routes,
  appMode,
  startId,
  path,
}: {
  locations: TouristLocation[];
  routes: Route[];
  appMode: AppMode;
  startId: string;
  path: string[];
}) {
  const miniRoutes = useMemo(() => routes.filter(route => {
    for (let index = 0; index < path.length - 1; index += 1) {
      const fromId = path[index];
      const toId = path[index + 1];
      if (
        (route.from === fromId && route.to === toId) ||
        (route.from === toId && route.to === fromId)
      ) {
        return true;
      }
    }

    return false;
  }), [path, routes]);

  const pathLocationIds = useMemo(
    () => Array.from(new Set(path)),
    [path],
  );
  const miniLocations = useMemo(
    () => locations.filter(location => pathLocationIds.includes(location.id)),
    [locations, pathLocationIds],
  );

  return (
    <div className="pointer-events-none h-[154px] w-full overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
      <MapCanvas
        locations={miniLocations}
        routes={miniRoutes}
        appMode={appMode}
        uiMode="view"
        startId={startId}
        endId={null}
        selectedSubset={miniLocations.map(location => location.id)}
        currentStep={null}
        highlightedPaths={[path]}
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
        hideMapControls
        hideScaleControl
        hideZoomControl
        hideAttributionControl
        disableMapInteraction
        miniNodeIcons
        fitPadding={12}
        singleLocationZoom={18}
        defaultShowDistanceLabels={false}
        defaultShowMapBackground={true}
        defaultTileTheme="light"
        allowedTileThemes={['light']}
      />
    </div>
  );
}

function evaluatePreviewPath(
  path: string[],
  routeMap: Map<string, Route>,
  getLocationName: (id: string) => string,
): { totalDistanceKm: number | null; valid: boolean; note: string } {
  if (path.length < 2) {
    return {
      totalDistanceKm: null,
      valid: false,
      note: 'Chưa đủ điểm để tạo tình huống thử.',
    };
  }

  let totalDistanceKm = 0;

  for (let index = 0; index < path.length - 1; index += 1) {
    const fromId = path[index];
    const toId = path[index + 1];
    const route = routeMap.get(buildRouteKey(fromId, toId));

    if (!route) {
      return {
        totalDistanceKm: null,
        valid: false,
        note: `Thiếu cạnh nối ${getLocationName(fromId)} và ${getLocationName(toId)}.`,
      };
    }

    totalDistanceKm += route.distanceKm;
  }

  return {
    totalDistanceKm,
    valid: true,
    note: `Có thể chạy thử theo lộ trình này với tổng ${totalDistanceKm.toFixed(1)} km.`,
  };
}

function buildPathModeOrder(selectedIds: string[], startId: string, endId: string | null) {
  if (!startId || !endId) return [];
  const middleIds = selectedIds.filter(id => id !== startId && id !== endId);
  return [startId, ...middleIds, endId];
}

function buildReverseMiddlePath(selectedIds: string[], startId: string, endId: string | null) {
  if (!startId || !endId) return [];
  const middleIds = selectedIds.filter(id => id !== startId && id !== endId).reverse();
  return [startId, ...middleIds, endId];
}

function buildNearestNeighborTrial(
  candidateIds: string[],
  startId: string,
  endId: string | null,
  appMode: AppMode,
  routeMap: Map<string, Route>,
) {
  if (!startId) return [];

  const path = [startId];

  if (appMode === 'subset') {
    return path;
  }

  const deferredEndId = appMode === 'path' ? endId : null;
  const remaining = new Set(candidateIds.filter(id => id !== startId && id !== deferredEndId));
  let currentId = startId;

  while (remaining.size > 0) {
    const nextId = Array.from(remaining)
      .map(id => ({ id, route: routeMap.get(buildRouteKey(currentId, id)) ?? null }))
      .filter((entry): entry is { id: string; route: Route } => Boolean(entry.route))
      .sort((left, right) => left.route.distanceKm - right.route.distanceKm)[0]?.id;

    if (!nextId) {
      return path;
    }

    path.push(nextId);
    remaining.delete(nextId);
    currentId = nextId;
  }

  if (appMode === 'path' && endId) {
    path.push(endId);
  }

  if (appMode === 'cycle') {
    path.push(startId);
  }

  return path;
}

export const GraphView: React.FC<GraphViewProps> = ({
  locations, routes, selectedIds, appMode, startId, endId, stage, result, onBack, onSolve, onRerun,
}) => {
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [activePreviewCaseId, setActivePreviewCaseId] = useState<string>('selection-order');
  const [showRemainingCycles, setShowRemainingCycles] = useState(false);

  useEffect(() => {
    if (!isPresentationOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPresentationOpen]);

  const routeMap = useMemo(
    () => new Map(routes.map(route => [buildRouteKey(route.from, route.to), route])),
    [routes],
  );

  const getLocationName = useCallback(
    (id: string) => locations.find(location => location.id === id)?.fullName ?? id,
    [locations],
  );

  const previewCases = useMemo<PreviewCase[]>(() => {
    const cases: PreviewCase[] = [];
    const orderedSelection = appMode === 'cycle'
      ? [...selectedIds, startId]
      : appMode === 'path'
        ? buildPathModeOrder(selectedIds, startId, endId)
        : [];

    if (appMode === 'cycle' && orderedSelection.length > 1) {
      const orderedEval = evaluatePreviewPath(orderedSelection, routeMap, getLocationName);
      cases.push({
        id: 'selection-order',
        title: 'Theo thứ tự đang chọn',
        description: 'Dùng đúng thứ tự thầy vừa sắp khi chọn điểm.',
        path: orderedSelection,
        ...orderedEval,
      });

      const reversePath = [startId, ...selectedIds.filter(id => id !== startId).reverse(), startId];
      const reverseEval = evaluatePreviewPath(reversePath, routeMap, getLocationName);
      cases.push({
        id: 'reverse-order',
        title: 'Đảo chiều vòng tham quan',
        description: 'Thử đi theo chiều ngược lại để đối chiếu.',
        path: reversePath,
        ...reverseEval,
      });

      const greedyPath = buildNearestNeighborTrial(selectedIds, startId, null, appMode, routeMap);
      const greedyEval = evaluatePreviewPath(greedyPath, routeMap, getLocationName);
      cases.push({
        id: 'greedy-cycle',
        title: 'Đi cạnh gần nhất trước',
        description: 'Một cách thử nhanh để xem đồ thị có khép vòng mượt không.',
        path: greedyPath,
        ...greedyEval,
      });
    }

    if (appMode === 'path') {
      const forwardPath = buildPathModeOrder(selectedIds, startId, endId);
      if (forwardPath.length > 1) {
        const forwardEval = evaluatePreviewPath(forwardPath, routeMap, getLocationName);
        cases.push({
          id: 'selection-order',
          title: 'Theo thứ tự đang chọn',
          description: 'Đi từ điểm đầu đến điểm cuối theo cấu trúc hiện tại.',
          path: forwardPath,
          ...forwardEval,
        });
      }

      const reversePath = buildReverseMiddlePath(selectedIds, startId, endId);
      if (reversePath.length > 1) {
        const reverseEval = evaluatePreviewPath(reversePath, routeMap, getLocationName);
        cases.push({
          id: 'reverse-order',
          title: 'Đảo phần thân hành trình',
          description: 'Giữ nguyên hai đầu mút, chỉ đổi thứ tự các điểm ở giữa.',
          path: reversePath,
          ...reverseEval,
        });
      }

      const greedyPath = buildNearestNeighborTrial(selectedIds, startId, endId, appMode, routeMap);
      if (greedyPath.length > 1) {
        const greedyEval = evaluatePreviewPath(greedyPath, routeMap, getLocationName);
        cases.push({
          id: 'greedy-path',
          title: 'Ghép cạnh gần nhất',
          description: 'Thử nhanh một đường đi tham khảo trước khi giải tối ưu.',
          path: greedyPath,
          ...greedyEval,
        });
      }
    }

    if (appMode === 'subset' && startId && endId) {
      const directPath = [startId, endId];
      const directEval = evaluatePreviewPath(directPath, routeMap, getLocationName);
      cases.push({
        id: 'direct-hop',
        title: 'Đi thẳng hai đầu mút',
        description: 'Kiểm tra nhanh xem có cạnh trực tiếp giữa hai điểm hay không.',
        path: directPath,
        ...directEval,
      });

      const transferCandidates = selectedIds
        .filter(id => id !== startId && id !== endId)
        .map(id => ({
          id,
          first: routeMap.get(buildRouteKey(startId, id)) ?? null,
          second: routeMap.get(buildRouteKey(id, endId)) ?? null,
        }))
        .filter((entry): entry is { id: string; first: Route; second: Route } => Boolean(entry.first && entry.second))
        .sort((left, right) => (left.first.distanceKm + left.second.distanceKm) - (right.first.distanceKm + right.second.distanceKm));

      if (transferCandidates.length > 0) {
        const bestTransfer = transferCandidates[0];
        const transferPath = [startId, bestTransfer.id, endId];
        const transferEval = evaluatePreviewPath(transferPath, routeMap, getLocationName);
        cases.push({
          id: 'one-transfer',
          title: 'Đi qua một điểm trung chuyển',
          description: 'Xem thử một phương án nối hai đầu mút bằng một điểm đệm.',
          path: transferPath,
          ...transferEval,
        });
      }

      const orderedSubsetPath = [startId, ...selectedIds.filter(id => id !== startId && id !== endId), endId];
      if (orderedSubsetPath.length > 1) {
        const orderedSubsetEval = evaluatePreviewPath(orderedSubsetPath, routeMap, getLocationName);
        cases.push({
          id: 'selection-order',
          title: 'Theo thứ tự đang chọn',
          description: 'Giữ nguyên thứ tự chọn để so sánh với lời giải ngắn nhất.',
          path: orderedSubsetPath,
          ...orderedSubsetEval,
        });
      }
    }

    return cases;
  }, [appMode, endId, getLocationName, routeMap, selectedIds, startId]);

  useEffect(() => {
    setActivePreviewCaseId(previewCases[0]?.id ?? 'selection-order');
  }, [previewCases, stage]);

  const activePreviewCase = useMemo(
    () => previewCases.find(item => item.id === activePreviewCaseId) ?? previewCases[0] ?? null,
    [activePreviewCaseId, previewCases],
  );

  const activePath = useMemo(() => {
    if (stage === 'result' && result) {
      return appMode === 'cycle' ? (result.shortestCycles[0] ?? []) : result.shortestPath;
    }

    return activePreviewCase?.valid ? activePreviewCase.path : [];
  }, [activePreviewCase, appMode, result, stage]);

  const highlightedPaths = useMemo(
    () => (activePath.length > 0 ? [activePath] : []),
    [activePath],
  );

  const displayRoutes = useMemo(() => {
    if (stage !== 'result' || activePath.length < 2) return routes;

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
  }, [activePath, routes, stage]);

  const getSegmentDistance = useCallback((fromId: string, toId: string) => {
    const route = routes.find(
      current => (current.from === fromId && current.to === toId) || (current.to === fromId && current.from === toId),
    );
    return route?.distanceKm ?? null;
  }, [routes]);

  const MODE_LABEL = {
    cycle: { label: 'Bài 1 — Chu Trình Hamilton', color: 'bg-indigo-600' },
    path:  { label: 'Bài 2 — Đường Đi Hamilton',  color: 'bg-rose-600' },
    subset:{ label: 'Bài 3 — Đường Đi Ngắn Nhất', color: 'bg-amber-600' },
  };

  const possibleEdgeCount = Math.max((locations.length * (locations.length - 1)) / 2, 1);
  const graphDensity = Math.min((routes.length / possibleEdgeCount) * 100, 100);
  const startDegree = routes.filter(route => route.from === startId || route.to === startId).length;
  const previewIntro = appMode === 'subset'
    ? 'Bước xem trước này cho phép quan sát tập điểm đang chọn, các cạnh sẵn có và thử nhanh một vài phương án nối hai đầu mút.'
    : 'Bước xem trước này cho phép kiểm tra các điểm, các cạnh và thử nhanh vài lộ trình trước khi chốt lời giải tối ưu.';
  const remainingCycles = useMemo(() => {
    if (stage !== 'result' || appMode !== 'cycle' || !result) return [];
    return result.allCycles.filter(cycle => !arePathsEqual(cycle.path, activePath));
  }, [activePath, appMode, result, stage]);

  useEffect(() => {
    if (stage !== 'result' || appMode !== 'cycle') {
      setShowRemainingCycles(false);
    }
  }, [appMode, stage]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 shrink-0 flex-wrap">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          {stage === 'result' ? 'Quay lại xem trước' : 'Quay lại chỉnh điểm'}
        </button>
        <div className={`text-xs font-bold text-white px-2.5 py-1 rounded-full ${MODE_LABEL[appMode].color}`}>
          {MODE_LABEL[appMode].label}
        </div>
        <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${stage === 'result' ? 'bg-slate-900 text-white' : 'bg-sky-50 text-sky-700 border border-sky-200'}`}>
          {stage === 'result' ? 'Bước 3 — Kết quả cuối' : 'Bước 2 — Xem trước đồ thị'}
        </div>

        {/* ⭐ Ràng buộc cốt lõi — badge nổi bật */}
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          {appMode === 'subset' ? 'Không cần đi qua tất cả điểm' : 'Mỗi điểm chỉ đi qua 1 lần'}
        </div>

        <div className="text-xs text-slate-500 ml-auto">
          {locations.length} điểm · {stage === 'result' ? `${displayRoutes.length} chặng thuộc kết quả` : `${routes.length} cạnh đang hiển thị`}
        </div>

        {stage === 'preview' && (
          <button
            onClick={onSolve}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
          >
            <Play className="w-3.5 h-3.5" /> Giải bài toán
          </button>
        )}

        <button
          onClick={() => setIsPresentationOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          title="Mở trình chiếu lộ trình"
        >
          <Clapperboard className="w-3.5 h-3.5" /> Trình chiếu
        </button>

        {stage === 'result' ? (
          <button onClick={onRerun}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600">
            <RotateCcw className="w-3.5 h-3.5" /> Giải lại
          </button>
        ) : (
          <button
            onClick={() => setActivePreviewCaseId(previewCases[0]?.id ?? 'selection-order')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Làm mới xem trước
          </button>
        )}
      </div>

      {isPresentationOpen && typeof document !== 'undefined' && createPortal(
        <RoutePresentationModal
          open={isPresentationOpen}
          onClose={() => setIsPresentationOpen(false)}
          locations={locations}
          routes={routes}
          appMode={appMode}
          startId={startId}
          endId={endId}
          activePath={activePath}
          totalDistanceKm={stage === 'result' && result ? result.totalDistanceKm : activePreviewCase?.totalDistanceKm ?? 0}
        />,
        document.body,
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden p-3 gap-2 min-w-0">
          <div className="relative flex-1 overflow-hidden">
            <MapCanvas
              locations={locations}
              routes={displayRoutes}
              appMode={appMode}
              uiMode="view"
              startId={startId}
              endId={endId}
              selectedSubset={locations.map(l => l.id)}
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
              allowedTileThemes={['light', 'voyager', 'dark']}
              compactMapControls
            />
            <div className="absolute bottom-3 left-3 z-[610] w-[22rem] max-h-[calc(100%-1.5rem)] overflow-y-auto rounded-[24px] border border-white/70 bg-white/94 p-3 shadow-[0_16px_34px_rgba(15,23,42,0.16)] backdrop-blur">
              <LocationInsightPanel
                selectedElement={selectedElement}
                locations={locations}
                routes={displayRoutes}
                appMode={appMode}
              />
            </div>
          </div>
        </main>

        <aside className="w-[25rem] bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {stage === 'result' ? 'Kết quả lộ trình' : 'Xem trước bài toán'}
            </div>
            {stage === 'result' && result ? (
              <>
                <div className="mt-3">
                  <PathDisplay
                    path={activePath}
                    totalKm={result.totalDistanceKm}
                    locations={locations}
                    appMode={appMode}
                    allCount={1}
                  />
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-slate-100 bg-white">
                  <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Lộ trình đại diện
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {activePath.slice(0, -1).map((nodeId, index) => {
                        const nextId = activePath[index + 1];
                        const distance = getSegmentDistance(nodeId, nextId);
                        return (
                          <tr key={`${nodeId}-${nextId}-${index}`} className="border-b border-slate-50 last:border-b-0">
                            <td className="w-10 px-3 py-2 font-mono text-[10px] text-slate-400">{index + 1}.</td>
                            <td className="px-3 py-2 text-slate-700">
                              <span className="font-semibold">{getLocationName(nodeId)}</span>
                              <span className="mx-2 text-slate-300">→</span>
                              <span className="font-semibold">{getLocationName(nextId)}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-slate-500">
                              {distance !== null ? `${distance.toFixed(1)} km` : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-sky-100 bg-sky-50 px-3 py-3 text-xs leading-6 text-sky-800">
                  {previewIntro}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Điểm</div>
                    <div className="mt-1 text-2xl font-black text-slate-900">{locations.length}</div>
                    <div className="text-slate-500">đang được đưa vào bài toán</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cạnh</div>
                    <div className="mt-1 text-2xl font-black text-slate-900">{routes.length}</div>
                    <div className="text-slate-500">cạnh hiện có trong đồ thị con</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mật độ</div>
                    <div className="mt-1 text-2xl font-black text-slate-900">{graphDensity.toFixed(0)}%</div>
                    <div className="text-slate-500">mức độ liên kết giữa các điểm</div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bậc của điểm đầu</div>
                    <div className="mt-1 text-2xl font-black text-slate-900">{startDegree}</div>
                    <div className="text-slate-500">cạnh chạm vào điểm xuất phát</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 text-xs leading-6 text-slate-600">
                  <div><span className="font-bold text-slate-800">Xuất phát:</span> {getLocationName(startId)}</div>
                  {endId && <div><span className="font-bold text-slate-800">Kết thúc:</span> {getLocationName(endId)}</div>}
                  <div><span className="font-bold text-slate-800">Bản đồ đang tô sáng:</span> {activePreviewCase?.title ?? 'Chưa có tình huống thử hợp lệ'}</div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
                  <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Chạy thử vài trường hợp
                  </div>
                  <div className="max-h-[26rem] space-y-2 overflow-y-auto p-2">
                    {previewCases.map(item => (
                      <button
                        key={item.id}
                        onClick={() => setActivePreviewCaseId(item.id)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition-colors ${
                          activePreviewCase?.id === item.id
                            ? 'border-sky-300 bg-sky-50'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{item.title}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-500">{item.description}</div>
                          </div>
                          <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${item.valid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {item.valid ? (item.totalDistanceKm !== null ? `${item.totalDistanceKm.toFixed(1)} km` : 'Hợp lệ') : 'Thiếu cạnh'}
                          </div>
                        </div>
                        <div className="mt-2 text-[11px] font-semibold text-slate-700">
                          {item.path.map((nodeId, index) => (
                            <React.Fragment key={`${item.id}-${nodeId}-${index}`}>
                              <span>{locations.find(location => location.id === nodeId)?.label.split('\n')[0] ?? nodeId}</span>
                              {index < item.path.length - 1 && <span className="mx-1 text-slate-300">→</span>}
                            </React.Fragment>
                          ))}
                        </div>
                        <div className={`mt-2 text-xs leading-5 ${item.valid ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {item.note}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={onSolve}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-emerald-700"
                >
                  <Play className="h-4 w-4" /> Giải bài toán và ra kết quả cuối
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {stage === 'result' && appMode === 'cycle' && remainingCycles.length > 0 && (
        <section className="shrink-0 border-t border-slate-200 bg-[#f8f6f1] px-4 py-4">
          <div className="rounded-[28px] border border-[#e5ddd0] bg-white/92 shadow-[0_16px_34px_rgba(15,23,42,0.06)]">
            <button
              onClick={() => setShowRemainingCycles(current => !current)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Các chu trình còn lại
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  Tách riêng xuống dưới để lướt ngang các trường hợp phụ.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                  {remainingCycles.length} chu trình
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showRemainingCycles ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showRemainingCycles && (
              <div className="border-t border-slate-100 px-4 py-4">
                <div className="overflow-x-auto no-scrollbar">
                  <div className="flex gap-4">
                    {remainingCycles.map((cycle, index) => (
                      <div
                        key={`${cycle.path.join('>')}-${index}`}
                        className="w-[320px] shrink-0 snap-start rounded-[24px] border border-slate-100 bg-slate-50/80 p-3"
                      >
                        <MiniCycleMap
                          locations={locations}
                          routes={routes}
                          appMode={appMode}
                          startId={startId}
                          path={cycle.path}
                        />
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">
                            TH {index + 2}
                          </span>
                          <span className="text-base font-black text-slate-900">
                            {cycle.weight.toFixed(1)} km
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};
