/**
 * Bài 2 — Đường đi Hamilton ngắn nhất từ A đến B
 * Adapted from hamilton-path-with-ai/services/hamiltonian.ts
 *
 * KHÁC BIỆT SO VỚI BẢN GỐC:
 * Bản gốc dùng early-return (return true) khi tìm thấy đường đi đầu tiên.
 * Phiên bản này thu thập TẤT CẢ đường đi, sau đó lọc lấy ngắn nhất.
 */

import { TouristLocation, Route, AlgorithmResult, AlgorithmStep } from '../types';

const MAX_STEPS = 150_000;

export function findShortestHamiltonianPath(
  locations: TouristLocation[],
  routes: Route[],
  startId: string,
  endId: string
): AlgorithmResult {
  if (startId === endId) {
    return {
      found: false,
      allCycles: [],
      allPaths: [],
      shortestCycles: [],
      shortestPath: [],
      totalDistanceKm: 0,
      steps: [{
        type: 'no_solution',
        currentNodeId: null,
        path: [],
        totalWeight: 0,
        explanation: 'Điểm bắt đầu và kết thúc phải khác nhau.',
        isBacktracking: false,
      }],
    };
  }

  const allPaths: { path: string[]; weight: number }[] = [];
  const steps: AlgorithmStep[] = [];
  const visited = new Set<string>();
  const currentPath: string[] = [];
  let stepCount = 0;

  const getName = (id: string) =>
    locations.find(l => l.id === id)?.fullName ?? id;

  // Build adjacency
  const adj = new Map<string, { to: string; dist: number }[]>();
  for (const loc of locations) adj.set(loc.id, []);
  for (const r of routes) {
    adj.get(r.from)?.push({ to: r.to, dist: r.distanceKm });
    adj.get(r.to)?.push({ to: r.from, dist: r.distanceKm });
  }

  let aborted = false;

  function backtrack(currentId: string, currentWeight: number): void {
    if (aborted) return;
    if (stepCount >= MAX_STEPS) { aborted = true; return; }

    visited.add(currentId);
    currentPath.push(currentId);
    stepCount++;

    const explanation =
      currentPath.length === 1
        ? `Bắt đầu từ "${getName(currentId)}".`
        : `Đến "${getName(currentId)}" (tổng: ${currentWeight.toFixed(1)} km).`;

    steps.push({
      type: 'visit',
      currentNodeId: currentId,
      path: [...currentPath],
      totalWeight: currentWeight,
      explanation,
      isBacktracking: false,
    });

    if (currentPath.length === locations.length) {
      // Đã đi qua tất cả điểm — kiểm tra điểm kết thúc có đúng không
      if (currentId === endId) {
        allPaths.push({ path: [...currentPath], weight: currentWeight });
        steps.push({
          type: 'found',
          currentNodeId: currentId,
          path: [...currentPath],
          totalWeight: currentWeight,
          explanation: `✓ Tìm thấy đường đi! ${currentPath.map(getName).join(' → ')} (${currentWeight.toFixed(1)} km).`,
          isBacktracking: false,
        });
      } else {
        steps.push({
          type: 'backtrack',
          currentNodeId: currentId,
          path: [...currentPath],
          totalWeight: currentWeight,
          explanation: `Đã đi qua tất cả điểm nhưng kết thúc tại "${getName(currentId)}", không phải "${getName(endId)}". Quay lui.`,
          isBacktracking: true,
        });
      }
    } else {
      const neighbors = adj.get(currentId) ?? [];
      for (const { to, dist } of neighbors) {
        if (!visited.has(to) && !aborted) {
          backtrack(to, currentWeight + dist);
        }
      }
    }

    visited.delete(currentId);
    currentPath.pop();

    if (!aborted && currentPath.length > 0) {
      steps.push({
        type: 'backtrack',
        currentNodeId: currentId,
        path: [...currentPath],
        totalWeight: currentWeight,
        explanation: `Quay lui từ "${getName(currentId)}".`,
        isBacktracking: true,
      });
    }
  }

  backtrack(startId, 0);

  if (aborted) {
    steps.push({
      type: 'no_solution',
      currentNodeId: null,
      path: [],
      totalWeight: 0,
      explanation: `⚠️ Số bước vượt quá giới hạn (${MAX_STEPS.toLocaleString()}). Đồ thị quá phức tạp.`,
      isBacktracking: false,
    });
    return { found: false, allCycles: [], allPaths: [], shortestCycles: [], shortestPath: [], totalDistanceKm: 0, steps };
  }

  if (allPaths.length === 0) {
    steps.push({
      type: 'no_solution',
      currentNodeId: null,
      path: [],
      totalWeight: 0,
      explanation: `Không tìm thấy đường đi Hamilton nào từ "${getName(startId)}" đến "${getName(endId)}".`,
      isBacktracking: false,
    });
    return { found: false, allCycles: [], allPaths: [], shortestCycles: [], shortestPath: [], totalDistanceKm: 0, steps };
  }

  const minWeight = Math.min(...allPaths.map(p => p.weight));
  const best = allPaths.find(p => Math.abs(p.weight - minWeight) < 0.001)!;

  steps.push({
    type: 'found',
    currentNodeId: endId,
    path: best.path,
    totalWeight: minWeight,
    explanation: `🏆 Hoàn thành! Tìm thấy ${allPaths.length} đường đi, đường ngắn nhất: ${minWeight.toFixed(1)} km.`,
    isBacktracking: false,
  });

  return {
    found: true,
    allCycles: [],
    allPaths: [...allPaths].sort((a, b) => a.weight - b.weight),
    shortestCycles: [],
    shortestPath: best.path,
    totalDistanceKm: minWeight,
    steps,
  };
}
