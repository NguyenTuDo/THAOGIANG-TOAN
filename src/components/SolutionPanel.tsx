import React from 'react';
import { TouristLocation, Route, AlgorithmResult, AlgorithmStep, AppMode } from '../types';
import { useLang } from '../contexts/LanguageContext';
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

const SUBSET_STATUS_STYLE = {
  current:  { rowClass: 'bg-amber-50',       badgeClass: 'bg-amber-100 text-amber-700'   },
  settled:  { rowClass: 'bg-emerald-50/60',  badgeClass: 'bg-emerald-100 text-emerald-700' },
  frontier: { rowClass: 'bg-sky-50/60',      badgeClass: 'bg-sky-100 text-sky-700'       },
  unreached:{ rowClass: '',                  badgeClass: 'bg-slate-100 text-slate-500'   },
  target:   { rowClass: 'bg-violet-50/70',   badgeClass: 'bg-violet-100 text-violet-700' },
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
  const { t } = useLang();
  const currentStep: AlgorithmStep | undefined = result?.steps[currentStepIdx];

  const SUBSET_STATUS_META = {
    current:  { ...SUBSET_STATUS_STYLE.current,   label: t('Đang chốt', 'Processing') },
    settled:  { ...SUBSET_STATUS_STYLE.settled,   label: t('Đã chốt', 'Settled')     },
    frontier: { ...SUBSET_STATUS_STYLE.frontier,  label: t('Đã có nhãn', 'Labelled') },
    unreached:{ ...SUBSET_STATUS_STYLE.unreached, label: t('Chưa với tới', 'Unreached') },
    target:   { ...SUBSET_STATUS_STYLE.target,    label: t('Đích đang theo dõi', 'Target') },
  };
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
        <div className="mb-1 text-sm font-semibold text-slate-500">{t('Chưa có kết quả', 'No result yet')}</div>
        <div className="text-xs leading-relaxed">
          {t('Chọn điểm xuất phát bên trái và nhấn', 'Choose a start point on the left and press')}{' '}
          <span className="font-bold text-slate-600">{t('"Tìm Lộ Trình"', '"Find Route"')}</span>
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
              <span>{appMode === 'cycle' ? t('Không tìm thấy chu trình Hamilton', 'No Hamiltonian cycle found') : appMode === 'path' ? t('Không tìm thấy đường đi Hamilton', 'No Hamiltonian path found') : t('Không tìm thấy đường đi ngắn nhất', 'No shortest path found')}</span>
            </div>
          )}
        </div>
      )}

      {detailMode === 'result' ? (
        !result.found ? (
          <div className="flex-1 overflow-y-auto px-3 py-3">
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs leading-6 text-red-700">
              <div className="font-bold">{t('Không có lời giải', 'No solution')}</div>
              <div className="mt-1">
                {appMode === 'cycle'
                  ? t('Không tồn tại chu trình Hamilton trong đồ thị này. Thử chọn bộ điểm khác hoặc thêm tuyến đường kết nối.', 'No Hamiltonian cycle exists in this graph. Try a different set of stops or add more connecting routes.')
                  : appMode === 'path'
                    ? t('Không tồn tại đường đi Hamilton từ điểm đầu đến điểm cuối.', 'No Hamiltonian path exists from start to end.')
                    : t('Không tồn tại đường đi nối hai đầu mút trong đồ thị hiện tại.', 'No path connects the two endpoints in the current graph.')}
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
                    {t(`Toàn bộ chu trình Hamilton (${result.allCycles.length} phương án)`, `All Hamiltonian cycles (${result.allCycles.length} variants)`)}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[30rem] text-[10px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/60">
                        <th className="px-2 py-1 text-left font-semibold text-slate-400">#</th>
                        <th className="px-2 py-1 text-left font-semibold text-slate-400">{t('Chu trình', 'Cycle')}</th>
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
                  {appMode === 'cycle' ? t('Chu trình tối ưu — phương án đại diện', 'Optimal cycle — representative') : appMode === 'subset' ? t('Đường đi ngắn nhất', 'Shortest path') : t('Đường đi tối ưu', 'Optimal path')}
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
                        {t('Tổng cộng', 'Total')}
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
              <span className="font-bold text-slate-700">{t('Lớp 2 — Diễn giải cách làm: ', 'Layer 2 — How it works: ')}</span>
              {appMode === 'subset'
                ? <>{t('Bấm tab', 'Switch to the')} <strong>{t('Cách giải', 'Method')}</strong> {t('để xem các bước chốt khoảng cách ngắn nhất của thuật toán.', 'tab to see each step of the shortest-distance algorithm.')}</>
                : <>{t('Bấm tab', 'Switch to the')} <strong>{t('Liệt kê phương án', 'All variants')}</strong> {t('để xem toàn bộ phương án hợp lệ đã được sắp theo tổng quãng đường.', 'tab to see all valid variants sorted by total distance.')}</>}
            </div>
          </div>
        )
      ) : appMode === 'cycle' || appMode === 'path' ? (
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-[10px] leading-5 text-slate-600">
            <span className="font-bold text-slate-700">{t('Cách làm: ', 'Method: ')}</span>
            {appMode === 'cycle'
              ? t('liệt kê toàn bộ chu trình Hamilton hợp lệ, sau đó sắp theo tổng quãng đường để chọn chu trình ngắn nhất.', 'enumerate all valid Hamiltonian cycles, then sort by total distance to pick the shortest.')
              : t('liệt kê toàn bộ đường đi Hamilton hợp lệ từ điểm đầu đến điểm cuối, sau đó sắp theo tổng quãng đường để chọn đường đi ngắn nhất.', 'enumerate all valid Hamiltonian paths from start to end, then sort by total distance to pick the shortest.')}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                {appMode === 'cycle'
                  ? t(`Toàn bộ phương án hợp lệ (${result.allCycles.length} chu trình)`, `All valid variants (${result.allCycles.length} cycles)`)
                  : t(`Toàn bộ phương án hợp lệ (${result.allPaths.length} đường đi)`, `All valid variants (${result.allPaths.length} paths)`)}
              </div>
              <div className="text-[10px] text-slate-400">{t('Sắp theo km tăng dần', 'Sorted by km ascending')}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-[10px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-2 py-1 text-left font-semibold text-slate-400">#</th>
                    <th className="px-2 py-1 text-left font-semibold text-slate-400">{t('Phương án', 'Route')}</th>
                    <th className="px-2 py-1 text-right font-semibold text-slate-400">km</th>
                    <th className="px-2 py-1 text-center font-semibold text-slate-400">{t('Đánh dấu', 'Mark')}</th>
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
                          {isOptimal ? <span className="font-bold text-emerald-700">{t('Tối ưu', 'Optimal')}</span> : t('Hợp lệ', 'Valid')}
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
                    {appMode === 'cycle' ? t('Mini map các chu trình phụ', 'Mini map — other cycles') : t('Mini map các phương án phụ', 'Mini map — other variants')}
                  </div>
                  <div className="text-[10px] text-slate-400">{secondaryVariants.length} {t('phương án', 'variants')}</div>
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
                {t('Dijkstra: chọn đỉnh có $d$ nhỏ nhất, xét các cạnh kề, cập nhật nhãn nếu tìm được đường ngắn hơn.', 'Dijkstra: pick the node with smallest $d$, check adjacent edges, update label if a shorter path is found.')}
              </div>

              {currentStep && (
                <div className={`rounded-r-lg border-l-4 px-3 py-2 text-xs leading-relaxed fade-in-up ${STEP_COLORS[currentStep.type]}`}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      {currentStep.phaseLabel ?? t('Bước hiện tại', 'Current step')}
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
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('Hàng đợi', 'Queue')}</div>
                  <div className="text-[10px] text-slate-400">{t('Theo $d$ tăng dần', 'Sorted by $d$ ascending')}</div>
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
                    {t('Không còn đỉnh chờ.', 'No nodes waiting.')}
                  </div>
                )}
              </div>

              {currentStep?.distanceSnapshot && (
                <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('Nhãn điểm', 'Node labels')}</div>
                    <div className="text-[10px] text-slate-400">{t('$d$, trước, trạng thái', '$d$, prev, status')}</div>
                  </div>
                  <div className="max-h-52 overflow-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-2 py-1.5 text-left font-semibold text-slate-500">{t('Điểm', 'Node')}</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-slate-500">d</th>
                          <th className="px-2 py-1.5 text-center font-semibold text-slate-500">{t('Trước', 'Prev')}</th>
                          <th className="px-2 py-1.5 text-center font-semibold text-slate-500">{t('Trạng thái', 'Status')}</th>
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
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('Cạnh vừa xét', 'Edges evaluated')}</div>
                    <div className="text-[10px] text-slate-400">{t('Cũ → mới', 'Old → new')}</div>
                  </div>
                  <div className="max-h-48 overflow-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="px-2 py-1.5 text-left font-semibold text-slate-500">{t('Cạnh', 'Edge')}</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-slate-500">{t('Cạnh', 'Weight')}</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-slate-500">{t('d cũ', 'd old')}</th>
                          <th className="px-2 py-1.5 text-right font-semibold text-slate-500">{t('d mới', 'd new')}</th>
                          <th className="px-2 py-1.5 text-center font-semibold text-slate-500">{t('Kết quả', 'Result')}</th>
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
                                {evaluation.accepted ? t('Cập nhật', 'Updated') : t('Giữ', 'Kept')}
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
                    {t(`Nhật ký (${result.steps.length} bước)`, `Log (${result.steps.length} steps)`)}
                  </div>
                  <div className="text-[10px] text-slate-400">{t('Tóm tắt', 'Summary')}</div>
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
                            {t('Địa điểm tham gia', 'Stops in problem')}
                          </th>
                          <th className="px-2 py-1.5 text-center font-semibold text-slate-500">{t('Trạng thái', 'Status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locations.map((loc, i) => {
                          const inPath = currentStep.path.includes(loc.id);
                          const isCurrent = currentStep.currentNodeId === loc.id;
                          const isBacktracking = currentStep.isBacktracking && isCurrent;
                          const visitIdx = currentStep.path.indexOf(loc.id);
                          const visitOrder = visitIdx >= 0 ? visitIdx + 1 : null;

                          let status = t('Chưa thăm', 'Not visited');
                          let statusClass = 'text-slate-400';
                          let dot = <span className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-200" />;

                          if (isCurrent && !isBacktracking) {
                            status = t('Đang thăm', 'Visiting');
                            statusClass = 'font-bold text-amber-600';
                            dot = <span className="mr-1 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />;
                          } else if (isCurrent && isBacktracking) {
                            status = t('Quay lui', 'Backtracking');
                            statusClass = 'font-bold text-red-500';
                            dot = <span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-400" />;
                          } else if (inPath) {
                            status = t(`Đã thăm (lần ${visitOrder})`, `Visited (pass ${visitOrder})`);
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
                    ✓ {t('Thuật toán đảm bảo mỗi điểm chỉ được thăm đúng 1 lần', 'Algorithm guarantees each stop is visited exactly once')}
                  </div>
                </div>
              )}
            </>
          )}

          {appMode !== 'subset' && (
            <div className="mt-2 px-3 pb-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {t(`Nhật ký (${result.steps.length} bước)`, `Log (${result.steps.length} steps)`)}
                </div>
                <div className="text-[10px] text-slate-400">{t('Cuộn để xem thêm', 'Scroll for more')}</div>
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
