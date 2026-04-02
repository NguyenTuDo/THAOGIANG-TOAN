/**
 * Bài 1 — Chu trình Hamilton ngắn nhất
 * Adapted from remix_-hamilton-graph-solver/src/algorithms.ts
 *
 * Tìm TẤT CẢ chu trình Hamilton (đi qua mọi điểm, quay về điểm xuất phát),
 * sau đó lọc lấy các chu trình có tổng khoảng cách ngắn nhất.
 */

import { TouristLocation, Route, AlgorithmResult, AlgorithmStep } from '../types';

const MAX_STEPS = 150_000;

export function findShortestHamiltonianCycle(
  locations: TouristLocation[],
  routes: Route[],
  startId: string
): AlgorithmResult {
  const allCycles: { path: string[]; weight: number }[] = [];
  const steps: AlgorithmStep[] = [];
  const visited = new Set<string>();
  const currentPath: string[] = [];
  let stepCount = 0;

  const getName = (id: string) =>
    locations.find(l => l.id === id)?.fullName ?? id;

  // Build adjacency: id → [{neighborId, distanceKm}]
  const adj = new Map<string, { to: string; dist: number }[]>();
  for (const loc of locations) adj.set(loc.id, []);
  for (const r of routes) {
    adj.get(r.from)?.push({ to: r.to, dist: r.distanceKm });
    adj.get(r.to)?.push({ to: r.from, dist: r.distanceKm });
  }

  function backtrack(currentId: string, currentWeight: number): boolean {
    if (stepCount >= MAX_STEPS) return true; // signal abort

    visited.add(currentId);
    currentPath.push(currentId);
    stepCount++;

    const explanation =
      currentPath.length === 1
        ? `Bắt đầu từ "${getName(currentId)}".`
        : `Đến "${getName(currentId)}" (cộng thêm ${
            routes.find(
              r =>
                (r.from === currentPath[currentPath.length - 2] && r.to === currentId) ||
                (r.to === currentPath[currentPath.length - 2] && r.from === currentId)
            )?.distanceKm.toFixed(1) ?? '?'
          } km, tổng: ${currentWeight.toFixed(1)} km).`;

    steps.push({
      type: 'visit',
      currentNodeId: currentId,
      path: [...currentPath],
      totalWeight: currentWeight,
      explanation,
      isBacktracking: false,
    });

    if (currentPath.length === locations.length) {
      // Kiểm tra có cạnh quay về điểm xuất phát không
      const returnRoute = routes.find(
        r =>
          (r.from === currentId && r.to === startId) ||
          (r.to === currentId && r.from === startId)
      );

      if (returnRoute) {
        const finalWeight = currentWeight + returnRoute.distanceKm;
        const finalPath = [...currentPath, startId];

        // Loại bỏ chu trình đảo ngược (A→B→C→A ≡ A→C→B→A)
        const isReverse = allCycles.some(({ path: p }) => {
          if (p.length !== finalPath.length) return false;
          for (let i = 0; i < p.length; i++) {
            if (p[i] !== finalPath[finalPath.length - 1 - i]) return false;
          }
          return true;
        });

        if (!isReverse) {
          allCycles.push({ path: finalPath, weight: finalWeight });
          const uniqueVisitNames = currentPath.map(getName).join(' → ');
          steps.push({
            type: 'found',
            currentNodeId: startId,
            path: finalPath,
            totalWeight: finalWeight,
            explanation: `✓ Tìm thấy chu trình! ${uniqueVisitNames}, rồi khép vòng về "${getName(startId)}" (${finalWeight.toFixed(1)} km).`,
            isBacktracking: false,
          });
        }
      } else {
        steps.push({
          type: 'backtrack',
          currentNodeId: currentId,
          path: [...currentPath],
          totalWeight: currentWeight,
          explanation: `Đã đến tất cả các điểm nhưng không có đường quay về "${getName(startId)}". Quay lui.`,
          isBacktracking: true,
        });
      }
    } else {
      const neighbors = adj.get(currentId) ?? [];
      for (const { to, dist } of neighbors) {
        if (!visited.has(to)) {
          const aborted = backtrack(to, currentWeight + dist);
          if (aborted) return true;
        }
      }
    }

    visited.delete(currentId);
    currentPath.pop();

    if (currentPath.length > 0 && stepCount < MAX_STEPS) {
      steps.push({
        type: 'backtrack',
        currentNodeId: currentId,
        path: [...currentPath],
        totalWeight: currentWeight,
        explanation: `Quay lui từ "${getName(currentId)}".`,
        isBacktracking: true,
      });
    }

    return false;
  }

  const aborted = backtrack(startId, 0);

  if (aborted) {
    steps.push({
      type: 'no_solution',
      currentNodeId: null,
      path: [],
      totalWeight: 0,
      explanation: `⚠️ Số bước vượt quá giới hạn (${MAX_STEPS.toLocaleString()}). Đồ thị quá phức tạp.`,
      isBacktracking: false,
    });
    return { found: false, allCycles: [], shortestCycles: [], shortestPath: [], totalDistanceKm: 0, steps };
  }

  if (allCycles.length === 0) {
    steps.push({
      type: 'no_solution',
      currentNodeId: null,
      path: [],
      totalWeight: 0,
      explanation: 'Không tìm thấy chu trình Hamilton nào trong đồ thị này.',
      isBacktracking: false,
    });
    return { found: false, allCycles: [], shortestCycles: [], shortestPath: [], totalDistanceKm: 0, steps };
  }

  // Lọc chu trình ngắn nhất
  const minWeight = Math.min(...allCycles.map(c => c.weight));
  const shortestCycles = allCycles.filter(c => Math.abs(c.weight - minWeight) < 0.001).map(c => c.path);

  steps.push({
    type: 'found',
    currentNodeId: startId,
    path: shortestCycles[0],
    totalWeight: minWeight,
    explanation: `🏆 Hoàn thành! Tìm thấy ${allCycles.length} chu trình, trong đó ${shortestCycles.length} chu trình ngắn nhất với ${minWeight.toFixed(1)} km.`,
    isBacktracking: false,
  });

  // Sắp xếp toàn bộ chu trình theo khoảng cách tăng dần
  const sortedAllCycles = [...allCycles].sort((a, b) => a.weight - b.weight);

  return {
    found: true,
    allCycles: sortedAllCycles,
    shortestCycles,
    shortestPath: [],
    totalDistanceKm: minWeight,
    steps,
  };
}
