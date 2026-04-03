import { AppMode, GraphData, PresetSelection, PresetSelectionMap, Route, TouristLocation } from '../types';
import { getSupabase, hasSupabaseConfig } from './supabase';
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
    cycle: { ids: [], label: '', desc: '', startId: null, endId: null },
    path: { ids: [], label: '', desc: '', startId: null, endId: null },
    subset: { ids: [], label: '', desc: '', startId: null, endId: null },
  };
}

const EMPTY_PRESETS: PresetSelectionMap = createEmptyPresets();

function normalizePresetSelection(mode: AppMode, preset?: Partial<PresetSelection> | null): PresetSelection {
  const ids = Array.isArray(preset?.ids) ? preset.ids.filter((id): id is string => typeof id === 'string') : [];
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

function readLocalGraphData(): GraphData {
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

function writeLocalGraphData(graphData: GraphData, options?: { emitEvent?: boolean }) {
  const normalized = normalizeGraphData(graphData);
  localStorage.setItem(STORAGE_KEYS.locations, JSON.stringify(normalized.locations));
  localStorage.setItem(STORAGE_KEYS.routes, JSON.stringify(normalized.routes));
  if (options?.emitEvent !== false) {
    emitTouristDataChanged();
  }
}

function readLocalPresets(): PresetSelectionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.presets);
    return raw ? normalizePresetMap(JSON.parse(raw) as PresetSelectionMap) : createEmptyPresets();
  } catch {
    return createEmptyPresets();
  }
}

function writeLocalPresets(presets: PresetSelectionMap, options?: { emitEvent?: boolean }) {
  localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(normalizePresetMap(presets)));
  if (options?.emitEvent !== false) {
    emitTouristDataChanged();
  }
}

export async function loadGraphData(): Promise<GraphData> {
  const supabase = getSupabase();
  if (!supabase || !hasSupabaseConfig()) return readLocalGraphData();

  try {
    const [locResult, routeResult] = await Promise.all([
      supabase.from('locations').select('*'),
      supabase.from('routes').select('*'),
    ]);

    if (locResult.error || routeResult.error) {
      throw new Error([
        locResult.error?.message,
        routeResult.error?.message,
      ].filter(Boolean).join(' | ') || 'fetch failed');
    }

    const graphData = normalizeGraphData({
      locations: (locResult.data as TouristLocation[]) ?? [],
      routes: (routeResult.data as Route[]) ?? [],
    });

    writeLocalGraphData(graphData, { emitEvent: false });
    return graphData;
  } catch (error) {
    console.error('loadGraphData failed:', error);
    const localData = readLocalGraphData();
    if (localData.locations.length > 0 || localData.routes.length > 0) {
      return localData;
    }
    return normalizeGraphData(INITIAL_GRAPH_DATA);
  }
}

// Strip undefined values so Supabase doesn't reject with 400
function toDbLocation(location: TouristLocation): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(location)) {
    if (value !== undefined) record[key] = value;
  }
  return record;
}

export async function saveLocation(location: TouristLocation): Promise<void> {
  const current = readLocalGraphData();
  const existingLocation = current.locations.find(item => item.id === location.id);
  const normalizedLocation: TouristLocation = {
    ...location,
    displayOrder: existingLocation?.displayOrder ?? location.displayOrder ?? current.locations.length,
  };
  const nextLocations = current.locations.some(item => item.id === location.id)
    ? current.locations.map(item => item.id === location.id ? normalizedLocation : item)
    : [...current.locations, normalizedLocation];
  writeLocalGraphData({ ...current, locations: nextLocations });

  const supabase = getSupabase();
  if (!supabase || !hasSupabaseConfig()) return;

  const { error } = await supabase.from('locations').upsert(toDbLocation(normalizedLocation));
  if (error) throw error;
}

export async function saveLocationOrder(locationIds: string[]): Promise<void> {
  const current = readLocalGraphData();
  const orderMap = new Map(locationIds.map((id, index) => [id, index]));
  const nextLocations = normalizeLocations(
    current.locations.map((location, index) => ({
      ...location,
      displayOrder: orderMap.get(location.id) ?? current.locations.length + index,
    })),
  );

  writeLocalGraphData({ ...current, locations: nextLocations });

  const supabase = getSupabase();
  if (!supabase || !hasSupabaseConfig()) return;

  const { error } = await supabase.from('locations').upsert(nextLocations.map(location => toDbLocation(location)));
  if (error) throw error;
}

export async function deleteLocation(locationId: string): Promise<void> {
  const current = readLocalGraphData();
  writeLocalGraphData({
    locations: current.locations.filter(item => item.id !== locationId),
    routes: current.routes.filter(route => route.from !== locationId && route.to !== locationId),
  });

  const supabase = getSupabase();
  if (!supabase || !hasSupabaseConfig()) return;

  await supabase.from('routes').delete().or(`from.eq.${locationId},to.eq.${locationId}`);
  await supabase.from('locations').delete().eq('id', locationId);
}

export async function saveRoute(route: Route): Promise<void> {
  const current = readLocalGraphData();
  const nextRoutes = current.routes.some(item => item.id === route.id)
    ? current.routes.map(item => item.id === route.id ? route : item)
    : [...current.routes, route];
  writeLocalGraphData({ ...current, routes: nextRoutes });

  const supabase = getSupabase();
  if (!supabase || !hasSupabaseConfig()) return;

  const { error } = await supabase.from('routes').upsert(route);
  if (error) throw error;
}

export async function deleteRoute(routeId: string): Promise<void> {
  const current = readLocalGraphData();
  writeLocalGraphData({
    ...current,
    routes: current.routes.filter(item => item.id !== routeId),
  });

  const supabase = getSupabase();
  if (!supabase || !hasSupabaseConfig()) return;

  await supabase.from('routes').delete().eq('id', routeId);
}

export async function loadPresets(): Promise<PresetSelectionMap> {
  const supabase = getSupabase();
  const localPresets = readLocalPresets();
  if (!supabase || !hasSupabaseConfig()) return localPresets;

  try {
    const { data, error } = await supabase.from('preset_selections').select('*');
    if (error) throw error;

    const presets: PresetSelectionMap = createEmptyPresets();
    if (data && data.length > 0) {
      (data as Array<{ mode: AppMode; ids: string[]; label: string; desc: string; startId?: string | null; endId?: string | null }>).forEach(row => {
        presets[row.mode] = normalizePresetSelection(row.mode, {
          ...localPresets[row.mode],
          ids: row.ids,
          label: row.label,
          desc: row.desc,
          startId: row.startId ?? localPresets[row.mode]?.startId ?? null,
          endId: row.endId ?? localPresets[row.mode]?.endId ?? null,
        });
      });
      writeLocalPresets(presets, { emitEvent: false });
      return presets;
    }
    return localPresets;
  } catch (error) {
    console.error('loadPresets failed:', error);
    if (
      localPresets.cycle.ids.length > 0 ||
      localPresets.path.ids.length > 0 ||
      localPresets.subset.ids.length > 0
    ) {
      return localPresets;
    }
    return PRESET_SELECTIONS;
  }
}

export async function savePreset(mode: AppMode, preset: PresetSelectionMap[AppMode]): Promise<void> {
  const current = readLocalPresets();
  const next = { ...current, [mode]: normalizePresetSelection(mode, preset) };
  writeLocalPresets(next);

  const supabase = getSupabase();
  if (!supabase || !hasSupabaseConfig()) return;

  const payload = { mode, ...next[mode] };
  const { error } = await supabase.from('preset_selections').upsert(payload);
  if (!error) return;

  if (error.message.includes('startId') || error.message.includes('endId')) {
    const { error: fallbackError } = await supabase.from('preset_selections').upsert({
      mode,
      ids: next[mode].ids,
      label: next[mode].label,
      desc: next[mode].desc,
    });
    if (!fallbackError) return;
    throw fallbackError;
  }

  throw error;
}

export interface GuidebookDraft {
  selectedIds: string[];
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
