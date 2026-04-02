import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Clapperboard, RotateCcw, ShieldCheck } from 'lucide-react';
import { TouristLocation, Route, AppMode, AlgorithmResult, SelectedElement } from '../types';
import { MapCanvas } from './MapCanvas';
import { LocationInsightPanel } from './LocationInsightPanel';
import { PathDisplay } from './PathDisplay';
import { RoutePresentationModal } from './RoutePresentationModal';

interface GraphViewProps {
  locations: TouristLocation[];   // only the selected subset
  routes: Route[];                 // only routes between selected nodes
  appMode: AppMode;
  startId: string;
  endId: string | null;
  result: AlgorithmResult;
  onBack: () => void;
  onRerun: () => void;
}

export const GraphView: React.FC<GraphViewProps> = ({
  locations, routes, appMode, startId, endId, result, onBack, onRerun,
}) => {
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);

  useEffect(() => {
    if (!isPresentationOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPresentationOpen]);

  const activePath = useMemo(
    () => (appMode === 'path' ? result.shortestPath : (result.shortestCycles[0] ?? [])),
    [appMode, result.shortestCycles, result.shortestPath],
  );

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

  const MODE_LABEL = {
    cycle: { label: 'Bài 1 — Chu Trình Hamilton', color: 'bg-indigo-600' },
    path:  { label: 'Bài 2 — Đường Đi Hamilton',  color: 'bg-rose-600' },
    subset:{ label: 'Bài 3 — Lộ Trình Tùy Chọn', color: 'bg-amber-600' },
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 shrink-0 flex-wrap">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Chọn điểm khác
        </button>
        <div className={`text-xs font-bold text-white px-2.5 py-1 rounded-full ${MODE_LABEL[appMode].color}`}>
          {MODE_LABEL[appMode].label}
        </div>

        {/* ⭐ Ràng buộc cốt lõi — badge nổi bật */}
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          Mỗi điểm chỉ đi qua 1 lần
        </div>

        <div className="text-xs text-slate-500 ml-auto">
          {locations.length} điểm · {displayRoutes.length} chặng thuộc lộ trình
        </div>

        <button
          onClick={() => setIsPresentationOpen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          title="Mở trình chiếu lộ trình"
        >
          <Clapperboard className="w-3.5 h-3.5" /> Trình chiếu
        </button>

        <button onClick={onRerun}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600">
          <RotateCcw className="w-3.5 h-3.5" /> Chạy lại
        </button>
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
          totalDistanceKm={result.totalDistanceKm}
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
              Kết quả lộ trình
            </div>
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
          </div>
        </aside>
      </div>
    </div>
  );
};
