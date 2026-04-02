import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Expand, RotateCcw, ShieldCheck, X } from 'lucide-react';
import { TouristLocation, Route, AppMode, AlgorithmResult, AlgorithmStep, SelectedElement } from '../types';
import { MapCanvas } from './MapCanvas';
import { GraphLegend } from './GraphLegend';
import { LocationInsightPanel } from './LocationInsightPanel';
import { SolutionPanel } from './SolutionPanel';
import { StepNavigator } from './StepNavigator';

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
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(1000);
  const [activePathIndex, setActivePathIndex] = useState(0);
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
  const [detailMode, setDetailMode] = useState<'result' | 'method'>('result');
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);

  // Auto-stop at end
  useEffect(() => {
    if (result && currentStepIdx >= result.steps.length - 1) setIsPlaying(false);
  }, [currentStepIdx, result]);

  // Bài 1: không luân phiên nữa — luôn dùng chu trình đại diện đầu tiên (index 0)
  // (Toàn bộ chu trình được liệt kê trong SolutionPanel)

  // Auto-play on mount
  useEffect(() => {
    const t = setTimeout(() => setIsPlaying(true), 400);
    return () => clearTimeout(t);
  }, []);

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

  const handleNext = useCallback(() => {
    if (!result) return;
    setCurrentStepIdx(prev => Math.min(prev + 1, result.steps.length - 1));
  }, [result]);

  const handlePrev = useCallback(() => {
    setCurrentStepIdx(prev => Math.max(prev - 1, 0));
  }, []);

  const currentStep: AlgorithmStep | null = result?.steps[currentStepIdx] ?? null;
  const highlightedPaths =
    appMode === 'path'
      ? (result.shortestPath.length ? [result.shortestPath] : [])
      : result.shortestCycles;

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
          {locations.length} điểm · {routes.length} tuyến đường
        </div>

        <button
          onClick={() => setIsFullscreenMap(true)}
          className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
          title="Mở toàn màn hình bản đồ"
        >
          <Expand className="w-3.5 h-3.5" /> Toàn màn hình
        </button>

        <button onClick={onRerun}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600">
          <RotateCcw className="w-3.5 h-3.5" /> Chạy lại
        </button>
      </div>

      {isFullscreenMap && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] bg-[#e8e1d4]">
          <div className="flex h-full flex-col p-4 sm:p-6">
            <div className="mb-3 flex items-center justify-between rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Full Screen Map</div>
                <div className="text-lg font-bold text-slate-900">Bản đồ lộ trình tương tác</div>
              </div>
              <button
                type="button"
                onClick={() => setIsFullscreenMap(false)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <X className="h-4 w-4" /> Đóng
              </button>
            </div>
            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <div className="overflow-hidden rounded-[28px] border border-white/20 bg-white shadow-2xl">
                <MapCanvas
                  locations={locations}
                  routes={routes}
                  appMode={appMode}
                  uiMode="view"
                  startId={startId}
                  endId={endId}
                  selectedSubset={locations.map(l => l.id)}
                  currentStep={currentStep}
                  highlightedPaths={highlightedPaths}
                  activePathIndex={activePathIndex}
                  selectedElement={selectedElement}
                  onLocationClick={() => {}}
                  onLocationDrag={() => {}}
                  onCanvasDoubleClick={() => {}}
                  onRouteClick={() => {}}
                  onSelectElement={setSelectedElement}
                  edgeStart={null}
                  onEdgeStartSet={() => {}}
                  onAddRoute={() => {}}
                />
              </div>
              <div className="overflow-y-auto rounded-[28px] border border-white/20 bg-white p-3 shadow-2xl">
                <LocationInsightPanel
                  selectedElement={selectedElement}
                  locations={locations}
                  routes={routes}
                  appMode={appMode}
                />
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden p-3 gap-2 min-w-0">
          <div className="relative flex-1 overflow-hidden">
            <MapCanvas
              locations={locations}
              routes={routes}
              appMode={appMode}
              uiMode="view"
              startId={startId}
              endId={endId}
              selectedSubset={locations.map(l => l.id)}
              currentStep={currentStep}
              highlightedPaths={highlightedPaths}
              activePathIndex={activePathIndex}
              selectedElement={selectedElement}
              onLocationClick={() => {}}
              onLocationDrag={() => {}}
              onCanvasDoubleClick={() => {}}
              onRouteClick={() => {}}
              onSelectElement={setSelectedElement}
              edgeStart={null}
              onEdgeStartSet={() => {}}
              onAddRoute={() => {}}
            />
            <button
              type="button"
              onClick={() => setIsFullscreenMap(true)}
              className="absolute left-3 top-3 z-[600] inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/92 px-4 py-2 text-sm font-semibold text-slate-800 shadow-[0_14px_26px_rgba(15,23,42,0.14)] backdrop-blur hover:bg-white"
              title="Mở toàn màn hình bản đồ"
            >
              <Expand className="h-4 w-4" /> Xem toàn màn hình
            </button>
            <GraphLegend appMode={appMode} />
          </div>

          <StepNavigator
            totalSteps={result.steps.length}
            currentIdx={currentStepIdx}
            onPrev={handlePrev}
            onNext={handleNext}
            onJump={setCurrentStepIdx}
            isPlaying={isPlaying}
            onPlayToggle={() => setIsPlaying(p => !p)}
            playSpeedMs={playSpeedMs}
            onSpeedChange={setPlaySpeedMs}
          />
        </main>

        {/* Right: solution */}
        <aside className="w-[25rem] bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0">
          <div className="border-b border-slate-100 px-3 py-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Kết Quả & Diễn Giải
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDetailMode('result')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  detailMode === 'result' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Lớp 1: Kết quả
              </button>
              <button
                type="button"
                onClick={() => setDetailMode('method')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  detailMode === 'method' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Lớp 2: Cách làm
              </button>
            </div>
          </div>
          <div className="border-b border-slate-100 p-3">
            <LocationInsightPanel
              selectedElement={selectedElement}
              locations={locations}
              routes={routes}
              appMode={appMode}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <SolutionPanel
              result={result}
              currentStepIdx={currentStepIdx}
              appMode={appMode}
              locations={locations}
              routes={routes}
              detailMode={detailMode}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};
