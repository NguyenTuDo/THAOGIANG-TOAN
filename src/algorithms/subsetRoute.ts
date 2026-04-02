/**
 * Bài 3 — Đường đi ngắn nhất từ điểm đầu đến điểm cuối
 * nhưng chỉ trong tập địa điểm đã chọn.
 * Không bắt buộc đi qua toàn bộ điểm trong tập đó.
 */

import { TouristLocation, Route, AlgorithmResult, AlgorithmStep } from '../types';

function reconstructPath(previous: Map<string, string | null>, targetId: string): string[] {
  const path: string[] = [];
  let currentId: string | null = targetId;

  while (currentId) {
    path.unshift(currentId);
    currentId = previous.get(currentId) ?? null;
  }

  return path;
}

export function findShortestSubsetRoute(
  allLocations: TouristLocation[],
  allRoutes: Route[],
  startId: string,
  endId: string
): AlgorithmResult {
  const errorStep = (msg: string): AlgorithmStep => ({
    type: 'no_solution',
    currentNodeId: null,
    path: [],
    totalWeight: 0,
    explanation: msg,
    isBacktracking: false,
  });

  const getName = (id: string) => allLocations.find(location => location.id === id)?.fullName ?? id;

  if (allLocations.length < 2) {
    return {
      found: false,
      allCycles: [],
      shortestCycles: [],
      shortestPath: [],
      totalDistanceKm: 0,
      steps: [errorStep('Vui lòng chọn ít nhất 2 địa điểm cho Bài 3.')],
    };
  }

  if (startId === endId) {
    return {
      found: false,
      allCycles: [],
      shortestCycles: [],
      shortestPath: [],
      totalDistanceKm: 0,
      steps: [errorStep('Điểm bắt đầu và điểm kết thúc phải khác nhau.')],
    };
  }

  if (!allLocations.some(location => location.id === startId)) {
    return {
      found: false,
      allCycles: [],
      shortestCycles: [],
      shortestPath: [],
      totalDistanceKm: 0,
      steps: [errorStep('Điểm bắt đầu không tồn tại trong dữ liệu hiện tại.')],
    };
  }

  if (!allLocations.some(location => location.id === endId)) {
    return {
      found: false,
      allCycles: [],
      shortestCycles: [],
      shortestPath: [],
      totalDistanceKm: 0,
      steps: [errorStep('Điểm kết thúc không tồn tại trong dữ liệu hiện tại.')],
    };
  }

  const adjacency = new Map<string, { to: string; distanceKm: number }[]>();
  for (const location of allLocations) {
    adjacency.set(location.id, []);
  }

  for (const route of allRoutes) {
    if (!adjacency.has(route.from) || !adjacency.has(route.to)) continue;
    adjacency.get(route.from)?.push({ to: route.to, distanceKm: route.distanceKm });
    adjacency.get(route.to)?.push({ to: route.from, distanceKm: route.distanceKm });
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, string | null>();
  const unvisited = new Set<string>();
  const steps: AlgorithmStep[] = [];

  for (const location of allLocations) {
    distances.set(location.id, Number.POSITIVE_INFINITY);
    previous.set(location.id, null);
    unvisited.add(location.id);
  }

  distances.set(startId, 0);

  while (unvisited.size > 0) {
    let currentId: string | null = null;
    let currentDistance = Number.POSITIVE_INFINITY;

    for (const candidateId of unvisited) {
      const candidateDistance = distances.get(candidateId) ?? Number.POSITIVE_INFINITY;
      if (candidateDistance < currentDistance) {
        currentId = candidateId;
        currentDistance = candidateDistance;
      }
    }

    if (currentId === null || !Number.isFinite(currentDistance)) {
      break;
    }

    const currentPath = reconstructPath(previous, currentId);
    steps.push({
      type: 'visit',
      currentNodeId: currentId,
      path: currentPath,
      totalWeight: currentDistance,
      explanation: currentId === startId
        ? `Bắt đầu tại "${getName(startId)}".`
        : `Đã chốt khoảng cách ngắn nhất tới "${getName(currentId)}": ${currentDistance.toFixed(1)} km.`,
      isBacktracking: false,
    });

    if (currentId === endId) {
      break;
    }

    unvisited.delete(currentId);

    for (const neighbor of adjacency.get(currentId) ?? []) {
      if (!unvisited.has(neighbor.to)) continue;

      const tentativeDistance = currentDistance + neighbor.distanceKm;
      if (tentativeDistance < (distances.get(neighbor.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighbor.to, tentativeDistance);
        previous.set(neighbor.to, currentId);
      }
    }
  }

  const shortestDistance = distances.get(endId) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(shortestDistance)) {
    steps.push(errorStep(`Không tồn tại đường đi từ "${getName(startId)}" đến "${getName(endId)}" trong tập địa điểm đã chọn.`));
    return {
      found: false,
      allCycles: [],
      shortestCycles: [],
      shortestPath: [],
      totalDistanceKm: 0,
      steps,
    };
  }

  const shortestPath = reconstructPath(previous, endId);
  steps.push({
    type: 'found',
    currentNodeId: endId,
    path: shortestPath,
    totalWeight: shortestDistance,
    explanation: `Đường đi ngắn nhất từ "${getName(startId)}" đến "${getName(endId)}" là ${shortestDistance.toFixed(1)} km.`,
    isBacktracking: false,
  });

  return {
    found: true,
    allCycles: [],
    shortestCycles: [],
    shortestPath,
    totalDistanceKm: shortestDistance,
    steps,
  };
}
