import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Clapperboard, Clock3, Info, ListTree, Maximize2, Minimize2, Play, RotateCcw, ShieldCheck, Volume2, VolumeX, X } from 'lucide-react';
import { TouristLocation, Route, AppMode, AlgorithmResult, SelectedElement } from '../types';
import { useLang } from '../contexts/LanguageContext';
import { MapCanvas } from './MapCanvas';
import { LocationInsightPanel } from './LocationInsightPanel';
import { PathDisplay } from './PathDisplay';
import { RoutePresentationModal } from './RoutePresentationModal';
import { SolutionPanel } from './SolutionPanel';
import { StepNavigator } from './StepNavigator';

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

type DesktopResultTab = 'summary' | 'method';
type MobileStageTab = 'preview' | 'summary' | 'method';

function ResultViewSwitch({
  activeTab,
  onChange,
  methodLabel,
  summaryLabel,
  showMethodTab = true,
}: {
  activeTab: 'summary' | 'method';
  onChange: (tab: 'summary' | 'method') => void;
  methodLabel: string;
  summaryLabel: string;
  showMethodTab?: boolean;
}) {
  if (!showMethodTab) {
    return (
      <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
        <div className="rounded-[16px] bg-slate-900 px-3 py-2.5 text-center text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)]">
          {summaryLabel}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-1 rounded-[20px] border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
      <button
        type="button"
        onClick={() => onChange('summary')}
        className={`rounded-[16px] px-3 py-2.5 text-center transition-colors ${
          activeTab === 'summary' ? 'bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)]' : 'text-slate-500'
        }`}
      >
        {summaryLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange('method')}
        className={`rounded-[16px] px-3 py-2.5 text-center transition-colors ${
          activeTab === 'method' ? 'bg-slate-900 text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)]' : 'text-slate-500'
        }`}
      >
        {methodLabel}
      </button>
    </div>
  );
}

function buildRouteKey(fromId: string, toId: string) {
  return [fromId, toId].sort().join('__');
}

function arePathsEqual(left: string[], right: string[]) {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function evaluatePreviewPath(
  path: string[],
  routeMap: Map<string, Route>,
  getLocationName: (id: string) => string,
  t: (vi: string, en: string) => string,
): { totalDistanceKm: number | null; valid: boolean; note: string } {
  if (path.length < 2) {
    return {
      totalDistanceKm: null,
      valid: false,
      note: t('Chưa đủ điểm để tạo tình huống thử.', 'Not enough nodes for a trial case.'),
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
        note: t(`Thiếu cạnh nối ${getLocationName(fromId)} và ${getLocationName(toId)}.`, `Missing edge between ${getLocationName(fromId)} and ${getLocationName(toId)}.`),
      };
    }

    totalDistanceKm += route.distanceKm;
  }

  return {
    totalDistanceKm,
    valid: true,
    note: t(`Có thể chạy thử theo lộ trình này với tổng ${totalDistanceKm.toFixed(1)} km.`, `Trial route covers ${totalDistanceKm.toFixed(1)} km.`),
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
  const { lang, t } = useLang();
  const [selectedElement, setSelectedElement] = useState<SelectedElement>(null);
  const [isPresentationOpen, setIsPresentationOpen] = useState(false);
  const [activePreviewCaseId, setActivePreviewCaseId] = useState<string>('selection-order');
  const [desktopResultTab, setDesktopResultTab] = useState<DesktopResultTab>('summary');
  const [mobileStageTab, setMobileStageTab] = useState<MobileStageTab>('preview');
  const [isMobileInsightOpen, setIsMobileInsightOpen] = useState(false);
  const [isMobileMapExpanded, setIsMobileMapExpanded] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlayingSteps, setIsPlayingSteps] = useState(false);
  const [playSpeedMs, setPlaySpeedMs] = useState(1000);
  const [isNarrationEnabled, setIsNarrationEnabled] = useState(false);

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
      const orderedEval = evaluatePreviewPath(orderedSelection, routeMap, getLocationName, t);
      cases.push({
        id: 'selection-order',
        title: t('Theo thứ tự đang chọn', 'In selection order'),
        description: t('Dùng đúng thứ tự thầy vừa sắp khi chọn điểm.', 'Uses the exact order you selected the stops.'),
        path: orderedSelection,
        ...orderedEval,
      });

      const reversePath = [startId, ...selectedIds.filter(id => id !== startId).reverse(), startId];
      const reverseEval = evaluatePreviewPath(reversePath, routeMap, getLocationName, t);
      cases.push({
        id: 'reverse-order',
        title: t('Đảo chiều vòng tham quan', 'Reverse tour direction'),
        description: t('Thử đi theo chiều ngược lại để đối chiếu.', 'Try going in the opposite direction to compare.'),
        path: reversePath,
        ...reverseEval,
      });

      const greedyPath = buildNearestNeighborTrial(selectedIds, startId, null, appMode, routeMap);
      const greedyEval = evaluatePreviewPath(greedyPath, routeMap, getLocationName, t);
      cases.push({
        id: 'greedy-cycle',
        title: t('Đi cạnh gần nhất trước', 'Nearest neighbour first'),
        description: t('Một cách thử nhanh để xem đồ thị có khép vòng mượt không.', 'A quick trial to check whether the graph closes into a smooth cycle.'),
        path: greedyPath,
        ...greedyEval,
      });
    }

    if (appMode === 'path') {
      const forwardPath = buildPathModeOrder(selectedIds, startId, endId);
      if (forwardPath.length > 1) {
        const forwardEval = evaluatePreviewPath(forwardPath, routeMap, getLocationName, t);
        cases.push({
          id: 'selection-order',
          title: t('Theo thứ tự đang chọn', 'In selection order'),
          description: t('Đi từ điểm đầu đến điểm cuối theo cấu trúc hiện tại.', 'Travels from start to end in the current node order.'),
          path: forwardPath,
          ...forwardEval,
        });
      }

      const reversePath = buildReverseMiddlePath(selectedIds, startId, endId);
      if (reversePath.length > 1) {
        const reverseEval = evaluatePreviewPath(reversePath, routeMap, getLocationName, t);
        cases.push({
          id: 'reverse-order',
          title: t('Đảo phần thân hành trình', 'Reverse middle stops'),
          description: t('Giữ nguyên hai đầu mút, chỉ đổi thứ tự các điểm ở giữa.', 'Keeps both endpoints, only reverses the middle stops.'),
          path: reversePath,
          ...reverseEval,
        });
      }

      const greedyPath = buildNearestNeighborTrial(selectedIds, startId, endId, appMode, routeMap);
      if (greedyPath.length > 1) {
        const greedyEval = evaluatePreviewPath(greedyPath, routeMap, getLocationName, t);
        cases.push({
          id: 'greedy-path',
          title: t('Ghép cạnh gần nhất', 'Nearest neighbour'),
          description: t('Thử nhanh một đường đi tham khảo trước khi giải tối ưu.', 'Quick reference path before finding the optimal solution.'),
          path: greedyPath,
          ...greedyEval,
        });
      }
    }

    if (appMode === 'subset' && startId && endId) {
      const directPath = [startId, endId];
      const directEval = evaluatePreviewPath(directPath, routeMap, getLocationName, t);
      cases.push({
        id: 'direct-hop',
        title: t('Đi thẳng hai đầu mút', 'Direct hop'),
        description: t('Kiểm tra nhanh xem có cạnh trực tiếp giữa hai điểm hay không.', 'Quickly checks whether a direct edge exists between the two endpoints.'),
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
        const transferEval = evaluatePreviewPath(transferPath, routeMap, getLocationName, t);
        cases.push({
          id: 'one-transfer',
          title: t('Đi qua một điểm trung chuyển', 'Via one transfer'),
          description: t('Xem thử một phương án nối hai đầu mút bằng một điểm đệm.', 'Tries connecting the two endpoints through one intermediate stop.'),
          path: transferPath,
          ...transferEval,
        });
      }

      const orderedSubsetPath = [startId, ...selectedIds.filter(id => id !== startId && id !== endId), endId];
      if (orderedSubsetPath.length > 1) {
        const orderedSubsetEval = evaluatePreviewPath(orderedSubsetPath, routeMap, getLocationName, t);
        cases.push({
          id: 'selection-order',
          title: t('Theo thứ tự đang chọn', 'In selection order'),
          description: t('Giữ nguyên thứ tự chọn để so sánh với lời giải ngắn nhất.', 'Keeps the selection order to compare with the shortest path.'),
          path: orderedSubsetPath,
          ...orderedSubsetEval,
        });
      }
    }

    return cases;
  }, [appMode, endId, getLocationName, lang, routeMap, selectedIds, startId, t]);

  useEffect(() => {
    setActivePreviewCaseId(previewCases[0]?.id ?? 'selection-order');
  }, [previewCases, stage]);

  const activePreviewCase = useMemo(
    () => previewCases.find(item => item.id === activePreviewCaseId) ?? previewCases[0] ?? null,
    [activePreviewCaseId, previewCases],
  );

  const subsetCurrentStep = appMode === 'subset' && result ? result.steps[currentStepIdx] ?? null : null;
  const isSubsetMethodMode = stage === 'result' && appMode === 'subset' && (desktopResultTab === 'method' || mobileStageTab === 'method');

  const activePath = useMemo(() => {
    if (isSubsetMethodMode) {
      return subsetCurrentStep?.path ?? [];
    }

    if (stage === 'result' && result) {
      return appMode === 'cycle' ? (result.shortestCycles[0] ?? []) : result.shortestPath;
    }

    return activePreviewCase?.valid ? activePreviewCase.path : [];
  }, [activePreviewCase, appMode, isSubsetMethodMode, result, stage, subsetCurrentStep?.path]);

  const presentationPath = useMemo(() => {
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
    if (isSubsetMethodMode) return routes;
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
  }, [activePath, isSubsetMethodMode, routes, stage]);

  const getSegmentDistance = useCallback((fromId: string, toId: string) => {
    const route = routes.find(
      current => (current.from === fromId && current.to === toId) || (current.to === fromId && current.from === toId),
    );
    return route?.distanceKm ?? null;
  }, [routes]);

  const MODE_LABEL = {
    cycle: { label: t('Bài 1 — Chu Trình Hamilton', 'Mode 1 — Hamiltonian Cycle'), color: 'bg-indigo-600' },
    path:  { label: t('Bài 2 — Đường Đi Hamilton', 'Mode 2 — Hamiltonian Path'),   color: 'bg-rose-600' },
    subset:{ label: t('Bài 3 — Đường Đi Ngắn Nhất', 'Mode 3 — Shortest Path'),     color: 'bg-amber-600' },
  };

  const possibleEdgeCount = Math.max((locations.length * (locations.length - 1)) / 2, 1);
  const graphDensity = Math.min((routes.length / possibleEdgeCount) * 100, 100);
  const startDegree = routes.filter(route => route.from === startId || route.to === startId).length;
  const previewIntro = appMode === 'subset'
    ? t('Bước xem trước này cho phép quan sát tập điểm đang chọn, các cạnh sẵn có và thử nhanh một vài phương án nối hai đầu mút.',
        'This preview step lets you observe the selected subset, available edges, and quickly trial a few paths between the two endpoints.')
    : t('Bước xem trước này cho phép kiểm tra các điểm, các cạnh và thử nhanh vài lộ trình trước khi chốt lời giải tối ưu.',
        'This preview step lets you inspect nodes, edges, and quickly trial a few routes before committing to the optimal solution.');
  const totalSteps = result?.steps.length ?? 0;
  const methodTabLabel = appMode === 'subset' ? t('Cách giải', 'Method') : t('Liệt kê phương án', 'All variants');
  const summaryLabel = t('Lời giải', 'Solution');
  const hasSeparateMethodTab = appMode === 'subset';
  const isDesktopSubsetMethod = stage === 'result' && appMode === 'subset' && desktopResultTab === 'method';
  const isMobileSubsetMethod = stage === 'result' && appMode === 'subset' && mobileStageTab === 'method';
  const visibleCurrentStep = isDesktopSubsetMethod || isMobileSubsetMethod ? subsetCurrentStep : null;

  useEffect(() => {
    if (selectedElement) {
      setIsMobileInsightOpen(true);
    }
  }, [selectedElement]);

  useEffect(() => {
    setDesktopResultTab('summary');
    setIsPlayingSteps(false);
    setIsNarrationEnabled(false);
    setCurrentStepIdx(0);
    setMobileStageTab(stage === 'result' ? 'summary' : 'preview');
    setIsMobileMapExpanded(false);
  }, [result, stage]);

  useEffect(() => {
    if (!isNarrationEnabled || !visibleCurrentStep?.explanation || typeof window === 'undefined' || !window.speechSynthesis) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(visibleCurrentStep.explanation);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.02;
    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isNarrationEnabled, visibleCurrentStep]);

  useEffect(() => {
    if (stage !== 'result' || totalSteps === 0) {
      setIsPlayingSteps(false);
      return;
    }

    if (currentStepIdx >= totalSteps) {
      setCurrentStepIdx(totalSteps - 1);
    }

    if (currentStepIdx >= totalSteps - 1) {
      setIsPlayingSteps(false);
    }
  }, [currentStepIdx, stage, totalSteps]);

  const handlePrevStep = useCallback(() => {
    setCurrentStepIdx(index => Math.max(index - 1, 0));
  }, []);

  const handleNextStep = useCallback(() => {
    setCurrentStepIdx(index => Math.min(index + 1, Math.max(totalSteps - 1, 0)));
  }, [totalSteps]);

  const handleJumpToStep = useCallback((index: number) => {
    setCurrentStepIdx(Math.max(0, Math.min(index, Math.max(totalSteps - 1, 0))));
  }, [totalSteps]);

  const previewStagePanel = (
    <div className="mt-3 space-y-3">
      <div className="rounded-2xl border border-sky-100 bg-sky-50 px-3 py-3 text-xs leading-6 text-sky-800">
        {previewIntro}
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('Điểm', 'Nodes')}</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{locations.length}</div>
          <div className="text-slate-500">{t('đang được đưa vào bài toán', 'included in this problem')}</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('Cạnh', 'Edges')}</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{routes.length}</div>
          <div className="text-slate-500">{t('cạnh hiện có trong đồ thị con', 'edges in the subgraph')}</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('Mật độ', 'Density')}</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{graphDensity.toFixed(0)}%</div>
          <div className="text-slate-500">{t('mức độ liên kết giữa các điểm', 'connectivity among nodes')}</div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t('Bậc của điểm đầu', 'Start degree')}</div>
          <div className="mt-1 text-2xl font-black text-slate-900">{startDegree}</div>
          <div className="text-slate-500">{t('cạnh chạm vào điểm xuất phát', 'edges touching start node')}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white px-3 py-3 text-xs leading-6 text-slate-600">
        <div><span className="font-bold text-slate-800">{t('Xuất phát:', 'Start:')} </span>{getLocationName(startId)}</div>
        {endId && <div><span className="font-bold text-slate-800">{t('Kết thúc:', 'End:')} </span>{getLocationName(endId)}</div>}
        <div><span className="font-bold text-slate-800">{t('Bản đồ đang tô sáng:', 'Map highlighting:')} </span>{activePreviewCase?.title ?? t('Chưa có tình huống thử hợp lệ', 'No valid trial case yet')}</div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {t('Chạy thử vài trường hợp', 'Trial cases')}
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
                  {item.valid ? (item.totalDistanceKm !== null ? `${item.totalDistanceKm.toFixed(1)} km` : t('Hợp lệ', 'Valid')) : t('Thiếu cạnh', 'Missing edge')}
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
        <Play className="h-4 w-4" /> {t('Giải bài toán và ra kết quả cuối', 'Solve and get final result')}
      </button>
    </div>
  );

  const resultSummaryPanel = result ? (
    <SolutionPanel
      result={result}
      currentStepIdx={currentStepIdx}
      appMode={appMode}
      locations={locations}
      routes={routes}
      detailMode="result"
    />
  ) : null;

  const desktopResultSummaryPanel = result ? (
    <SolutionPanel
      result={result}
      currentStepIdx={currentStepIdx}
      appMode={appMode}
      locations={locations}
      routes={routes}
      detailMode="result"
      showResolvedPathHeader={false}
    />
  ) : null;

  const resultMethodPanel = result ? (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
      {appMode === 'subset' && (
        <div className="border-b border-slate-100 bg-white px-4 py-3">
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600">
                  <Clock3 className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{t('Cách giải', 'Method')}</div>
                  <div className="text-sm font-bold text-slate-800">{t('Mô phỏng Dijkstra', 'Dijkstra Simulation')}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNarrationEnabled(enabled => !enabled)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold transition-colors ${
                  isNarrationEnabled ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-500 border border-slate-200'
                }`}
              >
                {isNarrationEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                {isNarrationEnabled ? t('Đọc', 'On') : t('Tắt', 'Off')}
              </button>
            </div>

          </div>
        </div>
      )}

      <SolutionPanel
        result={result}
        currentStepIdx={currentStepIdx}
        appMode={appMode}
        locations={locations}
        routes={routes}
        detailMode="method"
      />
      {appMode === 'subset' && !isDesktopSubsetMethod && !isMobileSubsetMethod && (
        <StepNavigator
          totalSteps={totalSteps}
          currentIdx={currentStepIdx}
          onPrev={handlePrevStep}
          onNext={handleNextStep}
          onJump={handleJumpToStep}
          isPlaying={isPlayingSteps}
          onPlayToggle={() => setIsPlayingSteps(playing => !playing)}
          playSpeedMs={playSpeedMs}
          onSpeedChange={setPlaySpeedMs}
        />
      )}
    </div>
  ) : null;

  const desktopResultPanel = stage === 'result' && result ? (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-[26px] border border-white/75 bg-white/95 shadow-[0_20px_40px_rgba(15,23,42,0.16)] backdrop-blur">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{t('Kết quả tích hợp trên bản đồ', 'Result overlaid on map')}</div>
        <div className="mt-3">
          <ResultViewSwitch
            activeTab={desktopResultTab}
            onChange={setDesktopResultTab}
            methodLabel={methodTabLabel}
            summaryLabel={summaryLabel}
            showMethodTab={hasSeparateMethodTab}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {hasSeparateMethodTab
          ? (desktopResultTab === 'method' ? resultMethodPanel : desktopResultSummaryPanel)
          : resultMethodPanel}
      </div>
    </div>
  ) : null;

  const mobileResultOverlay = stage === 'result' && result ? (
    <div className="overflow-hidden rounded-[28px] border border-[#e5ddd0] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <ResultViewSwitch
            activeTab={mobileStageTab === 'method' ? 'method' : 'summary'}
            onChange={tab => setMobileStageTab(tab)}
            methodLabel={methodTabLabel}
            summaryLabel={summaryLabel}
            showMethodTab={hasSeparateMethodTab}
          />
        </div>
      </div>

      <div className="overflow-y-auto">
        {hasSeparateMethodTab
          ? (mobileStageTab === 'method' ? resultMethodPanel : resultSummaryPanel)
          : resultMethodPanel}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col overflow-hidden bg-[linear-gradient(180deg,#fbf8f3_0%,#f5efe5_100%)] md:min-h-[44rem]">
      {/* Top bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#e5ddd0] bg-white/88 px-4 py-3 backdrop-blur">
        <button onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" />
          {stage === 'result' ? t('Quay lại xem trước', 'Back to preview') : t('Quay lại chỉnh điểm', 'Back to selection')}
        </button>
        <div className={`rounded-full px-2.5 py-1 text-xs font-bold text-white ${MODE_LABEL[appMode].color}`}>
          {MODE_LABEL[appMode].label}
        </div>
        <div className={`rounded-full px-2.5 py-1 text-xs font-bold ${stage === 'result' ? 'bg-slate-900 text-white' : 'border border-sky-200 bg-sky-50 text-sky-700'}`}>
          {stage === 'result' ? t('Bước 3 — Kết quả cuối', 'Step 3 — Final result') : t('Bước 2 — Xem trước đồ thị', 'Step 2 — Graph preview')}
        </div>

        {/* ⭐ Ràng buộc cốt lõi — badge nổi bật */}
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
          <ShieldCheck className="w-3.5 h-3.5" />
          {appMode === 'subset' ? t('Không cần đi qua tất cả điểm', 'No need to visit all stops') : t('Mỗi điểm chỉ đi qua 1 lần', 'Each stop visited exactly once')}
        </div>

        <div className="ml-auto rounded-full bg-[#f7f1e7] px-3 py-1 text-xs text-slate-500">
          {locations.length} {t('điểm', 'nodes')} · {stage === 'result' ? `${displayRoutes.length} ${t('chặng thuộc kết quả', 'result edges')}` : `${routes.length} ${t('cạnh đang hiển thị', 'edges shown')}`}
        </div>

        {stage === 'preview' && (
          <button
            onClick={onSolve}
            className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700"
          >
            <Play className="w-3.5 h-3.5" /> {t('Giải bài toán', 'Solve')}
          </button>
        )}

        <button
          onClick={() => setIsPresentationOpen(true)}
          className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
          title={t('Mở trình chiếu lộ trình', 'Open route presentation')}
        >
          <Clapperboard className="w-3.5 h-3.5" /> {t('Trình chiếu', 'Present')}
        </button>

        {stage === 'result' ? (
          <button onClick={onRerun}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-emerald-600">
            <RotateCcw className="w-3.5 h-3.5" /> {t('Giải lại', 'Re-solve')}
          </button>
        ) : (
          <button
            onClick={() => setActivePreviewCaseId(previewCases[0]?.id ?? 'selection-order')}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
          >
            <RotateCcw className="w-3.5 h-3.5" /> {t('Làm mới xem trước', 'Refresh preview')}
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
          activePath={presentationPath}
          totalDistanceKm={stage === 'result' && result ? result.totalDistanceKm : activePreviewCase?.totalDistanceKm ?? 0}
        />,
        document.body,
      )}

      {/* Main content */}
      <div className="md:hidden flex-1 overflow-y-auto bg-[#f8f6f1] px-3 py-3">
        <div className="space-y-3">
          <div className="rounded-[28px] border border-[#e5ddd0] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  {stage === 'result' ? t('Bản đồ kết quả', 'Result map') : t('Bản đồ xem trước', 'Preview map')}
                </div>
                <div className="mt-1 text-sm font-semibold text-slate-700">
                  {stage === 'result' ? t('Bản đồ luôn hiển thị để theo dõi lời giải', 'Map stays visible to track the solution') : t('Kiểm tra đồ thị trước khi chốt lời giải', 'Inspect the graph before finalising')}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMobileInsightOpen(open => !open)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  <Info className="h-3.5 w-3.5" />
                  {isMobileInsightOpen ? t('Ẩn chi tiết', 'Hide detail') : t('Chi tiết', 'Detail')}
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileMapExpanded(expanded => !expanded)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700"
                >
                  {isMobileMapExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  {isMobileMapExpanded ? t('Thu gọn', 'Collapse') : t('Mở rộng', 'Expand')}
                </button>
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <div className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
                  {locations.length} {t('điểm', 'nodes')}
                </div>
                <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                  {stage === 'result' ? `${displayRoutes.length} ${t('chặng đang tô', 'highlighted')}` : `${routes.length} ${t('cạnh đang xem', 'edges shown')}`}
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  {stage === 'result' ? t('Đang theo lời giải', 'Following solution') : t('Đang ở bước xem trước', 'In preview step')}
                </div>
              </div>
            </div>

            {isMobileSubsetMethod && (
              <div className="border-t border-slate-100 bg-gradient-to-b from-white to-slate-50/70 px-4 py-3">
                <div className="space-y-3 rounded-[22px] border border-slate-200 bg-white/95 p-3 shadow-[0_12px_26px_rgba(15,23,42,0.06)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div className="rounded-xl bg-indigo-100 p-2 text-indigo-600">
                        <Clock3 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">{t('Mô phỏng trực quan', 'Visual simulation')}</div>
                        <div className="truncate text-sm font-bold text-slate-800">{t('Điều khiển bản đồ theo từng bước', 'Map follows each step')}</div>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                      {t(`Bước ${currentStepIdx + 1} / ${Math.max(totalSteps, 1)}`, `Step ${currentStepIdx + 1} / ${Math.max(totalSteps, 1)}`)}
                    </div>
                  </div>

                  <StepNavigator
                    totalSteps={totalSteps}
                    currentIdx={currentStepIdx}
                    onPrev={handlePrevStep}
                    onNext={handleNextStep}
                    onJump={handleJumpToStep}
                    isPlaying={isPlayingSteps}
                    onPlayToggle={() => setIsPlayingSteps(playing => !playing)}
                    playSpeedMs={playSpeedMs}
                    onSpeedChange={setPlaySpeedMs}
                    compact
                    layout="toolbar"
                  />
                </div>
              </div>
            )}

            <div className={`relative overflow-hidden ${isMobileMapExpanded ? 'h-[76svh] min-h-[480px]' : 'h-[58svh] min-h-[380px]'}`}>
              <MapCanvas
                locations={locations}
                routes={displayRoutes}
                appMode={appMode}
                uiMode="view"
                startId={startId}
                endId={endId}
                selectedSubset={locations.map(l => l.id)}
                currentStep={visibleCurrentStep}
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
                compactNodeLabels={isMobileSubsetMethod}
                fitPadding={isMobileSubsetMethod ? 18 : 28}
                singleLocationZoom={isMobileSubsetMethod ? 15 : 16}
                defaultShowDistanceLabels={!isMobileSubsetMethod}
                subtleWeightLabels={isMobileSubsetMethod}
                hideScaleControl={isMobileSubsetMethod}
              />

              {/* map only — insight panel moved below */}
            </div>
          </div>

          {isMobileInsightOpen && (
            <div className="overflow-hidden rounded-[28px] border border-[#e5ddd0] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">{t('Hồ sơ điểm đến', 'Location profile')}</div>
                <button
                  type="button"
                  onClick={() => setIsMobileInsightOpen(false)}
                  aria-label={t('Đóng hồ sơ điểm đến', 'Close location profile')}
                  title={t('Đóng hồ sơ điểm đến', 'Close location profile')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-4">
                <LocationInsightPanel
                  selectedElement={selectedElement}
                  locations={locations}
                  routes={displayRoutes}
                  appMode={appMode}
                />
              </div>
            </div>
          )}

          {isMobileMapExpanded ? (
            <button
              type="button"
              onClick={() => setIsMobileMapExpanded(false)}
              className="flex w-full items-center justify-center rounded-[22px] border border-[#e5ddd0] bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.05)]"
            >
              {t('Thu bản đồ để xem bảng chi tiết', 'Collapse map to view detail panel')}
            </button>
          ) : (
            <>
              {stage === 'preview' && previewStagePanel}
              {stage === 'result' && mobileResultOverlay}
            </>
          )}
        </div>
      </div>

      <div className={`hidden md:grid min-h-[44rem] flex-1 gap-3 overflow-hidden p-3 ${stage === 'result' ? 'grid-cols-1' : isDesktopSubsetMethod ? 'grid-cols-[minmax(0,1fr)_26rem]' : 'grid-cols-[minmax(0,1fr)_24rem]'}`}>
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden gap-3">
          {stage === 'result' ? (
            <>
              <div className="relative flex min-h-[44rem] flex-1 flex-col overflow-hidden rounded-[32px] border border-[#e5ddd0] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{t('Bản đồ kết quả', 'Result map')}</div>
                    <div className="mt-1 text-base font-bold text-slate-800">
                      {appMode === 'cycle' ? t('Theo dõi chu trình tối ưu', 'Tracking optimal cycle') : appMode === 'path' ? t('Theo dõi đường đi Hamilton', 'Tracking Hamiltonian path') : t('Theo dõi đường đi ngắn nhất', 'Tracking shortest path')}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                      {locations.length} {t('điểm', 'nodes')}
                    </div>
                    <div className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      {displayRoutes.length} {t('chặng đang tô', 'highlighted')}
                    </div>
                  </div>
                </div>

                {appMode === 'subset' && desktopResultTab === 'method' && (
                  <div className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/60 px-5 py-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                      <div className="flex min-w-0 items-center gap-3 xl:w-[19rem] xl:flex-none">
                        <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
                          <Clock3 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{t('Mô phỏng trực quan', 'Visual simulation')}</div>
                          <div className="mt-1 truncate text-base font-bold text-slate-800">{t('Bản đồ nhảy theo từng bước giải', 'Map follows each algorithm step')}</div>
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {t(`Bước ${currentStepIdx + 1} / ${Math.max(totalSteps, 1)}`, `Step ${currentStepIdx + 1} / ${Math.max(totalSteps, 1)}`)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <StepNavigator
                            totalSteps={totalSteps}
                            currentIdx={currentStepIdx}
                            onPrev={handlePrevStep}
                            onNext={handleNextStep}
                            onJump={handleJumpToStep}
                            isPlaying={isPlayingSteps}
                            onPlayToggle={() => setIsPlayingSteps(playing => !playing)}
                            playSpeedMs={playSpeedMs}
                            onSpeedChange={setPlaySpeedMs}
                            compact
                            layout="toolbar"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="relative min-h-0 flex-1 overflow-hidden bg-[#f8f6f1]">
                  <MapCanvas
                    locations={locations}
                    routes={displayRoutes}
                    appMode={appMode}
                    uiMode="view"
                    startId={startId}
                    endId={endId}
                    selectedSubset={locations.map(l => l.id)}
                    currentStep={visibleCurrentStep}
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
                  <div className="absolute left-4 top-4 z-[610] w-[22rem] max-h-[calc(100%-2rem)] overflow-y-auto rounded-[24px] border border-white/75 bg-white/94 p-3 shadow-[0_16px_34px_rgba(15,23,42,0.14)] backdrop-blur">
                      <LocationInsightPanel
                        selectedElement={selectedElement}
                        locations={locations}
                        routes={displayRoutes}
                        appMode={appMode}
                      />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[30px] border border-[#e5ddd0] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
                {desktopResultPanel}
              </div>
            </>
          ) : isDesktopSubsetMethod ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 bg-gradient-to-b from-white to-slate-50/60 px-5 py-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                  <div className="flex min-w-0 items-center gap-3 xl:w-[19rem] xl:flex-none">
                    <div className="rounded-2xl bg-indigo-100 p-2 text-indigo-600">
                      <Clock3 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{t('Mô phỏng trực quan', 'Visual simulation')}</div>
                      <div className="mt-1 truncate text-base font-bold text-slate-800">{t('Bản đồ nhảy theo từng bước giải', 'Map follows each algorithm step')}</div>
                    </div>
                  </div>

                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {t(`Bước ${currentStepIdx + 1} / ${Math.max(totalSteps, 1)}`, `Step ${currentStepIdx + 1} / ${Math.max(totalSteps, 1)}`)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <StepNavigator
                        totalSteps={totalSteps}
                        currentIdx={currentStepIdx}
                        onPrev={handlePrevStep}
                        onNext={handleNextStep}
                        onJump={handleJumpToStep}
                        isPlaying={isPlayingSteps}
                        onPlayToggle={() => setIsPlayingSteps(playing => !playing)}
                        playSpeedMs={playSpeedMs}
                        onSpeedChange={setPlaySpeedMs}
                        compact
                        layout="toolbar"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative min-h-0 flex-1 overflow-hidden">
                <MapCanvas
                  locations={locations}
                  routes={displayRoutes}
                  appMode={appMode}
                  uiMode="view"
                  startId={startId}
                  endId={endId}
                  selectedSubset={locations.map(l => l.id)}
                  currentStep={visibleCurrentStep}
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
            </div>
          ) : (
            <div className="relative min-h-[44rem] flex-1 overflow-hidden rounded-[30px] border border-[#e5ddd0] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
              <MapCanvas
                locations={locations}
                routes={displayRoutes}
                appMode={appMode}
                uiMode="view"
                startId={startId}
                endId={endId}
                selectedSubset={locations.map(l => l.id)}
                currentStep={visibleCurrentStep}
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
          )}
        </main>

        {stage !== 'result' ? (
          <aside className="flex min-w-0 flex-col overflow-hidden rounded-[30px] border border-[#e5ddd0] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)] [contain:layout]">
            <div className="border-b border-slate-100 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('Xem trước bài toán', 'Problem preview')}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {previewStagePanel}
            </div>
          </aside>
        ) : null}
      </div>

    </div>
  );
};
