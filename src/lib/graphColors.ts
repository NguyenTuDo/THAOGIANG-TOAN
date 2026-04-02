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
  if (appMode === 'subset' && selectedSubset.includes(id)) {
    return { fill: '#8b5cf6', ring: '#c4b5fd', ringWidth: 3 };
  }

  return { fill: CATEGORY_COLORS[loc.category] ?? '#64748b', ring: '', ringWidth: 0 };
}

export function getEdgeColor(
  route: Route,
  currentStep: AlgorithmStep | null,
  highlightPath: string[],
): { stroke: string; width: number; dashed: boolean } {
  const { from, to } = route;

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
        return { stroke: '#ef4444', width: 4.5, dashed: false };
      }
    }
  }

  return { stroke: '#94a3b8', width: 1.5, dashed: false };
}
