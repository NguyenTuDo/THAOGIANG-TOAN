import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Languages, MapPinned } from 'lucide-react';
import { DestinationSelector } from '../components/DestinationSelector';
import { GraphView } from '../components/GraphView';
import { findShortestHamiltonianCycle } from '../algorithms/hamiltonianCycle';
import { findShortestHamiltonianPath } from '../algorithms/hamiltonianPath';
import { findShortestSubsetRoute } from '../algorithms/subsetRoute';
import { loadGraphData, loadPresets, readLocalDraft, TOURIST_DATA_CHANGED_EVENT, writeLocalDraft } from '../lib/dataStore';
import { filterRoutesForSelection, getCompatibleRouteIds, getPresetRouteIds, normalizeSelectedRouteIds } from '../lib/presetRoutes';
import { useLang } from '../contexts/LanguageContext';
import { AppMode, AlgorithmResult, GraphData, PresetSelectionMap } from '../types';

const MODES: { id: AppMode; label: string; labelEn: string; desc: string; descEn: string; activeClass: string; softClass: string; badgeClass: string }[] = [
  {
    id: 'cycle',
    label: 'Bài 1',
    labelEn: 'Mode 1',
    desc: 'Chu trình Hamilton',
    descEn: 'Hamiltonian cycle',
    activeClass: 'bg-[#133654] text-white',
    softClass: 'bg-[#e8eff6] text-[#133654]',
    badgeClass: 'bg-[#d6e3f2] text-[#133654]',
  },
  {
    id: 'path',
    label: 'Bài 2',
    labelEn: 'Mode 2',
    desc: 'Đường đi Hamilton',
    descEn: 'Hamiltonian path',
    activeClass: 'bg-[#6b2745] text-white',
    softClass: 'bg-[#f7e8ef] text-[#6b2745]',
    badgeClass: 'bg-[#f0d8e3] text-[#6b2745]',
  },
  {
    id: 'subset',
    label: 'Bài 3',
    labelEn: 'Mode 3',
    desc: 'Đường đi ngắn nhất trong tập chọn',
    descEn: 'Shortest path in chosen subset',
    activeClass: 'bg-[#82501f] text-white',
    softClass: 'bg-[#f7efe6] text-[#82501f]',
    badgeClass: 'bg-[#eddcc7] text-[#82501f]',
  },
];

type AppView = 'selector' | 'preview' | 'result';

export function GuidebookPage() {
  const { lang, setLang, t } = useLang();
  const initialDraft = readLocalDraft();
  const [graphData, setGraphData] = useState<GraphData>({ locations: [], routes: [] });
  const [presets, setPresets] = useState<PresetSelectionMap>({
    cycle:  { ids: [], routeIds: [], label: '', desc: '' },
    path:   { ids: [], routeIds: [], label: '', desc: '' },
    subset: { ids: [], routeIds: [], label: '', desc: '' },
  });
  const [loadingData, setLoadingData] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>(() => initialDraft?.appMode ?? 'cycle');
  const [appView, setAppView] = useState<AppView>('selector');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => initialDraft?.selectedIds ?? []);
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>(() => initialDraft?.selectedRouteIds ?? []);
  const [endId, setEndId] = useState<string | null>(() => initialDraft?.endId ?? null);
  const [result, setResult] = useState<AlgorithmResult | null>(null);
  const isMountRef = useRef(true);

  const refreshData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [graph, nextPresets] = await Promise.all([loadGraphData(), loadPresets()]);
      setGraphData(graph);
      setPresets(nextPresets);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    const handleDataChanged = () => {
      void refreshData();
    };
    const handleStorage = (event: StorageEvent) => {
      if (!event.key?.startsWith('tourist.')) return;
      void refreshData();
    };

    window.addEventListener(TOURIST_DATA_CHANGED_EVENT, handleDataChanged);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(TOURIST_DATA_CHANGED_EVENT, handleDataChanged);
      window.removeEventListener('storage', handleStorage);
    };
  }, [refreshData]);

  useEffect(() => {
    if (isMountRef.current) {
      isMountRef.current = false;
      return;
    }
    setSelectedIds([]);
    setSelectedRouteIds([]);
    setEndId(null);
    setResult(null);
    setAppView('selector');
  }, [appMode]);

  useEffect(() => {
    writeLocalDraft({ selectedIds, selectedRouteIds, endId, appMode });
  }, [selectedIds, selectedRouteIds, endId, appMode]);

  // Cleanup: filter out any selected IDs that no longer exist in the system
  useEffect(() => {
    if (graphData.locations.length > 0) {
      setSelectedIds(prev => {
        const valid = prev.filter(id => graphData.locations.some(l => l.id === id));
        return valid.length === prev.length ? prev : valid;
      });
    }
  }, [graphData.locations]);

  useEffect(() => {
    setSelectedRouteIds(current => normalizeSelectedRouteIds(current, graphData.routes, selectedIds));
  }, [graphData.routes, selectedIds]);

  useEffect(() => {
    if (initialDraft?.selectedRouteIds !== undefined) return;
    if (selectedIds.length === 0 || selectedRouteIds.length > 0 || graphData.routes.length === 0) return;
    setSelectedRouteIds(getCompatibleRouteIds(graphData.routes, selectedIds));
  }, [graphData.routes, initialDraft?.selectedRouteIds, selectedIds, selectedRouteIds.length]);

  const MAX: Record<AppMode, number> = { cycle: 5, path: 5, subset: Number.MAX_SAFE_INTEGER };

  useEffect(() => {
    if (selectedIds.length === 0) {
      setEndId(null);
      return;
    }

    if (appMode === 'cycle') {
      if (endId !== null) {
        setEndId(null);
      }
      return;
    }

    const startId = selectedIds[0];
    const candidateEndIds = selectedIds.filter(id => id !== startId);

    if (candidateEndIds.length === 0) {
      if (endId !== null) {
        setEndId(null);
      }
      return;
    }

    if (!endId || !candidateEndIds.includes(endId)) {
      setEndId(candidateEndIds[candidateEndIds.length - 1]);
    }
  }, [appMode, endId, selectedIds]);

  const handleToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      let next: string[];
      if (prev.includes(id)) {
        next = prev.filter(x => x !== id);
        if (appMode !== 'cycle' && id === endId) setEndId(null);
      } else if (prev.length >= MAX[appMode]) {
        next = prev;
      } else {
        next = [...prev, id];
      }
      setSelectedRouteIds(getCompatibleRouteIds(graphData.routes, next));
      return next;
    });
  }, [appMode, endId, graphData.routes]);

  const handleClearAll = useCallback(() => {
    setSelectedIds([]);
    setSelectedRouteIds([]);
    setEndId(null);
    setResult(null);
    setAppView('selector');
  }, []);

  const handleLoadPreset = useCallback(() => {
    const preset = presets[appMode];
    if (!preset) return;

    const valid = preset.ids.filter(id => graphData.locations.some(l => l.id === id));
    const startId = preset.startId && valid.includes(preset.startId) ? preset.startId : valid[0] ?? null;
    const ordered = startId ? [startId, ...valid.filter(id => id !== startId)] : valid;
    const nextEndId = appMode === 'cycle'
      ? null
      : preset.endId && ordered.includes(preset.endId) && preset.endId !== startId
        ? preset.endId
        : ordered.find(id => id !== startId) ?? null;

    setSelectedIds(ordered);
    setSelectedRouteIds(getPresetRouteIds(preset, graphData.routes, ordered));
    setEndId(nextEndId);
  }, [appMode, graphData.locations, graphData.routes, presets]);

  const buildResult = useCallback((nextSelectedIds: string[], nextEndId: string | null) => {
    if (nextSelectedIds.length === 0) return null;

    const startId = nextSelectedIds[0];
    const subsetLocs = graphData.locations.filter(l => nextSelectedIds.includes(l.id));
    const subsetRoutes = filterRoutesForSelection(graphData.routes, nextSelectedIds, selectedRouteIds);

    if (appMode === 'cycle') {
      return findShortestHamiltonianCycle(subsetLocs, subsetRoutes, startId);
    }
    if (appMode === 'path') {
      if (!nextEndId) return null;
      return findShortestHamiltonianPath(subsetLocs, subsetRoutes, startId, nextEndId);
    }
    if (!nextEndId) return null;
    return findShortestSubsetRoute(subsetLocs, subsetRoutes, startId, nextEndId);
  }, [appMode, graphData.locations, graphData.routes, selectedRouteIds]);

  const canPreviewSelection = useCallback((nextSelectedIds: string[], nextEndId: string | null) => {
    if (appMode === 'cycle') {
      return nextSelectedIds.length === 5;
    }

    if (appMode === 'path') {
      return nextSelectedIds.length === 5 && nextEndId !== null && nextEndId !== nextSelectedIds[0];
    }

    return nextSelectedIds.length >= 2 && nextEndId !== null && nextEndId !== nextSelectedIds[0];
  }, [appMode]);

  const handleQuickStart = useCallback(() => {
    const preset = presets[appMode];
    if (!preset) return;

    const valid = preset.ids.filter(id => graphData.locations.some(l => l.id === id));
    const startId = preset.startId && valid.includes(preset.startId) ? preset.startId : valid[0] ?? null;
    const ordered = startId ? [startId, ...valid.filter(id => id !== startId)] : valid;
    const nextEndId = appMode === 'cycle'
      ? null
      : preset.endId && ordered.includes(preset.endId) && preset.endId !== startId
        ? preset.endId
        : ordered.find(id => id !== startId) ?? null;

    setSelectedIds(ordered);
    setSelectedRouteIds(getPresetRouteIds(preset, graphData.routes, ordered));
    setEndId(nextEndId);

    setResult(null);
    setAppView(canPreviewSelection(ordered, nextEndId) ? 'preview' : 'selector');
  }, [appMode, canPreviewSelection, graphData.locations, graphData.routes, presets]);

  const handleFindRoute = useCallback(() => {
    if (!canPreviewSelection(selectedIds, endId)) return;

    setResult(null);
    setAppView('preview');
  }, [canPreviewSelection, selectedIds, endId]);

  const handleSolveRoute = useCallback(() => {
    const nextResult = buildResult(selectedIds, endId);
    if (!nextResult) return;

    setResult(nextResult);
    setAppView('result');
  }, [buildResult, selectedIds, endId]);

  const subsetLocs = useMemo(
    () => graphData.locations.filter(l => selectedIds.includes(l.id)),
    [graphData.locations, selectedIds],
  );
  const subsetRoutes = useMemo(
    () => filterRoutesForSelection(graphData.routes, selectedIds, selectedRouteIds),
    [graphData.routes, selectedIds, selectedRouteIds],
  );
  const currentStageLabel = appView === 'selector'
    ? t('Bước 1 - Chọn bài toán và điểm dừng', 'Step 1 - Choose the mode and stops')
    : appView === 'preview'
      ? t('Bước 2 - Kiểm tra đồ thị trước khi giải', 'Step 2 - Review the graph before solving')
      : t('Bước 3 - Theo dõi lời giải trên bản đồ', 'Step 3 - Follow the final route on the map');

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.72),transparent_28%),linear-gradient(180deg,#f5efe4_0%,#efe7da_52%,#ece3d5_100%)] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-[#d7ccbb]/80 bg-[#f7f1e7]/88 backdrop-blur-xl">
        <div className="mx-auto max-w-[1520px] px-3 py-3 md:px-6 md:py-4">
          <div className="rounded-[30px] border border-white/70 bg-white/72 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] md:px-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
              <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#14342b] text-white shadow-[0_10px_24px_rgba(20,52,43,0.25)]">
              <MapPinned className="h-5 w-5" />
            </div>
              <div className="min-w-0 leading-tight">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  {t('Cẩm nang du lịch', 'Tourist guidebook')}
                </div>
                <div className="text-lg font-black text-slate-900 md:text-[1.8rem]">
                  {t('Tham quan quanh THPT Marie Curie', 'Around Marie Curie High School')}
                </div>
                <div className="mt-2 inline-flex max-w-full rounded-full border border-[#e6dccd] bg-[#f7f1e7] px-3 py-1.5 text-[11px] font-semibold text-slate-600 md:text-xs">
                  {currentStageLabel}
                </div>
              </div>
            </div>

              <div className="flex items-center justify-between gap-3 md:justify-end">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#ddd1c0] bg-white px-2 py-2 text-xs font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
                  <Languages className="h-4 w-4" />
                  <button
                    onClick={() => setLang('vi')}
                    className={`rounded-full px-3 py-1 ${lang === 'vi' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                  >
                    VI
                  </button>
                  <button
                    onClick={() => setLang('en')}
                    className={`rounded-full px-3 py-1 ${lang === 'en' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}
                  >
                    EN
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
              {MODES.map(mode => {
                const isActive = appMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setAppMode(mode.id)}
                    className={`rounded-[24px] border px-4 py-3 text-left transition-all md:px-5 md:py-4 ${
                      isActive
                        ? `${mode.activeClass} border-transparent shadow-[0_18px_36px_rgba(15,23,42,0.12)]`
                        : 'border-[#e6dccd] bg-[#fbf8f2] text-slate-700 hover:border-slate-300 hover:bg-white'
                    }`}
                    title={lang === 'en' ? mode.descEn : mode.desc}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-black md:text-base">{lang === 'en' ? mode.labelEn : mode.label}</div>
                        <div className={`mt-1 text-[11px] leading-snug md:text-xs ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                          {lang === 'en' ? mode.descEn : mode.desc}
                        </div>
                      </div>
                      <div className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                        isActive ? 'bg-white/14 text-white' : mode.badgeClass
                      }`}>
                        {mode.label}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1520px] px-3 py-4 md:px-6 md:py-6">
        {loadingData ? (
          <div className="rounded-[30px] border border-[#ded5c7] bg-white/90 p-6 text-sm text-slate-600 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
            {t('Đang tải dữ liệu cẩm nang...', 'Loading guidebook data...')}
          </div>
        ) : (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-[34px] border border-white/60 bg-white/78 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur">
              {appView === 'selector' ? (
                <DestinationSelector
                  locations={graphData.locations}
                  appMode={appMode}
                  selectedIds={selectedIds}
                  onToggle={handleToggle}
                  onClearAll={handleClearAll}
                  onFindRoute={handleFindRoute}
                  onQuickStart={handleQuickStart}
                  onLoadPreset={handleLoadPreset}
                  preset={presets[appMode] ?? null}
                  endId={endId}
                  onSetEnd={setEndId}
                />
              ) : (
                <GraphView
                  locations={subsetLocs}
                  routes={subsetRoutes}
                  selectedIds={selectedIds}
                  appMode={appMode}
                  startId={selectedIds[0]}
                  endId={endId}
                  stage={appView === 'preview' ? 'preview' : 'result'}
                  result={appView === 'result' ? result : null}
                  onBack={() => setAppView(appView === 'result' ? 'preview' : 'selector')}
                  onSolve={handleSolveRoute}
                  onRerun={handleSolveRoute}
                />
              )}
            </section>
            <p className="px-1 text-center text-[11px] leading-5 text-slate-400">
              {t(
                'Các trọng số giữa các đỉnh được cân đối cho phù hợp với quãng đường di chuyển tại Thành phố Hồ Chí Minh (quãng đường thực tế có thể khác biệt chút ít).',
                'Edge weights are calibrated to approximate travel distances in Ho Chi Minh City (actual distances may vary slightly).',
              )}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
