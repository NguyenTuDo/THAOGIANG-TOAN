import { TouristLocation, Route, AppMode, AlgorithmStep } from '../types';

export const CATEGORY_COLORS: Record<string, string> = {
  'Danh lam thắng cảnh': '#0ea5e9',
  'Ẩm thực': '#f97316',
  'Mua sắm': '#a855f7',
  'Bảo tàng': '#14b8a6',
  'Công viên': '#22c55e',
  'Khách sạn': '#f59e0b',
};

export function getNodeColor(
  loc: TouristLocation,
  currentStep: AlgorithmStep | null,
  highlightPath: string[],
  startId: string,
  endId: string | null,
  appMode: AppMode,
  selectedSubset: string[],
): { fill: string; ring: string; ringWidth: number } {
  const id = loc.id;
  const subsetBaseFill = '#0f766e';

  const snapshot = currentStep?.distanceSnapshot?.find(item => item.nodeId === id);

  if (appMode === 'subset' && snapshot) {
    if (snapshot.status === 'current') {
      return { fill: subsetBaseFill, ring: '#f59e0b', ringWidth: 6 };
    }
    if (snapshot.status === 'settled') {
      return { fill: subsetBaseFill, ring: '#d1fae5', ringWidth: 5 };
    }
    if (snapshot.status === 'target') {
      return { fill: subsetBaseFill, ring: '#f8fafc', ringWidth: 6 };
    }
    if (snapshot.status === 'frontier') {
      return { fill: subsetBaseFill, ring: '#93c5fd', ringWidth: 4 };
    }
    return { fill: subsetBaseFill, ring: '#cbd5e1', ringWidth: 3 };
  }

  if (appMode === 'subset') {
    if (id === startId) return { fill: subsetBaseFill, ring: '#d1fae5', ringWidth: 5 };
    if (id === endId) return { fill: subsetBaseFill, ring: '#f8fafc', ringWidth: 5 };
    return { fill: subsetBaseFill, ring: '#cbd5e1', ringWidth: 3 };
  }

  if (currentStep) {
    if (currentStep.currentNodeId === id) {
      return { fill: currentStep.isBacktracking ? '#ef4444' : '#f59e0b', ring: currentStep.isBacktracking ? '#fca5a5' : '#fde68a', ringWidth: 5 };
    }
    if (currentStep.path.includes(id)) {
      return { fill: '#10b981', ring: '#6ee7b7', ringWidth: 3 };
    }
  }

  if (highlightPath.length > 0 && highlightPath.includes(id)) {
    return { fill: '#10b981', ring: '#6ee7b7', ringWidth: 3 };
  }

  if (id === startId) return { fill: '#3b82f6', ring: '#93c5fd', ringWidth: 4 };
  if (appMode === 'path' && id === endId) return { fill: '#f43f5e', ring: '#fda4af', ringWidth: 4 };

  return { fill: CATEGORY_COLORS[loc.category] ?? '#64748b', ring: '', ringWidth: 0 };
}

export function getEdgeColor(
  route: Route,
  currentStep: AlgorithmStep | null,
  highlightPath: string[],
): { stroke: string; width: number; dashed: boolean } {
  const { from, to } = route;

  const evaluation = currentStep?.edgeEvaluations?.find(item => (
    (item.fromId === from && item.toId === to) ||
    (item.fromId === to && item.toId === from)
  ));

  if (evaluation) {
    return evaluation.accepted
      ? { stroke: '#2563eb', width: 6, dashed: false }
      : { stroke: '#f59e0b', width: 4.5, dashed: true };
  }

  if (currentStep) {
    const path = currentStep.path;
    for (let i = 0; i < path.length - 1; i++) {
      if ((path[i] === from && path[i+1] === to) || (path[i] === to && path[i+1] === from)) {
        return { stroke: currentStep.isBacktracking ? '#ef4444' : '#10b981', width: 3, dashed: false };
      }
    }
  }

  if (highlightPath.length > 1) {
    for (let i = 0; i < highlightPath.length - 1; i++) {
      if (
        (highlightPath[i] === from && highlightPath[i+1] === to) ||
        (highlightPath[i] === to && highlightPath[i+1] === from)
      ) {
        return { stroke: '#111827', width: 4.5, dashed: false };
      }
    }
  }

  return { stroke: '#0f172a', width: 1.8, dashed: false };
}
