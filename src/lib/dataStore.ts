import { AppMode, GraphData, PresetSelectionMap, Route, TouristLocation } from '../types';
import { getSupabase, hasSupabaseConfig } from './supabase';

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

function readLocalGraphData(): GraphData {
  try {
    const rawLocations = localStorage.getItem(STORAGE_KEYS.locations);
    const rawRoutes = localStorage.getItem(STORAGE_KEYS.routes);
    return {
      locations: rawLocations ? JSON.parse(rawLocations) as TouristLocation[] : [],
      routes: rawRoutes ? JSON.parse(rawRoutes) as Route[] : [],
    };
  } catch {
    return { ...EMPTY_GRAPH };
  }
}

function writeLocalGraphData(graphData: GraphData) {
  localStorage.setItem(STORAGE_KEYS.locations, JSON.stringify(graphData.locations));
  localStorage.setItem(STORAGE_KEYS.routes, JSON.stringify(graphData.routes));
}

function readLocalPresets(): PresetSelectionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.presets);
    return raw ? JSON.parse(raw) as PresetSelectionMap : { ...EMPTY_PRESETS };
  } catch {
    return { ...EMPTY_PRESETS };
  }
}

function writeLocalPresets(presets: PresetSelectionMap) {
  localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(presets));
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

    const locations = (locResult.data as TouristLocation[])
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    const routes = (routeResult.data as Route[])
      .sort((a, b) => a.id.localeCompare(b.id));

    writeLocalGraphData({ locations, routes });
    return { locations, routes };
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
  const nextLocations = current.locations.some(item => item.id === location.id)
    ? current.locations.map(item => item.id === location.id ? location : item)
    : [...current.locations, location];
  writeLocalGraphData({ ...current, locations: nextLocations });

  const supabase = getSupabase();
  if (!supabase || !hasSupabaseConfig()) return;

  const { error } = await supabase.from('locations').upsert(toDbLocation(location));
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
      writeLocalPresets(presets);
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
