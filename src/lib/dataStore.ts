import { AppMode, GraphData, PresetSelection, PresetSelectionMap, Route, TouristLocation } from '../types';
import { INITIAL_GRAPH_DATA, PRESET_SELECTIONS } from '../data/hcmcLocations';

export const TOURIST_DATA_CHANGED_EVENT = 'tourist-data-changed';

const STORAGE_KEYS = {
  locations: 'tourist.locations',
  routes: 'tourist.routes',
  presets: 'tourist.presets',
  draft: 'tourist.guidebook.draft',
};

const EMPTY_GRAPH: GraphData = { locations: [], routes: [] };

function createEmptyPresets(): PresetSelectionMap {
  return {
    cycle: { ids: [], routeIds: [], label: '', desc: '', startId: null, endId: null },
    path: { ids: [], routeIds: [], label: '', desc: '', startId: null, endId: null },
    subset: { ids: [], routeIds: [], label: '', desc: '', startId: null, endId: null },
  };
}

function normalizePresetSelection(mode: AppMode, preset?: Partial<PresetSelection> | null): PresetSelection {
  const ids = Array.isArray(preset?.ids) ? preset.ids.filter((id): id is string => typeof id === 'string') : [];
  const routeIds = Array.isArray(preset?.routeIds)
    ? Array.from(new Set(preset.routeIds.filter((id): id is string => typeof id === 'string'))).sort((a, b) => a.localeCompare(b))
    : [];
  const requestedStartId = typeof preset?.startId === 'string' && ids.includes(preset.startId) ? preset.startId : null;
  const startId = requestedStartId ?? ids[0] ?? null;
  const requestedEndId = typeof preset?.endId === 'string' && ids.includes(preset.endId) ? preset.endId : null;
  const endId = mode === 'cycle'
    ? null
    : requestedEndId && requestedEndId !== startId
      ? requestedEndId
      : ids.find(id => id !== startId) ?? null;

  return {
    ids,
    routeIds,
    label: typeof preset?.label === 'string' ? preset.label : '',
    desc: typeof preset?.desc === 'string' ? preset.desc : '',
    startId,
    endId,
  };
}

function normalizePresetMap(presets?: Partial<PresetSelectionMap> | null): PresetSelectionMap {
  return {
    cycle: normalizePresetSelection('cycle', presets?.cycle),
    path: normalizePresetSelection('path', presets?.path),
    subset: normalizePresetSelection('subset', presets?.subset),
  };
}

function sortLocations(locations: TouristLocation[]): TouristLocation[] {
  return [...locations].sort((a, b) => {
    const orderA = typeof a.displayOrder === 'number' ? a.displayOrder : Number.MAX_SAFE_INTEGER;
    const orderB = typeof b.displayOrder === 'number' ? b.displayOrder : Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.fullName.localeCompare(b.fullName);
  });
}

function normalizeLocations(locations: TouristLocation[]): TouristLocation[] {
  return sortLocations(
    locations.map((location, index) => ({
      ...location,
      displayOrder: typeof location.displayOrder === 'number' ? location.displayOrder : index,
    })),
  );
}

function normalizeGraphData(graphData: GraphData): GraphData {
  return {
    locations: normalizeLocations(graphData.locations),
    routes: [...graphData.routes].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function emitTouristDataChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(TOURIST_DATA_CHANGED_EVENT));
}

function readStoredGraphData(): GraphData {
  try {
    const rawLocations = localStorage.getItem(STORAGE_KEYS.locations);
    const rawRoutes = localStorage.getItem(STORAGE_KEYS.routes);
    return normalizeGraphData({
      locations: rawLocations ? JSON.parse(rawLocations) as TouristLocation[] : [],
      routes: rawRoutes ? JSON.parse(rawRoutes) as Route[] : [],
    });
  } catch {
    return { ...EMPTY_GRAPH };
  }
}

function getDefaultGraphData(): GraphData {
  return normalizeGraphData(INITIAL_GRAPH_DATA);
}

function getEffectiveGraphData(): GraphData {
  const stored = readStoredGraphData();
  if (stored.locations.length > 0 || stored.routes.length > 0) {
    return stored;
  }
  return getDefaultGraphData();
}

function writeLocalGraphData(graphData: GraphData, options?: { emitEvent?: boolean }) {
  const normalized = normalizeGraphData(graphData);
  localStorage.setItem(STORAGE_KEYS.locations, JSON.stringify(normalized.locations));
  localStorage.setItem(STORAGE_KEYS.routes, JSON.stringify(normalized.routes));
  if (options?.emitEvent !== false) {
    emitTouristDataChanged();
  }
}

function readStoredPresets(): PresetSelectionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.presets);
    return raw ? normalizePresetMap(JSON.parse(raw) as PresetSelectionMap) : createEmptyPresets();
  } catch {
    return createEmptyPresets();
  }
}

function getDefaultPresets(): PresetSelectionMap {
  return normalizePresetMap(PRESET_SELECTIONS);
}

function getEffectivePresets(): PresetSelectionMap {
  const stored = readStoredPresets();
  if (
    stored.cycle.ids.length > 0 ||
    stored.path.ids.length > 0 ||
    stored.subset.ids.length > 0
  ) {
    return stored;
  }
  return getDefaultPresets();
}

function writeLocalPresets(presets: PresetSelectionMap, options?: { emitEvent?: boolean }) {
  localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(normalizePresetMap(presets)));
  if (options?.emitEvent !== false) {
    emitTouristDataChanged();
  }
}

export async function loadGraphData(): Promise<GraphData> {
  return getEffectiveGraphData();
}

export async function saveLocation(location: TouristLocation): Promise<void> {
  const current = getEffectiveGraphData();
  const existingLocation = current.locations.find(item => item.id === location.id);
  const normalizedLocation: TouristLocation = {
    ...location,
    displayOrder: existingLocation?.displayOrder ?? location.displayOrder ?? current.locations.length,
  };
  const nextLocations = current.locations.some(item => item.id === location.id)
    ? current.locations.map(item => item.id === location.id ? normalizedLocation : item)
    : [...current.locations, normalizedLocation];
  writeLocalGraphData({ ...current, locations: nextLocations });
}

export async function saveLocationOrder(locationIds: string[]): Promise<void> {
  const current = getEffectiveGraphData();
  const orderMap = new Map(locationIds.map((id, index) => [id, index]));
  const nextLocations = normalizeLocations(
    current.locations.map((location, index) => ({
      ...location,
      displayOrder: orderMap.get(location.id) ?? current.locations.length + index,
    })),
  );

  writeLocalGraphData({ ...current, locations: nextLocations });
}

export async function deleteLocation(locationId: string): Promise<void> {
  const current = getEffectiveGraphData();
  writeLocalGraphData({
    locations: current.locations.filter(item => item.id !== locationId),
    routes: current.routes.filter(route => route.from !== locationId && route.to !== locationId),
  });
}

export async function saveRoute(route: Route): Promise<void> {
  const current = getEffectiveGraphData();
  const nextRoutes = current.routes.some(item => item.id === route.id)
    ? current.routes.map(item => item.id === route.id ? route : item)
    : [...current.routes, route];
  writeLocalGraphData({ ...current, routes: nextRoutes });
}

export async function deleteRoute(routeId: string): Promise<void> {
  const current = getEffectiveGraphData();
  writeLocalGraphData({
    ...current,
    routes: current.routes.filter(item => item.id !== routeId),
  });
}

export async function loadPresets(): Promise<PresetSelectionMap> {
  return getEffectivePresets();
}

export async function savePreset(mode: AppMode, preset: PresetSelectionMap[AppMode]): Promise<void> {
  const current = getEffectivePresets();
  const next = { ...current, [mode]: normalizePresetSelection(mode, preset) };
  writeLocalPresets(next);
}

export interface GuidebookDraft {
  selectedIds: string[];
  selectedRouteIds?: string[];
  endId: string | null;
  appMode: AppMode;
}

export function readLocalDraft(): GuidebookDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.draft);
    return raw ? (JSON.parse(raw) as GuidebookDraft) : null;
  } catch {
    return null;
  }
}

export function writeLocalDraft(draft: GuidebookDraft): void {
  try {
    localStorage.setItem(STORAGE_KEYS.draft, JSON.stringify(draft));
  } catch {
    // ignore storage errors
  }
}
