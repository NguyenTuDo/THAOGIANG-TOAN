import { PresetSelection, Route } from '../types';

export function getCompatibleRoutes(routes: Route[], selectedIds: string[]): Route[] {
  return routes.filter(route => selectedIds.includes(route.from) && selectedIds.includes(route.to));
}

export function getCompatibleRouteIds(routes: Route[], selectedIds: string[]): string[] {
  return getCompatibleRoutes(routes, selectedIds).map(route => route.id);
}

export function normalizeSelectedRouteIds(
  routeIds: string[] | undefined,
  routes: Route[],
  selectedIds: string[],
): string[] {
  if (!routeIds || routeIds.length === 0) return [];

  const compatibleRouteIds = new Set(getCompatibleRouteIds(routes, selectedIds));
  return Array.from(new Set(routeIds.filter(id => compatibleRouteIds.has(id)))).sort((a, b) => a.localeCompare(b));
}

export function getPresetRouteIds(
  preset: PresetSelection | null | undefined,
  routes: Route[],
  selectedIds: string[],
): string[] {
  if (preset?.routeIds === undefined) {
    return getCompatibleRouteIds(routes, selectedIds);
  }

  return normalizeSelectedRouteIds(preset.routeIds, routes, selectedIds);
}

export function filterRoutesForSelection(
  routes: Route[],
  selectedIds: string[],
  selectedRouteIds?: string[],
): Route[] {
  const compatibleRoutes = getCompatibleRoutes(routes, selectedIds);
  if (selectedRouteIds === undefined) return compatibleRoutes;

  const routeIdSet = new Set(selectedRouteIds);
  return compatibleRoutes.filter(route => routeIdSet.has(route.id));
}
