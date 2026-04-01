/**
 * Bài 3 — Lộ trình tùy chọn (subset TSP)
 * Người dùng chọn tập con địa điểm muốn đến → tìm vòng kín ngắn nhất trên tập con đó.
 *
 * Wrapper mỏng: lọc locations + routes theo selectedIds, rồi gọi hamiltonianCycle.
 */

import { TouristLocation, Route, AlgorithmResult, AlgorithmStep } from '../types';
import { findShortestHamiltonianCycle } from './hamiltonianCycle';

/** Kiểm tra tập con có liên thông không (BFS/DFS trên subgraph) */
function isConnected(ids: string[], routes: Route[]): boolean {
  if (ids.length <= 1) return true;
  const idSet = new Set(ids);
  const visited = new Set<string>();
  const adj = new Map<string, string[]>();
  for (const id of ids) adj.set(id, []);
  for (const r of routes) {
    if (idSet.has(r.from) && idSet.has(r.to)) {
      adj.get(r.from)?.push(r.to);
      adj.get(r.to)?.push(r.from);
    }
  }
  const stack = [ids[0]];
  while (stack.length > 0) {
    const cur = stack.pop()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    for (const nb of adj.get(cur) ?? []) stack.push(nb);
  }
  return ids.every(id => visited.has(id));
}

export function findShortestSubsetRoute(
  allLocations: TouristLocation[],
  allRoutes: Route[],
  selectedIds: string[],
  startId: string
): AlgorithmResult {
  const errorStep = (msg: string): AlgorithmStep => ({
    type: 'no_solution',
    currentNodeId: null,
    path: [],
    totalWeight: 0,
    explanation: msg,
    isBacktracking: false,
  });

  if (selectedIds.length < 2) {
    return {
      found: false, shortestCycles: [], shortestPath: [], totalDistanceKm: 0,
      steps: [errorStep('Vui lòng chọn ít nhất 2 địa điểm để tìm lộ trình.')],
    };
  }

  if (!selectedIds.includes(startId)) {
    return {
      found: false, shortestCycles: [], shortestPath: [], totalDistanceKm: 0,
      steps: [errorStep('Điểm xuất phát phải nằm trong tập địa điểm đã chọn.')],
    };
  }

  // Kiểm tra liên thông
  if (!isConnected(selectedIds, allRoutes)) {
    return {
      found: false, shortestCycles: [], shortestPath: [], totalDistanceKm: 0,
      steps: [errorStep('Một số địa điểm đã chọn không thể kết nối với nhau qua tập tuyến đường hiện có. Vui lòng thêm tuyến hoặc chọn lại.')],
    };
  }

  const subsetLocations = allLocations.filter(l => selectedIds.includes(l.id));
  const subsetRoutes = allRoutes.filter(
    r => selectedIds.includes(r.from) && selectedIds.includes(r.to)
  );

  return findShortestHamiltonianCycle(subsetLocations, subsetRoutes, startId);
}
