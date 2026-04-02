import { AppMode, GraphData, PresetSelectionMap, Route, TouristLocation } from '../types';
import { getSupabase, hasSupabaseConfig } from './supabase';

export const TOURIST_DATA_CHANGED_EVENT = 'tourist-data-changed';

const STORAGE_KEYS = {
  locations: 'tourist.locations',
  routes: 'tourist.routes',
  presets: 'tourist.presets',
  draft: 'tourist.guidebook.draft',
};

const EMPTY_GRAPH: GraphData = { locations: [], routes: [] };

const EMPTY_PRESETS: PresetSelectionMap = {
  cycle:  { ids: [], label: '', desc: '' },
  path:   { ids: [], label: '', desc: '' },
  subset: { ids: [], label: '', desc: '' },
};

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
    return raw ? JSON.parse(raw) as PresetSelectionMap : { ...EMPTY_PRESETS };
  } catch {
    return { ...EMPTY_PRESETS };
  }
}

function writeLocalPresets(presets: PresetSelectionMap, options?: { emitEvent?: boolean }) {
  localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(presets));
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

    if (locResult.error || routeResult.error) throw new Error('fetch failed');

    const graphData = normalizeGraphData({
      locations: (locResult.data as TouristLocation[]) ?? [],
      routes: (routeResult.data as Route[]) ?? [],
    });

    writeLocalGraphData(graphData, { emitEvent: false });
    return graphData;
  } catch {
    return readLocalGraphData();
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
  if (!supabase || !hasSupabaseConfig()) return readLocalPresets();

  try {
    const { data, error } = await supabase.from('preset_selections').select('*');
    if (error) throw error;

    const presets: PresetSelectionMap = { ...EMPTY_PRESETS };
    if (data && data.length > 0) {
      (data as Array<{ mode: AppMode; ids: string[]; label: string; desc: string }>).forEach(row => {
        presets[row.mode] = { ids: row.ids, label: row.label, desc: row.desc };
      });
      writeLocalPresets(presets, { emitEvent: false });
    }
    return presets;
  } catch {
    return readLocalPresets();
  }
}

export async function savePreset(mode: AppMode, preset: PresetSelectionMap[AppMode]): Promise<void> {
  const current = readLocalPresets();
  const next = { ...current, [mode]: preset };
  writeLocalPresets(next);

  const supabase = getSupabase();
  if (!supabase || !hasSupabaseConfig()) return;

  const { error } = await supabase.from('preset_selections').upsert({ mode, ...preset });
  if (error) throw error;
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
