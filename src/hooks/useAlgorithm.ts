import { useCallback } from 'react';
import { AppMode, GraphData, AlgorithmResult } from '../types';
import { findShortestHamiltonianCycle } from '../algorithms/hamiltonianCycle';
import { findShortestHamiltonianPath } from '../algorithms/hamiltonianPath';
import { findShortestSubsetRoute } from '../algorithms/subsetRoute';

interface UseAlgorithmProps {
  graphData: GraphData;
  appMode: AppMode;
  startId: string;
  endId: string | null;
  selectedSubset: string[];
  setResult: (r: AlgorithmResult | null) => void;
  setCurrentStepIdx: (i: number) => void;
}

export function useAlgorithm({
  graphData,
  appMode,
  startId,
  endId,
  selectedSubset,
  setResult,
  setCurrentStepIdx,
}: UseAlgorithmProps) {
  const runAlgorithm = useCallback(() => {
    if (!startId) return;

    let result: AlgorithmResult;

    if (appMode === 'cycle') {
      result = findShortestHamiltonianCycle(
        graphData.locations,
        graphData.routes,
        startId
      );
    } else if (appMode === 'path') {
      if (!endId) return;
      result = findShortestHamiltonianPath(
        graphData.locations,
        graphData.routes,
        startId,
        endId
      );
    } else {
      if (!endId) return;
      const allowedIds = selectedSubset.length > 0
        ? selectedSubset
        : graphData.locations.map(location => location.id);
      const subsetLocations = graphData.locations.filter(location => allowedIds.includes(location.id));
      const subsetRoutes = graphData.routes.filter(route => allowedIds.includes(route.from) && allowedIds.includes(route.to));
      result = findShortestSubsetRoute(
        subsetLocations,
        subsetRoutes,
        startId,
        endId
      );
    }

    setResult(result);
    setCurrentStepIdx(0);
  }, [graphData, appMode, startId, endId, selectedSubset, setResult, setCurrentStepIdx]);

  const resetResult = useCallback(() => {
    setResult(null);
    setCurrentStepIdx(0);
  }, [setResult, setCurrentStepIdx]);

  return { runAlgorithm, resetResult };
}
