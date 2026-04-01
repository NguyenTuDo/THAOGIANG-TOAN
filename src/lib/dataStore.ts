import { AppMode, GraphData, PresetSelectionMap, Route, TouristLocation } from '../types';
import { INITIAL_GRAPH_DATA, PRESET_SELECTIONS } from '../data/hcmcLocations';
import { getSupabase, hasSupabaseConfig } from './supabase';

const STORAGE_KEYS = {
  locations: 'tourist.locations',
  routes: 'tourist.routes',
  presets: 'tourist.presets',
};

const DEFAULT_PRESETS: PresetSelectionMap = PRESET_SELECTIONS;

function cloneGraphData(graphData: GraphData): GraphData {
  return {
    locations: graphData.locations.map(location => ({
      ...location,
      highlights: location.highlights ? [...location.highlights] : undefined,
    })),
    routes: graphData.routes.map(route => ({ ...route })),
  };
}

function clonePresets(presets: PresetSelectionMap): PresetSelectionMap {
  return {
    cycle: { ...presets.cycle, ids: [...presets.cycle.ids] },
    path: { ...presets.path, ids: [...presets.path.ids] },
    subset: { ...presets.subset, ids: [...presets.subset.ids] },
  };
}

function readLocalGraphData(): GraphData {
  const fallback = cloneGraphData(INITIAL_GRAPH_DATA);
  try {
    const rawLocations = localStorage.getItem(STORAGE_KEYS.locations);
    const rawRoutes = localStorage.getItem(STORAGE_KEYS.routes);
    return {
      locations: rawLocations ? JSON.parse(rawLocations) as TouristLocation[] : fallback.locations,
      routes: rawRoutes ? JSON.parse(rawRoutes) as Route[] : fallback.routes,
    };
  } catch {
    return fallback;
  }
}

function writeLocalGraphData(graphData: GraphData) {
  localStorage.setItem(STORAGE_KEYS.locations, JSON.stringify(graphData.locations));
  localStorage.setItem(STORAGE_KEYS.routes, JSON.stringify(graphData.routes));
}

function readLocalPresets(): PresetSelectionMap {
  const fallback = clonePresets(DEFAULT_PRESETS);
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.presets);
    return raw ? JSON.parse(raw) as PresetSelectionMap : fallback;
  } catch {
    return fallback;
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

    return { locations, routes };
  } catch {
    return readLocalGraphData();
  }
}

export async function saveLocation(location: TouristLocation): Promise<void> {
  const current = readLocalGraphData();
  const nextLocations = current.locations.some(item => item.id === location.id)
    ? current.locations.map(item => item.id === location.id ? location : item)
    : [...current.locations, location];
  writeLocalGraphData({ ...current, locations: nextLocations });

  const supabase = getSupabase();
  if (!supabase || !hasSupabaseConfig()) return;

  const { error } = await supabase.from('locations').upsert(location);
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
    if (!data || data.length === 0) return readLocalPresets();

    const presets = clonePresets(DEFAULT_PRESETS);
    (data as Array<{ mode: AppMode; ids: string[]; label: string; desc: string }>).forEach(row => {
      presets[row.mode] = { ids: row.ids, label: row.label, desc: row.desc };
    });
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
