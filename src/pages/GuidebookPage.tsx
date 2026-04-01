import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Languages, MapPinned } from 'lucide-react';
import { DestinationSelector } from '../components/DestinationSelector';
import { GraphView } from '../components/GraphView';
import { findShortestHamiltonianCycle } from '../algorithms/hamiltonianCycle';
import { findShortestHamiltonianPath } from '../algorithms/hamiltonianPath';
import { findShortestSubsetRoute } from '../algorithms/subsetRoute';
import { loadGraphData, loadPresets, readLocalDraft, writeLocalDraft } from '../lib/dataStore';
import { useLang } from '../contexts/LanguageContext';
import { AppMode, AlgorithmResult, GraphData, PresetSelectionMap } from '../types';

const MODES: { id: AppMode; label: string; labelEn: string; desc: string; descEn: string; activeClass: string }[] = [
  {
    id: 'cycle',
    label: 'Bài 1',
    labelEn: 'Mode 1',
    desc: 'Chu trình Hamilton',
    descEn: 'Hamiltonian cycle',
    activeClass: 'bg-[#133654] text-white',
  },
  {
    id: 'path',
    label: 'Bài 2',
    labelEn: 'Mode 2',
    desc: 'Đường đi Hamilton',
    descEn: 'Hamiltonian path',
    activeClass: 'bg-[#6b2745] text-white',
  },
  {
    id: 'subset',
    label: 'Bài 3',
    labelEn: 'Mode 3',
    desc: 'Lộ trình tùy chọn',
    descEn: 'Custom subset route',
    activeClass: 'bg-[#82501f] text-white',
  },
];

type AppView = 'selector' | 'graph';

export function GuidebookPage() {
  const { lang, setLang, t } = useLang();
  const [graphData, setGraphData] = useState<GraphData>({ locations: [], routes: [] });
  const [presets, setPresets] = useState<PresetSelectionMap>({
    cycle:  { ids: [], label: '', desc: '' },
    path:   { ids: [], label: '', desc: '' },
    subset: { ids: [], label: '', desc: '' },
  });
  const [loadingData, setLoadingData] = useState(true);
  const [appMode, setAppMode] = useState<AppMode>(() => readLocalDraft()?.appMode ?? 'cycle');
  const [appView, setAppView] = useState<AppView>('selector');
  const [selectedIds, setSelectedIds] = useState<string[]>(() => readLocalDraft()?.selectedIds ?? []);
  const [endId, setEndId] = useState<string | null>(() => readLocalDraft()?.endId ?? null);
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
    if (isMountRef.current) {
      isMountRef.current = false;
      return;
    }
    setSelectedIds([]);
    setEndId(null);
    setResult(null);
    setAppView('selector');
  }, [appMode]);

  useEffect(() => {
    writeLocalDraft({ selectedIds, endId, appMode });
  }, [selectedIds, endId, appMode]);

  const MAX: Record<AppMode, number> = { cycle: 5, path: 5, subset: 99 };

  const handleToggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        const next = prev.filter(x => x !== id);
        if (appMode === 'path' && id === endId) setEndId(null);
        return next;
      }
      if (prev.length >= MAX[appMode]) return prev;
      return [...prev, id];
    });
  }, [appMode, endId]);

  const handleClearAll = useCallback(() => {
    setSelectedIds([]);
    setEndId(null);
    setResult(null);
    setAppView('selector');
  }, []);

  const handleLoadPreset = useCallback(() => {
    const preset = presets[appMode];
    if (!preset) return;

    const valid = preset.ids.filter(id => graphData.locations.some(l => l.id === id));
    setSelectedIds(valid);

    if (appMode === 'path' && valid.length >= 2) {
      setEndId(valid[valid.length - 1]);
    } else {
      setEndId(null);
    }
  }, [appMode, graphData.locations, presets]);

  const handleFindRoute = useCallback(() => {
    if (selectedIds.length === 0) return;

    const startId = selectedIds[0];
    const subsetLocs = graphData.locations.filter(l => selectedIds.includes(l.id));
    const subsetRoutes = graphData.routes.filter(
      r => selectedIds.includes(r.from) && selectedIds.includes(r.to),
    );

    let nextResult: AlgorithmResult;
    if (appMode === 'cycle') {
      nextResult = findShortestHamiltonianCycle(subsetLocs, subsetRoutes, startId);
    } else if (appMode === 'path') {
      nextResult = findShortestHamiltonianPath(subsetLocs, subsetRoutes, startId, endId!);
    } else {
      nextResult = findShortestSubsetRoute(graphData.locations, graphData.routes, selectedIds, startId);
    }

    setResult(nextResult);
    setAppView('graph');
  }, [selectedIds, appMode, graphData, endId]);

  const subsetLocs = useMemo(
    () => graphData.locations.filter(l => selectedIds.includes(l.id)),
    [graphData.locations, selectedIds],
  );
  const subsetRoutes = useMemo(
    () => graphData.routes.filter(r => selectedIds.includes(r.from) && selectedIds.includes(r.to)),
    [graphData.routes, selectedIds],
  );

  return (
    <div className="min-h-screen bg-[#efe7da] text-slate-900">
      <header className="sticky top-0 z-20 border-b border-[#d7ccbb] bg-[#f7f1e7]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4 px-4 py-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#14342b] text-white shadow-[0_10px_24px_rgba(20,52,43,0.25)]">
              <MapPinned className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                {t('Cẩm nang du lịch', 'Tourist guidebook')}
              </div>
              <div className="text-lg font-black text-slate-900">
                {t('Tham quan quanh THPT Marie Curie', 'Around Marie Curie High School')}
              </div>
            </div>
          </div>

          <div className="mx-auto flex gap-1 rounded-full border border-[#ddd1c0] bg-white/80 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
            {MODES.map(mode => (
              <button
                key={mode.id}
                onClick={() => setAppMode(mode.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  appMode === mode.id ? `${mode.activeClass} shadow-sm` : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                title={lang === 'en' ? mode.descEn : mode.desc}
              >
                <span>{lang === 'en' ? mode.labelEn : mode.label}</span>
                <span className="ml-2 hidden text-xs opacity-80 md:inline">{lang === 'en' ? mode.descEn : mode.desc}</span>
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ddd1c0] bg-white px-2 py-2 text-xs font-semibold text-slate-700">
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
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-6 md:px-6">
        {loadingData ? (
          <div className="rounded-[28px] border border-[#ded5c7] bg-white/90 p-6 text-sm text-slate-600">
            {t('Đang tải dữ liệu cẩm nang...', 'Loading guidebook data...')}
          </div>
        ) : (
          <div className="space-y-4">
            <section className="overflow-hidden rounded-[34px] border border-[#ded5c7] bg-white/70 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
              {appView === 'selector' ? (
                <DestinationSelector
                  locations={graphData.locations}
                  appMode={appMode}
                  selectedIds={selectedIds}
                  onToggle={handleToggle}
                  onClearAll={handleClearAll}
                  onFindRoute={handleFindRoute}
                  onLoadPreset={handleLoadPreset}
                  preset={presets[appMode] ?? null}
                  endId={endId}
                  onSetEnd={setEndId}
                />
              ) : (
                result && (
                  <GraphView
                    locations={subsetLocs}
                    routes={subsetRoutes}
                    appMode={appMode}
                    startId={selectedIds[0]}
                    endId={endId}
                    result={result}
                    onBack={() => setAppView('selector')}
                    onRerun={handleFindRoute}
                  />
                )
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
