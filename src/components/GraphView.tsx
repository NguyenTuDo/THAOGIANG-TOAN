import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RotateCcw, ShieldCheck } from 'lucide-react';
import { TouristLocation, Route, AppMode, AlgorithmResult, AlgorithmStep, SelectedElement } from '../types';
import { GraphCanvas } from './GraphCanvas';
import { GraphLegend } from './GraphLegend';
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

  // Auto-stop at end
  useEffect(() => {
    if (result && currentStepIdx >= result.steps.length - 1) setIsPlaying(false);
  }, [currentStepIdx, result]);

  // Cycle multiple optimal paths
  useEffect(() => {
    if (!result || result.shortestCycles.length <= 1) return;
    const interval = setInterval(() => {
      setActivePathIndex(prev => (prev + 1) % result.shortestCycles.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [result]);

  // Auto-play on mount
  useEffect(() => {
    const t = setTimeout(() => setIsPlaying(true), 400);
    return () => clearTimeout(t);
  }, []);

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
        <button onClick={onRerun}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-emerald-600">
          <RotateCcw className="w-3.5 h-3.5" /> Chạy lại
        </button>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <main className="flex-1 flex flex-col overflow-hidden p-3 gap-2 min-w-0">
          <div className="relative flex-1 overflow-hidden">
            <GraphCanvas
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
              onAddRoute={() => { /* view-only */ }}
            />
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
        <aside className="w-72 bg-white border-l border-slate-200 flex flex-col overflow-hidden shrink-0">
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
          <div className="flex-1 overflow-hidden">
            <SolutionPanel
              result={result}
              currentStepIdx={currentStepIdx}
              appMode={appMode}
              locations={locations}
              activePathIndex={activePathIndex}
              detailMode={detailMode}
            />
          </div>
        </aside>
      </div>
    </div>
  );
};
