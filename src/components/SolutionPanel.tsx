import React from 'react';
import { TouristLocation, Route, AlgorithmResult, AlgorithmStep, AppMode } from '../types';
import { MapCanvas } from './MapCanvas';
import { PathDisplay } from './PathDisplay';

interface SolutionPanelProps {
  result: AlgorithmResult | null;
  currentStepIdx: number;
  appMode: AppMode;
  locations: TouristLocation[];
  routes: Route[];
  detailMode: 'result' | 'method';
  showResolvedPathHeader?: boolean;
}

const STEP_COLORS = {
  visit: 'border-l-emerald-400 bg-emerald-50',
  backtrack: 'border-l-red-400 bg-red-50',
  found: 'border-l-blue-400 bg-blue-50',
  no_solution: 'border-l-slate-400 bg-slate-50',
  inspect: 'border-l-amber-400 bg-amber-50',
  update: 'border-l-sky-400 bg-sky-50',
};

const STEP_ICONS = {
  visit: '▶',
  backtrack: '↩',
  found: '✓',
  no_solution: '✗',
  inspect: '◌',
  update: '⟳',
};

const SUBSET_STATUS_META = {
  current: {
    label: 'Đang chốt',
    rowClass: 'bg-amber-50',
    badgeClass: 'bg-amber-100 text-amber-700',
  },
  settled: {
    label: 'Đã chốt',
    rowClass: 'bg-emerald-50/60',
    badgeClass: 'bg-emerald-100 text-emerald-700',
  },
  frontier: {
    label: 'Đã có nhãn',
    rowClass: 'bg-sky-50/60',
    badgeClass: 'bg-sky-100 text-sky-700',
  },
  unreached: {
    label: 'Chưa với tới',
    rowClass: '',
    badgeClass: 'bg-slate-100 text-slate-500',
  },
  target: {
    label: 'Đích đang theo dõi',
    rowClass: 'bg-violet-50/70',
    badgeClass: 'bg-violet-100 text-violet-700',
  },
};

function MiniVariantMap({
  path,
  locations,
  routes,
  appMode,
}: {
  path: string[];
  locations: TouristLocation[];
  routes: Route[];
  appMode: AppMode;
}) {
  const variantRoutes = routes.filter(route => {
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
  });

  const uniqueLocationIds = Array.from(new Set(path));
  const variantLocations = locations.filter(location => uniqueLocationIds.includes(location.id));
  return (
    <div className="pointer-events-none h-[154px] w-full overflow-hidden rounded-[20px] border border-slate-200 bg-slate-50">
      <MapCanvas
        locations={variantLocations}
        routes={variantRoutes}
        appMode={appMode}
        uiMode="view"
        startId=""
        endId={null}
        selectedSubset={variantLocations.map(location => location.id)}
        currentStep={null}
        highlightedPaths={[]}
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
        defaultShowMapBackground
        defaultTileTheme="light"
        allowedTileThemes={['light']}
      />
    </div>
  );
}

export const SolutionPanel: React.FC<SolutionPanelProps> = ({
  result, currentStepIdx, appMode, locations, routes, detailMode, showResolvedPathHeader = true,
}) => {
  const currentStep: AlgorithmStep | undefined = result?.steps[currentStepIdx];
  const shouldShowResolvedPathHeader = showResolvedPathHeader && (detailMode === 'result' || appMode !== 'subset');

  const getSegmentDist = (fromId: string, toId: string): number | null => {
    const r = routes.find(
      rt => (rt.from === fromId && rt.to === toId) || (rt.to === fromId && rt.from === toId)
    );
    return r ? r.distanceKm : null;
  };

  const getName = (id: string) => locations.find(l => l.id === id)?.fullName ?? id;
  const formatDistance = (distanceKm: number | null) => (
    distanceKm === null ? '∞' : `${distanceKm.toFixed(1)} km`
  );

  if (!result) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-400">
        <div className="mb-3 text-4xl">🗺️</div>
        <div className="mb-1 text-sm font-semibold text-slate-500">Chưa có kết quả</div>
        <div className="text-xs leading-relaxed">
          Chọn điểm xuất phát bên trái và nhấn{' '}
          <span className="font-bold text-slate-600">"Tìm Lộ Trình"</span>
        </div>
      </div>
    );
  }

  const activePath =
    appMode === 'cycle'
      ? result.shortestCycles[0] ?? []
      : result.shortestPath;
  const bestWeight = result.totalDistanceKm;
  const variants = appMode === 'cycle' ? result.allCycles : appMode === 'path' ? result.allPaths : [];
  const secondaryVariants = variants.filter(variant => Math.abs(variant.weight - bestWeight) >= 0.001);
  const subsetPriorityQueue = appMode === 'subset' && currentStep?.distanceSnapshot
    ? [...currentStep.distanceSnapshot]
      .filter(snapshot => snapshot.distanceKm !== null && snapshot.status !== 'settled' && snapshot.status !== 'current')
      .sort((left, right) => (left.distanceKm ?? Number.POSITIVE_INFINITY) - (right.distanceKm ?? Number.POSITIVE_INFINITY))
    : [];

  const getShort = (id: string) => {
    const label = locations.find(l => l.id === id)?.label ?? id;
    return label.split('\n')[0];
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {shouldShowResolvedPathHeader && (
        <div className="border-b border-slate-100 p-3">
          {result.found ? (
            <PathDisplay
              path={activePath}
              totalKm={result.totalDistanceKm}
              locations={locations}
              appMode={appMode}
              allCount={1}
            />
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
              <span>✗</span>
              <span>{appMode === 'cycle' ? 'Không tìm thấy chu trình Hamilton' : appMode === 'path' ? 'Không tìm thấy đường đi Hamilton' : 'Không tìm thấy đường đi ngắn nhất'}</span>
            </div>
          )}
        </div>
      )}

      {detailMode === 'result' ? (
        !result.found ? (
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-6 text-red-700">
              <div className="font-bold">Không có lời giải</div>
              <div className="mt-1">
                {appMode === 'cycle'
                  ? 'Không tồn tại chu trình Hamilton trong đồ thị này. Thử chọn bộ điểm khác hoặc thêm tuyến đường kết nối.'
                  : appMode === 'path'
                    ? 'Không tồn tại đường đi Hamilton từ điểm đầu đến điểm cuối.'
                    : 'Không tồn tại đường đi nối hai đầu mút trong đồ thị hiện tại.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">

            {/* ── BẢNG TOÀN BỘ CHU TRÌNH (chỉ Bài 1) ── */}
            {appMode === 'cycle' && result.allCycles.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Toàn bộ chu trình Hamilton ({result.allCycles.length} phương án)
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="px-2 py-1 text-left font-semibold text-slate-400">#</th>
                        <th className="px-2 py-1 text-left font-semibold text-slate-400">Chu trình</th>
                        <th className="px-2 py-1 text-right font-semibold text-slate-400">km</th>
                        <th className="px-2 py-1 text-center font-semibold text-slate-400"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.allCycles.map((cycle, idx) => {
                        const isOptimal = Math.abs(cycle.weight - result.totalDistanceKm) < 0.001;
                        // Hiển thị các node không lặp (cắt node cuối trùng với node đầu)
                        const nodes = cycle.path.length > 1 && cycle.path[0] === cycle.path[cycle.path.length - 1]
                          ? cycle.path.slice(0, -1)
                          : cycle.path;
                        return (
                          <tr
                            key={idx}
                            className={`border-b border-slate-50 ${isOptimal ? 'bg-emerald-50/60' : ''}`}
                          >
                            <td className="px-2 py-1 font-mono text-slate-400">{idx + 1}.</td>
                            <td className="px-2 py-1 text-slate-700">
                              {nodes.map((id, ni) => (
                                <React.Fragment key={ni}>
                                  <span className={isOptimal ? 'font-semibold text-emerald-800' : ''}>{getShort(id)}</span>
                                  {ni < nodes.length - 1 && <span className="mx-0.5 text-slate-300">→</span>}
                                </React.Fragment>
                              ))}
                              <span className="mx-0.5 text-slate-300">→</span>
                              <span className={`italic ${isOptimal ? 'text-emerald-700' : 'text-slate-400'}`}>↩{getShort(nodes[0])}</span>
                            </td>
                            <td className={`whitespace-nowrap px-2 py-1 text-right font-semibold ${isOptimal ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {cycle.weight.toFixed(1)}
                            </td>
                            <td className="px-2 py-1 text-center">
                              {isOptimal && <span className="text-emerald-600">★</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── PHƯƠNG ÁN ĐẠI DIỆN (tối ưu) ── */}
            <div className="overflow-hidden rounded-xl border border-emerald-100 bg-white">
              <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/40 px-3 py-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                  {appMode === 'cycle' ? 'Chu trình tối ưu — phương án đại diện' : appMode === 'subset' ? 'Đường đi ngắn nhất' : 'Đường đi tối ưu'}
                </div>
                <div className="text-xs font-black text-emerald-700">
                  {result.totalDistanceKm.toFixed(1)} km
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[28rem] text-xs">
                  <tbody>
                    {activePath.slice(0, -1).map((nodeId, segIdx) => {
                      const nextId = activePath[segIdx + 1];
                      const dist = getSegmentDist(nodeId, nextId);
                      const isCycleReturn = appMode === 'cycle' && segIdx === activePath.length - 2;
                      return (
                        <tr
                          key={segIdx}
                          className={`border-b border-slate-50 ${isCycleReturn ? 'bg-slate-50/60' : ''}`}
                        >
                          <td className="w-5 px-2 py-1.5 font-mono text-[9px] text-slate-300">
                            {segIdx + 1}.
                          </td>
                          <td className="px-2 py-1.5 text-slate-700">
                            <span className="font-semibold">{getName(nodeId)}</span>
                            <span className="mx-1 text-slate-400">→</span>
                            <span className={`font-semibold ${isCycleReturn ? 'italic text-slate-500' : ''}`}>
                              {isCycleReturn && '↩ '}{getName(nextId)}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-2 py-1.5 text-right font-semibold text-slate-500">
                            {dist !== null ? `${dist.toFixed(1)} km` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-emerald-100 bg-emerald-50">
                      <td colSpan={2} className="px-2 py-2 text-xs font-bold text-emerald-700">
                        Tổng cộng
                      </td>
                      <td className="px-2 py-2 text-right text-sm font-black text-emerald-800">
                        {result.totalDistanceKm.toFixed(1)} km
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-[10px] leading-5 text-slate-600">
              <span className="font-bold text-slate-700">Lớp 2 — Diễn giải cách làm: </span>
              {appMode === 'subset'
                ? <>Bấm tab <strong>Cách giải</strong> để xem các bước chốt khoảng cách ngắn nhất của thuật toán.</>
                : <>Bấm tab <strong>Liệt kê phương án</strong> để xem toàn bộ phương án hợp lệ đã được sắp theo tổng quãng đường.</>}
            </div>
          </div>
        )
      ) : appMode === 'cycle' || appMode === 'path' ? (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-[10px] leading-5 text-slate-600">
            <span className="font-bold text-slate-700">Cách làm: </span>
            {appMode === 'cycle'
              ? 'liệt kê toàn bộ chu trình Hamilton hợp lệ, sau đó sắp theo tổng quãng đường để chọn chu trình ngắn nhất.'
              : 'liệt kê toàn bộ đường đi Hamilton hợp lệ từ điểm đầu đến điểm cuối, sau đó sắp theo tổng quãng đường để chọn đường đi ngắn nhất.'}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {appMode === 'cycle'
                  ? `Toàn bộ phương án hợp lệ (${result.allCycles.length} chu trình)`
                  : `Toàn bộ phương án hợp lệ (${result.allPaths.length} đường đi)`}
              </div>
              <div className="text-[10px] text-slate-400">Sắp theo km tăng dần</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-2 py-1 text-left font-semibold text-slate-400">#</th>
                    <th className="px-2 py-1 text-left font-semibold text-slate-400">Phương án</th>
                    <th className="px-2 py-1 text-right font-semibold text-slate-400">km</th>
                    <th className="px-2 py-1 text-center font-semibold text-slate-400">Đánh dấu</th>
                  </tr>
                </thead>
                <tbody>
                  {(appMode === 'cycle' ? result.allCycles : result.allPaths).map((variant, idx) => {
                    const isOptimal = Math.abs(variant.weight - bestWeight) < 0.001;
                    const nodes = appMode === 'cycle' && variant.path.length > 1 && variant.path[0] === variant.path[variant.path.length - 1]
                      ? variant.path.slice(0, -1)
                      : variant.path;

                    return (
                      <tr
                        key={`${variant.path.join('>')}-${idx}`}
                        className={`border-b border-slate-50 ${isOptimal ? 'bg-emerald-50/60' : ''}`}
                      >
                        <td className="px-2 py-1 font-mono text-slate-400">{idx + 1}.</td>
                        <td className="px-2 py-1 text-slate-700">
                          {nodes.map((id, nodeIndex) => (
                            <React.Fragment key={`${id}-${nodeIndex}`}>
                              <span className={isOptimal ? 'font-semibold text-emerald-800' : ''}>{getShort(id)}</span>
                              {nodeIndex < nodes.length - 1 && <span className="mx-0.5 text-slate-300">→</span>}
                            </React.Fragment>
                          ))}
                          {appMode === 'cycle' && nodes.length > 0 && (
                            <>
                              <span className="mx-0.5 text-slate-300">→</span>
                              <span className={`italic ${isOptimal ? 'text-emerald-700' : 'text-slate-400'}`}>↩{getShort(nodes[0])}</span>
                            </>
                          )}
                        </td>
                        <td className={`whitespace-nowrap px-2 py-1 text-right font-semibold ${isOptimal ? 'text-emerald-700' : 'text-slate-500'}`}>
                          {variant.weight.toFixed(1)}
                        </td>
                        <td className="px-2 py-1 text-center text-slate-500">
                          {isOptimal ? <span className="font-bold text-emerald-700">Tối ưu</span> : 'Hợp lệ'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {secondaryVariants.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {appMode === 'cycle' ? 'Mini map các chu trình phụ' : 'Mini map các phương án phụ'}
                  </div>
                  <div className="text-[10px] text-slate-400">{secondaryVariants.length} phương án</div>
                </div>
                <div className="overflow-x-auto no-scrollbar px-3 py-3">
                  <div className="flex gap-4">
                    {secondaryVariants.map((variant, index) => (
                      <div
                        key={`${variant.path.join('>')}-${index}`}
                        className="w-[320px] shrink-0 rounded-[24px] border border-slate-100 bg-slate-50/80 p-3"
                      >
                        <MiniVariantMap
                          path={variant.path}
                          locations={locations}
                          routes={routes}
                          appMode={appMode}
                        />
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">
                            TH {index + 2}
                          </span>
                          <span className="text-base font-black text-slate-900">
                            {variant.weight.toFixed(1)} km
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {appMode === 'subset' ? (
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] leading-5 text-slate-600">
                Dijkstra: chọn đỉnh có $d$ nhỏ nhất, xét các cạnh kề, cập nhật nhãn nếu tìm được đường ngắn hơn.
              </div>

              {currentStep && (
                <div className={`rounded-r-lg border-l-4 px-3 py-2 text-xs leading-relaxed fade-in-up ${STEP_COLORS[currentStep.type]}`}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {currentStep.phaseLabel ?? 'Bước hiện tại'}
                    </div>
                    <div className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                      {currentStepIdx + 1} / {result.steps.length}
                    </div>
                  </div>
                  <div>
                    <span className="mr-1 font-bold">{STEP_ICONS[currentStep.type]}</span>
                    {currentStep.explanation}
                  </div>
                </div>
              )}

              <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Hàng đợi</div>
                  <div className="text-[10px] text-slate-400">Theo $d$ tăng dần</div>
                </div>
                {subsetPriorityQueue.length > 0 ? (
                  <div className="max-h-40 overflow-y-auto">
                    <table className="w-full text-[10px]">
                      <tbody>
                    {subsetPriorityQueue.map((snapshot, index) => (
                        <tr key={snapshot.nodeId} className="border-b border-slate-50 last:border-b-0">
                          <td className="px-3 py-2 font-mono text-slate-400">{index + 1}</td>
                          <td className="px-2 py-2 font-semibold text-slate-700">{getShort(snapshot.nodeId)}</td>
                          <td className="px-2 py-2 text-right font-bold text-indigo-700">{formatDistance(snapshot.distanceKm)}</td>
                          <td className="px-3 py-2 text-right text-slate-400">{snapshot.previousNodeId ? getShort(snapshot.previousNodeId) : '—'}</td>
                        </tr>
                    ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="px-3 py-3 text-[10px] leading-5 text-slate-500">
                    Không còn đỉnh chờ.
                  </div>
                )}
              </div>

              {currentStep?.distanceSnapshot && (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nhãn điểm</div>
                    <div className="text-[10px] text-slate-400">$d$, trước, trạng thái</div>
                  </div>
                  <div className="max-h-52 overflow-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-2 py-1.5 text-left font-semibold text-slate-500">Điểm</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-slate-500">d</th>
                          <th className="px-2 py-1.5 text-center font-semibold text-slate-500">Trước</th>
                          <th className="px-2 py-1.5 text-center font-semibold text-slate-500">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentStep.distanceSnapshot.map(snapshot => {
                          const meta = SUBSET_STATUS_META[snapshot.status];
                          return (
                            <tr key={snapshot.nodeId} className={`border-b border-slate-50 ${meta.rowClass}`}>
                              <td className="px-2 py-1.5 text-slate-700 font-medium">{getShort(snapshot.nodeId)}</td>
                              <td className="px-2 py-1.5 text-right font-semibold text-slate-700">{formatDistance(snapshot.distanceKm)}</td>
                              <td className="px-2 py-1.5 text-center text-slate-500">
                                {snapshot.previousNodeId ? getShort(snapshot.previousNodeId) : '—'}
                              </td>
                              <td className="px-2 py-1.5 text-center">
                                <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${meta.badgeClass}`}>
                                  {meta.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {currentStep?.edgeEvaluations?.length ? (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cạnh vừa xét</div>
                    <div className="text-[10px] text-slate-400">Cũ → mới</div>
                  </div>
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-2 py-1.5 text-left font-semibold text-slate-500">Cạnh</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-slate-500">Cạnh</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-slate-500">d cũ</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-slate-500">d mới</th>
                          <th className="px-2 py-1.5 text-center font-semibold text-slate-500">Kết quả</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentStep.edgeEvaluations.map((evaluation, index) => (
                          <tr key={`${evaluation.fromId}-${evaluation.toId}-${index}`} className={`border-b border-slate-50 ${evaluation.accepted ? 'bg-sky-50/60' : ''}`}>
                            <td className="px-2 py-1.5 text-slate-700">
                              <span className="font-semibold">{getShort(evaluation.fromId)}</span>
                              <span className="mx-1 text-slate-300">→</span>
                              <span className="font-semibold">{getShort(evaluation.toId)}</span>
                            </td>
                            <td className="px-2 py-1.5 text-right text-slate-500">{evaluation.edgeDistanceKm.toFixed(1)} km</td>
                            <td className="px-2 py-1.5 text-right text-slate-500">{formatDistance(evaluation.previousBestKm)}</td>
                            <td className="px-2 py-1.5 text-right font-semibold text-slate-700">{evaluation.candidateDistanceKm.toFixed(1)} km</td>
                            <td className="px-2 py-1.5 text-center">
                              <span className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${evaluation.accepted ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-600'}`}>
                                {evaluation.accepted ? 'Cập nhật' : 'Giữ'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl border border-slate-100 bg-white px-3 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Nhật ký ({result.steps.length} bước)
                  </div>
                  <div className="text-[10px] text-slate-400">Tóm tắt</div>
                </div>
                <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/70 p-1.5">
                  {result.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`mb-1 rounded border-l-2 px-2 py-1 text-[10px] leading-4 transition-colors last:mb-0 ${
                        idx === currentStepIdx
                          ? `${STEP_COLORS[step.type]} border-l-current font-semibold`
                          : 'border-l-transparent text-slate-500 hover:bg-white'
                      }`}
                    >
                      <span className="mr-1 font-mono text-slate-400">{idx + 1}.</span>
                      {STEP_ICONS[step.type]} {step.phaseLabel ?? step.explanation}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              {currentStep && (
                <div className={`mx-3 mt-2 rounded-r-lg border-l-4 px-3 py-2 text-xs leading-relaxed fade-in-up ${STEP_COLORS[currentStep.type]}`}>
                  <span className="mr-1 font-bold">{STEP_ICONS[currentStep.type]}</span>
                  {currentStep.explanation}
                </div>
              )}

              {currentStep && (
                <div className="mx-3 mt-2 overflow-hidden rounded-xl border border-slate-100">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[26rem] text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-2 py-1.5 text-left font-semibold text-slate-500">
                            Địa điểm tham gia
                          </th>
                          <th className="px-2 py-1.5 text-center font-semibold text-slate-500">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locations.map((loc, i) => {
                          const inPath = currentStep.path.includes(loc.id);
                          const isCurrent = currentStep.currentNodeId === loc.id;
                          const isBacktracking = currentStep.isBacktracking && isCurrent;
                          const visitIdx = currentStep.path.indexOf(loc.id);
                          const visitOrder = visitIdx >= 0 ? visitIdx + 1 : null;

                          let status = 'Chưa thăm';
                          let statusClass = 'text-slate-400';
                          let dot = <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-200" />;

                          if (isCurrent && !isBacktracking) {
                            status = 'Đang thăm';
                            statusClass = 'font-bold text-amber-600';
                            dot = <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />;
                          } else if (isCurrent && isBacktracking) {
                            status = 'Quay lui';
                            statusClass = 'font-bold text-red-500';
                            dot = <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />;
                          } else if (inPath) {
                            status = `Đã thăm (lần ${visitOrder})`;
                            statusClass = 'font-bold text-emerald-600';
                            dot = <span className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />;
                          }

                          return (
                            <tr
                              key={loc.id}
                              className={`border-b border-slate-50 transition-colors ${
                                isCurrent ? 'bg-amber-50' : inPath ? 'bg-emerald-50/40' : ''
                              }`}
                            >
                              <td className="px-2 py-1 text-slate-700">
                                <span className="mr-1 font-mono text-[9px] text-slate-300">{i + 1}.</span>
                                <span>{getName(loc.id)}</span>
                              </td>
                              <td className={`whitespace-nowrap px-2 py-1 text-center ${statusClass}`}>
                                <span className="inline-flex items-center justify-center">{dot}{status}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700 border-t border-emerald-100">
                    ✓ Thuật toán đảm bảo mỗi điểm chỉ được thăm đúng 1 lần
                  </div>
                </div>
              )}
            </>
          )}

          {appMode !== 'subset' && (
            <div className="mt-2 px-3 pb-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Nhật ký ({result.steps.length} bước)
                </div>
                <div className="text-[10px] text-slate-400">Cuộn để xem thêm</div>
              </div>
              <div className="max-h-[18rem] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/70 p-1.5 md:max-h-[240px]">
                {result.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className={`mb-1 rounded border-l-2 px-2 py-1 text-[10px] leading-4 transition-colors last:mb-0 ${
                      idx === currentStepIdx
                        ? `${STEP_COLORS[step.type]} border-l-current font-semibold`
                        : 'border-l-transparent text-slate-500 hover:bg-white'
                    }`}
                  >
                    <span className="mr-1 font-mono text-slate-400">{idx + 1}.</span>
                    {STEP_ICONS[step.type]} {step.explanation}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
