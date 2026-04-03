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
      allPaths: [],
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
      allPaths: [],
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
      allPaths: [],
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
      allPaths: [],
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
  const settled = new Set<string>();
  const steps: AlgorithmStep[] = [];

  const buildSnapshot = (currentNodeId: string | null): AlgorithmStep['distanceSnapshot'] => (
    allLocations.map(location => {
      const distance = distances.get(location.id) ?? Number.POSITIVE_INFINITY;
      let status: 'current' | 'settled' | 'frontier' | 'unreached' | 'target' = 'unreached';

      if (currentNodeId === location.id) {
        status = 'current';
      } else if (settled.has(location.id)) {
        status = 'settled';
      } else if (Number.isFinite(distance)) {
        status = location.id === endId ? 'target' : 'frontier';
      }

      return {
        nodeId: location.id,
        distanceKm: Number.isFinite(distance) ? distance : null,
        previousNodeId: previous.get(location.id) ?? null,
        status,
      };
    })
  );

  for (const location of allLocations) {
    distances.set(location.id, Number.POSITIVE_INFINITY);
    previous.set(location.id, null);
    unvisited.add(location.id);
  }

  distances.set(startId, 0);
  steps.push({
    type: 'inspect',
    currentNodeId: startId,
    path: [startId],
    totalWeight: 0,
    explanation: `Khởi tạo Dijkstra: gán nhãn 0 km cho "${getName(startId)}", các điểm còn lại tạm thời là vô cực. Thuật toán sẽ luôn chọn điểm chưa chốt có nhãn nhỏ nhất để xử lý tiếp.`,
    isBacktracking: false,
    phaseLabel: 'Khởi tạo nhãn khoảng cách',
    distanceSnapshot: buildSnapshot(startId),
  });

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
      steps.push({
        type: 'inspect',
        currentNodeId: null,
        path: reconstructPath(previous, endId),
        totalWeight: 0,
        explanation: 'Không còn điểm chưa chốt nào có nhãn hữu hạn. Điều này cho thấy các điểm còn lại không thể đi tới được từ điểm xuất phát trong đồ thị con đã chọn.',
        isBacktracking: false,
        phaseLabel: 'Dừng do các điểm còn lại bị cô lập',
        distanceSnapshot: buildSnapshot(null),
      });
      break;
    }

    unvisited.delete(currentId);
    settled.add(currentId);

    const currentPath = reconstructPath(previous, currentId);
    steps.push({
      type: 'visit',
      currentNodeId: currentId,
      path: currentPath,
      totalWeight: currentDistance,
      explanation: currentId === startId
        ? `Chọn "${getName(startId)}" vì đây là điểm xuất phát với nhãn nhỏ nhất là 0 km.`
        : `Trong các điểm chưa chốt, "${getName(currentId)}" có nhãn nhỏ nhất là ${currentDistance.toFixed(1)} km nên ta chốt luôn đây là khoảng cách ngắn nhất tới điểm này.`,
      isBacktracking: false,
      phaseLabel: 'Chọn điểm có nhãn nhỏ nhất',
      distanceSnapshot: buildSnapshot(currentId),
    });

    if (currentId === endId) {
      break;
    }

    const edgeEvaluations: NonNullable<AlgorithmStep['edgeEvaluations']> = [];
    for (const neighbor of adjacency.get(currentId) ?? []) {
      if (!unvisited.has(neighbor.to)) continue;

      const previousBest = distances.get(neighbor.to) ?? Number.POSITIVE_INFINITY;
      const tentativeDistance = currentDistance + neighbor.distanceKm;
      const accepted = tentativeDistance < previousBest;

      if (accepted) {
        distances.set(neighbor.to, tentativeDistance);
        previous.set(neighbor.to, currentId);
      }

      edgeEvaluations.push({
        fromId: currentId,
        toId: neighbor.to,
        edgeDistanceKm: neighbor.distanceKm,
        candidateDistanceKm: tentativeDistance,
        previousBestKm: Number.isFinite(previousBest) ? previousBest : null,
        accepted,
        reason: accepted
          ? `Cập nhật vì ${tentativeDistance.toFixed(1)} km ngắn hơn nhãn cũ${Number.isFinite(previousBest) ? ` ${previousBest.toFixed(1)} km` : ' ∞'}.`
          : `Giữ nguyên vì đường mới ${tentativeDistance.toFixed(1)} km không tốt hơn nhãn hiện có${Number.isFinite(previousBest) ? ` ${previousBest.toFixed(1)} km` : ' ∞'}.`,
      });
    }

    if (edgeEvaluations.length > 0) {
      const acceptedCount = edgeEvaluations.filter(item => item.accepted).length;
      steps.push({
        type: acceptedCount > 0 ? 'update' : 'inspect',
        currentNodeId: currentId,
        path: currentPath,
        totalWeight: currentDistance,
        explanation: acceptedCount > 0
          ? `Từ "${getName(currentId)}", thuật toán vừa nới lỏng ${edgeEvaluations.length} cạnh và cập nhật được ${acceptedCount} nhãn khoảng cách tốt hơn.`
          : `Từ "${getName(currentId)}", thuật toán kiểm tra ${edgeEvaluations.length} cạnh kề nhưng không tìm được nhãn nào tốt hơn.`,
        isBacktracking: false,
        phaseLabel: 'Nới lỏng các cạnh kề',
        distanceSnapshot: buildSnapshot(null),
        edgeEvaluations,
      });
    }
  }

  const shortestDistance = distances.get(endId) ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(shortestDistance)) {
    steps.push({
      ...errorStep(`Không tồn tại đường đi từ "${getName(startId)}" đến "${getName(endId)}" trong tập địa điểm đã chọn.`),
      phaseLabel: 'Kết luận không có đường đi',
      distanceSnapshot: buildSnapshot(null),
    });
    return {
      found: false,
      allCycles: [],
      allPaths: [],
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
    explanation: `Hoàn tất. Truy vết ngược từ "${getName(endId)}" qua các mốc trước đó, ta thu được đường đi ngắn nhất ${shortestPath.map(getName).join(' → ')} với tổng ${shortestDistance.toFixed(1)} km.`,
    isBacktracking: false,
    phaseLabel: 'Truy vết và kết luận lời giải',
    distanceSnapshot: buildSnapshot(endId),
  });

  return {
    found: true,
    allCycles: [],
    allPaths: [],
    shortestCycles: [],
    shortestPath,
    totalDistanceKm: shortestDistance,
    steps,
  };
}
