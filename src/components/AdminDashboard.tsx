import React, { useMemo, useState } from 'react';
import { ExternalLink, PencilLine, Plus, Trash2, X } from 'lucide-react';
import { AppMode, GraphData, PresetSelectionMap, Route, TouristLocation } from '../types';

interface AdminDashboardProps {
  graphData: GraphData;
  presets: PresetSelectionMap;
  onSaveLocation: (location: TouristLocation) => Promise<void>;
  onDeleteLocation: (locationId: string) => Promise<void>;
  onSaveRoute: (route: Route) => Promise<void>;
  onDeleteRoute: (routeId: string) => Promise<void>;
  onSavePreset: (mode: AppMode, ids: string[]) => Promise<void>;
  onSeedInitialData?: () => Promise<void>;
}

const EMPTY_LOCATION: TouristLocation = {
  id: '',
  label: '',
  fullName: '',
  fullNameEn: '',
  category: 'Danh lam thắng cảnh',
  description: '',
  descriptionEn: '',
  shortIntro: '',
  shortIntroEn: '',
  imageUrl: undefined,
  images: [],
  googleMapsUrl: '',
  neighborhood: '',
  neighborhoodEn: '',
  visitDuration: '',
  bestFor: '',
  bestForEn: '',
  highlights: [],
  highlightsEn: [],
  lat: undefined,
  lng: undefined,
  x: 450,
  y: 280,
};

const EMPTY_ROUTE: Route = {
  id: '',
  from: '',
  to: '',
  distanceKm: 0,
};

const MODE_LABELS: Record<AppMode, string> = {
  cycle: 'Chu trình Hamilton',
  path: 'Đường đi Hamilton',
  subset: 'Lộ trình tùy chọn',
};

const CATEGORY_OPTIONS: TouristLocation['category'][] = [
  'Di sản học đường',
  'Danh lam thắng cảnh',
  'Ẩm thực',
  'Mua sắm',
  'Bảo tàng',
  'Công viên',
  'Khách sạn',
];

function buildRouteId(from: string, to: string) {
  return [from, to].sort().join('__');
}

export function AdminDashboard({
  graphData,
  presets,
  onSaveLocation,
  onDeleteLocation,
  onSaveRoute,
  onDeleteRoute,
  onSavePreset,
  onSeedInitialData,
}: AdminDashboardProps) {
  const [locationForm, setLocationForm] = useState<TouristLocation>(EMPTY_LOCATION);
  const [routeForm, setRouteForm] = useState<Route>(EMPTY_ROUTE);
  const [routeWeights, setRouteWeights] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [statusTone, setStatusTone] = useState<'success' | 'error'>('success');
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);

  const allLocationIds = useMemo(() => graphData.locations.map(location => location.id), [graphData.locations]);

  React.useEffect(() => {
    setRouteWeights(
      Object.fromEntries(graphData.routes.map(route => [route.id, route.distanceKm])),
    );
  }, [graphData.routes]);

  const showSuccess = (message: string) => {
    setStatusTone('success');
    setStatus(message);
  };

  const showError = (error: unknown) => {
    const rawMessage = error instanceof Error ? error.message : 'Không thể lưu dữ liệu.';
    const missingColumnKeywords = [
      'googleMapsUrl', 'fullNameEn', 'descriptionEn', 'shortIntroEn',
      'neighborhoodEn', 'bestForEn', 'highlightsEn',
    ];
    const friendlyMessage = missingColumnKeywords.some(col => rawMessage.includes(col))
      ? 'Supabase đang thiếu cột. Vào SUPABASE_SETUP.md → Bước 2b và chạy SQL nâng cấp schema.'
      : rawMessage;
    setStatusTone('error');
    setStatus(friendlyMessage);
  };

  const handleLocationSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const normalized: TouristLocation = {
        ...locationForm,
        id: locationForm.id.trim().toUpperCase(),
        label: (locationForm.label || locationForm.id).trim().slice(0, 8),
        fullName: locationForm.fullName.trim(),
        fullNameEn: locationForm.fullNameEn?.trim() || undefined,
        description: locationForm.description.trim(),
        descriptionEn: locationForm.descriptionEn?.trim() || undefined,
        shortIntro: locationForm.shortIntro?.trim() || undefined,
        shortIntroEn: locationForm.shortIntroEn?.trim() || undefined,
        images: (locationForm.images ?? []).map(u => u.trim()).filter(Boolean),
        imageUrl: undefined,
        googleMapsUrl: locationForm.googleMapsUrl?.trim() || undefined,
        neighborhood: locationForm.neighborhood?.trim() || undefined,
        neighborhoodEn: locationForm.neighborhoodEn?.trim() || undefined,
        visitDuration: undefined,
        bestFor: locationForm.bestFor?.trim() || undefined,
        bestForEn: locationForm.bestForEn?.trim() || undefined,
        highlights: (locationForm.highlights ?? []).filter(Boolean),
        highlightsEn: (locationForm.highlightsEn ?? []).filter(Boolean),
        lat: locationForm.lat || undefined,
        lng: locationForm.lng || undefined,
      };
      await onSaveLocation(normalized);
      showSuccess(`Đã lưu địa điểm ${normalized.fullName}.`);
      setLocationForm(EMPTY_LOCATION);
      setLocationModalOpen(false);
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const handleRouteSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!routeForm.from || !routeForm.to || routeForm.from === routeForm.to) return;

    setSaving(true);
    setStatus(null);
    try {
      const route: Route = {
        ...routeForm,
        id: buildRouteId(routeForm.from, routeForm.to),
      };
      await onSaveRoute(route);
      showSuccess(`Đã lưu cạnh ${route.from} - ${route.to}.`);
      setRouteForm(EMPTY_ROUTE);
      setRouteModalOpen(false);
    } catch (error) {
      showError(error);
    } finally {
      setSaving(false);
    }
  };

  const openNewLocationModal = () => {
    setLocationForm(EMPTY_LOCATION);
    setLocationModalOpen(true);
  };

  const openEditLocationModal = (location: TouristLocation) => {
    setLocationForm({
      ...location,
      fullNameEn: location.fullNameEn ?? '',
      descriptionEn: location.descriptionEn ?? '',
      shortIntro: location.shortIntro ?? '',
      shortIntroEn: location.shortIntroEn ?? '',
      imageUrl: undefined,
      images: location.images ?? (location.imageUrl ? [location.imageUrl] : []),
      googleMapsUrl: location.googleMapsUrl ?? '',
      neighborhood: location.neighborhood ?? '',
      neighborhoodEn: location.neighborhoodEn ?? '',
      bestFor: location.bestFor ?? '',
      bestForEn: location.bestForEn ?? '',
      highlights: location.highlights ?? [],
      highlightsEn: location.highlightsEn ?? [],
    });
    setLocationModalOpen(true);
  };

  const openNewRouteModal = () => {
    setRouteForm(EMPTY_ROUTE);
    setRouteModalOpen(true);
  };

  const openEditRouteModal = (route: Route) => {
    setRouteForm(route);
    setRouteModalOpen(true);
  };


  return (
    <section className="space-y-6">
      <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Admin panel</div>
        <h2 className="mt-2 text-3xl font-black text-slate-900">Quản trị dữ liệu cẩm nang</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Tập trung vào các nội dung cần thiết: tên điểm, mô tả, hình ảnh, Google Maps và trọng số các cạnh của đồ thị.
          Vị trí trên sơ đồ sẽ được đặt sau ở bảng trực quan, không nhập tay tại đây.
        </p>
        {status && (
          <div
            className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
              statusTone === 'success'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {status}
          </div>
        )}

        {onSeedInitialData && graphData.locations.length === 0 && (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="text-sm font-bold text-amber-800">Chưa có dữ liệu nào trong hệ thống</div>
            <p className="mt-1 text-sm text-amber-700">
              Bấm nút bên dưới để nạp toàn bộ dữ liệu mẫu gồm 10 địa điểm, 23 cung đường và 3 preset vào Supabase một lần.
            </p>
            <button
              type="button"
              disabled={seeding}
              onClick={async () => {
                setSeeding(true);
                setStatus(null);
                try {
                  await onSeedInitialData();
                  showSuccess('Đã nạp xong dữ liệu mẫu lên Supabase. Trang cẩm nang đã sẵn sàng để dùng.');
                } catch (error) {
                  showError(error);
                } finally {
                  setSeeding(false);
                }
              }}
              className="mt-3 rounded-full bg-amber-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            >
              {seeding ? 'Đang nạp dữ liệu...' : 'Nạp dữ liệu mẫu vào hệ thống'}
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-black text-slate-900">Danh sách địa điểm</div>
              <div className="mt-1 text-sm text-slate-500">Thêm mới hoặc bấm sửa để mở modal chỉnh nội dung.</div>
            </div>
            <button
              type="button"
              onClick={openNewLocationModal}
              className="inline-flex items-center gap-2 rounded-full bg-[#14342b] px-4 py-2 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Thêm địa điểm
            </button>
          </div>
          <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {graphData.locations.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-600">
                Chưa có địa điểm nào trong hệ thống. Thầy có thể bấm <strong>Thêm địa điểm</strong> để nhập mới, hoặc dùng nút
                <strong> Nạp dữ liệu mẫu vào hệ thống</strong> ở phía trên.
              </div>
            ) : (
              graphData.locations.map(location => (
                <div key={location.id} className="rounded-2xl border border-slate-100 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">{location.fullName}</div>
                      <div className="mt-1 text-xs text-slate-500">{location.id} • {location.category} • ({location.x}, {location.y})</div>
                      {location.googleMapsUrl && (
                        <a href={location.googleMapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-700">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Mở Google Maps
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => openEditLocationModal(location)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                        <span className="inline-flex items-center gap-1"><PencilLine className="h-3.5 w-3.5" /> Sửa</span>
                      </button>
                      <button type="button" onClick={() => void onDeleteLocation(location.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">
                        <span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Xóa</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-xl font-black text-slate-900">Danh sách cạnh / cung đường</div>
                <div className="mt-1 text-sm text-slate-500">Đây là phần thầy dùng để thiết lập trọng số của đồ thị.</div>
              </div>
              <button
                type="button"
                onClick={openNewRouteModal}
                className="inline-flex items-center gap-2 rounded-full bg-[#133654] px-4 py-2 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                Thêm cạnh
              </button>
            </div>

            <div className="max-h-[220px] space-y-3 overflow-y-auto pr-1">
              {graphData.routes.map(route => (
                <div key={route.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{route.from} → {route.to}</div>
                    <div className="mt-1 text-xs text-slate-500">Trọng số: {route.distanceKm.toFixed(1)} • {route.id}</div>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => openEditRouteModal(route)} className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700">
                      <span className="inline-flex items-center gap-1"><PencilLine className="h-3.5 w-3.5" /> Sửa</span>
                    </button>
                    <button type="button" onClick={() => void onDeleteRoute(route.id)} className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600">
                      <span className="inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Xóa</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6">
            <div className="mb-4 text-xl font-black text-slate-900">Thiết lập nhanh trọng số tất cả cạnh</div>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              Sửa trực tiếp trọng số rồi bấm <code>Lưu</code> ở từng dòng. Đây là phần cốt lõi để thiết lập đồ thị cho 3 bài toán.
            </div>
            <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
              {graphData.routes.map(route => (
                <div key={route.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900">{route.from} → {route.to}</div>
                    <div className="mt-1 text-xs text-slate-500">Mã cạnh: {route.id}</div>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={routeWeights[route.id] ?? route.distanceKm}
                    onChange={event => setRouteWeights(current => ({
                      ...current,
                      [route.id]: Number(event.target.value),
                    }))}
                    className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      setSaving(true);
                      setStatus(null);
                      try {
                        await onSaveRoute({
                          ...route,
                          distanceKm: routeWeights[route.id] ?? route.distanceKm,
                        });
                        showSuccess(`Đã cập nhật trọng số cạnh ${route.from} - ${route.to}.`);
                      } catch (error) {
                        showError(error);
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving}
                    className="rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
                  >
                    Lưu
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6">
            <div className="mb-4 text-xl font-black text-slate-900">Preset cho từng chế độ</div>
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              Chọn nhanh bộ điểm mẫu cho từng bài toán. Với <code>Chu trình Hamilton</code> và <code>Đường đi Hamilton</code> nên giữ đúng 5 điểm.
            </div>
            <div className="space-y-4">
              {(Object.keys(MODE_LABELS) as AppMode[]).map(mode => (
                <PresetEditor
                  key={mode}
                  mode={mode}
                  label={MODE_LABELS[mode]}
                  selectedIds={presets[mode].ids}
                  allLocationIds={allLocationIds}
                  onSave={ids => onSavePreset(mode, ids)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {locationModalOpen && (
        <ModalShell title={locationForm.id ? `Sửa địa điểm ${locationForm.id}` : 'Thêm địa điểm mới'} onClose={() => setLocationModalOpen(false)}>
          <form onSubmit={handleLocationSubmit} className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              Các trường nên nhập: <strong>mã</strong>, <strong>tên</strong>, <strong>danh mục</strong>, <strong>mô tả ngắn</strong>,
              <strong> hình ảnh</strong>, <strong>Google Maps</strong> và <strong>điểm nhấn</strong>. Tọa độ sẽ được đặt ở bảng trực quan
              rồi lưu xuống Supabase sau. Có thể bỏ qua bản tiếng Anh nếu chưa cần.
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Mã địa điểm">
                <input value={locationForm.id} placeholder="Ví dụ: DS" onChange={event => setLocationForm(current => ({ ...current, id: event.target.value }))} className="field-input" />
              </Field>
              <Field label="Nhãn node">
                <input value={locationForm.label} placeholder="Ví dụ: Nhà\\nThờ" onChange={event => setLocationForm(current => ({ ...current, label: event.target.value }))} className="field-input" />
              </Field>
              <Field label="Tên đầy đủ (VI)">
                <input value={locationForm.fullName} placeholder="Ví dụ: Nhà Thờ Đức Bà" onChange={event => setLocationForm(current => ({ ...current, fullName: event.target.value }))} className="field-input" />
              </Field>
              <Field label="Tên đầy đủ (EN)">
                <input value={locationForm.fullNameEn ?? ''} placeholder="Example: Notre-Dame Cathedral" onChange={event => setLocationForm(current => ({ ...current, fullNameEn: event.target.value }))} className="field-input" />
              </Field>
              <Field label="Danh mục">
                <select value={locationForm.category} onChange={event => setLocationForm(current => ({ ...current, category: event.target.value as TouristLocation['category'] }))} className="field-input">
                  {CATEGORY_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Google Maps">
                <input value={locationForm.googleMapsUrl ?? ''} placeholder="https://maps.app.goo.gl/..." onChange={event => setLocationForm(current => ({ ...current, googleMapsUrl: event.target.value }))} className="field-input" />
              </Field>
              <Field label="Khu vực (VI)">
                <input value={locationForm.neighborhood ?? ''} placeholder="Ví dụ: Công xã Paris, Quận 1" onChange={event => setLocationForm(current => ({ ...current, neighborhood: event.target.value }))} className="field-input" />
              </Field>
              <Field label="Khu vực (EN)">
                <input value={locationForm.neighborhoodEn ?? ''} placeholder="Example: Paris Commune Square, District 1" onChange={event => setLocationForm(current => ({ ...current, neighborhoodEn: event.target.value }))} className="field-input" />
              </Field>
              {/* Multi-image carousel */}
              <div className="md:col-span-2 space-y-2">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Ảnh địa điểm (carousel — ảnh đầu tiên là ảnh chính)</div>
                {(locationForm.images ?? []).map((url, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        value={url}
                        placeholder={`Ảnh ${i + 1}: https://...`}
                        onChange={e => setLocationForm(curr => {
                          const imgs = [...(curr.images ?? [])];
                          imgs[i] = e.target.value;
                          return { ...curr, images: imgs };
                        })}
                        className="field-input flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => setLocationForm(curr => ({ ...curr, images: (curr.images ?? []).filter((_, j) => j !== i) }))}
                        className="shrink-0 rounded-full px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                      >
                        Xóa
                      </button>
                    </div>
                    {url && (
                      <img src={url} alt={`preview-${i}`} className="max-h-40 w-full rounded-xl object-cover border border-slate-200" />
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setLocationForm(curr => ({ ...curr, images: [...(curr.images ?? []), ''] }))}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  + Thêm ảnh
                </button>
              </div>
              {/* Lat/Lng */}
              <Field label="Vĩ độ (lat)">
                <input
                  type="number"
                  step="any"
                  value={locationForm.lat ?? ''}
                  placeholder="Ví dụ: 10.7769"
                  onChange={e => setLocationForm(curr => ({ ...curr, lat: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  className="field-input"
                />
              </Field>
              <Field label="Kinh độ (lng)">
                <input
                  type="number"
                  step="any"
                  value={locationForm.lng ?? ''}
                  placeholder="Ví dụ: 106.6951"
                  onChange={e => setLocationForm(curr => ({ ...curr, lng: e.target.value ? parseFloat(e.target.value) : undefined }))}
                  className="field-input"
                />
              </Field>
              <Field label="Mô tả ngắn (VI)" full>
                <textarea value={locationForm.shortIntro ?? ''} placeholder="Ví dụ: Điểm mang tính biểu tượng, hợp cho khách lần đầu đến trung tâm thành phố." onChange={event => setLocationForm(current => ({ ...current, shortIntro: event.target.value }))} rows={2} className="field-input min-h-[92px]" />
              </Field>
              <Field label="Mô tả ngắn (EN)" full>
                <textarea value={locationForm.shortIntroEn ?? ''} placeholder="Example: An iconic stop that works well for first-time visitors." onChange={event => setLocationForm(current => ({ ...current, shortIntroEn: event.target.value }))} rows={2} className="field-input min-h-[92px]" />
              </Field>
              <Field label="Mô tả đầy đủ (VI)" full>
                <textarea value={locationForm.description} placeholder="Ví dụ: Điểm ghé nổi bật để chụp ảnh, ngắm kiến trúc và nối tiếp hành trình quanh trường." onChange={event => setLocationForm(current => ({ ...current, description: event.target.value }))} rows={3} className="field-input min-h-[110px]" />
              </Field>
              <Field label="Mô tả đầy đủ (EN)" full>
                <textarea value={locationForm.descriptionEn ?? ''} placeholder="Example: A standout stop for photos, architecture and continuing the school-area journey." onChange={event => setLocationForm(current => ({ ...current, descriptionEn: event.target.value }))} rows={3} className="field-input min-h-[110px]" />
              </Field>
              <Field label="Phù hợp cho (VI)">
                <input value={locationForm.bestFor ?? ''} placeholder="Ví dụ: Chụp ảnh, kiến trúc, khách lần đầu đến Sài Gòn" onChange={event => setLocationForm(current => ({ ...current, bestFor: event.target.value }))} className="field-input" />
              </Field>
              <Field label="Phù hợp cho (EN)">
                <input value={locationForm.bestForEn ?? ''} placeholder="Example: Photography, architecture, first-time Saigon visitors" onChange={event => setLocationForm(current => ({ ...current, bestForEn: event.target.value }))} className="field-input" />
              </Field>
              <Field label="Điểm nhấn (VI, cách nhau bằng dấu phẩy)" full>
                <input
                  value={(locationForm.highlights ?? []).join(', ')}
                  placeholder="Ví dụ: Mặt tiền biểu tượng, Cụm du lịch trung tâm, Dễ nối sang Bưu điện"
                  onChange={event => setLocationForm(current => ({
                    ...current,
                    highlights: event.target.value.split(',').map(item => item.trim()).filter(Boolean),
                  }))}
                  className="field-input"
                />
              </Field>
              <Field label="Điểm nhấn (EN, cách nhau bằng dấu phẩy)" full>
                <input
                  value={(locationForm.highlightsEn ?? []).join(', ')}
                  placeholder="Example: Iconic facade, Central tourist cluster, Easy connection to Post Office"
                  onChange={event => setLocationForm(current => ({
                    ...current,
                    highlightsEn: event.target.value.split(',').map(item => item.trim()).filter(Boolean),
                  }))}
                  className="field-input"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setLocationModalOpen(false)} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
                Hủy
              </button>
              <button type="submit" disabled={saving} className="rounded-full bg-[#14342b] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {locationForm.id ? 'Lưu địa điểm' : 'Thêm địa điểm'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {routeModalOpen && (
        <ModalShell title={routeForm.id ? `Sửa cạnh ${routeForm.id}` : 'Thêm cạnh mới'} onClose={() => setRouteModalOpen(false)}>
          <form onSubmit={handleRouteSubmit} className="space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              Trường cần nhập cho cạnh chỉ gồm: <strong>điểm đi</strong>, <strong>điểm đến</strong> và <strong>trọng số</strong>.
              Hệ thống tự tạo mã cạnh.
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Điểm đi">
                <select value={routeForm.from} onChange={event => setRouteForm(current => ({ ...current, from: event.target.value }))} className="field-input">
                  <option value="">Chọn điểm đi</option>
                  {graphData.locations.map(location => <option key={location.id} value={location.id}>{location.fullName}</option>)}
                </select>
              </Field>
              <Field label="Điểm đến">
                <select value={routeForm.to} onChange={event => setRouteForm(current => ({ ...current, to: event.target.value }))} className="field-input">
                  <option value="">Chọn điểm đến</option>
                  {graphData.locations.map(location => <option key={location.id} value={location.id}>{location.fullName}</option>)}
                </select>
              </Field>
              <Field label="Trọng số cạnh" full>
                <input type="number" min="0" step="0.1" value={routeForm.distanceKm} onChange={event => setRouteForm(current => ({ ...current, distanceKm: Number(event.target.value) }))} className="field-input" />
              </Field>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setRouteModalOpen(false)} className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700">
                Hủy
              </button>
              <button type="submit" disabled={saving} className="rounded-full bg-[#133654] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
                {routeForm.id ? 'Lưu cạnh' : 'Thêm cạnh'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}
    </section>
  );
}

function PresetEditor({
  mode,
  label,
  selectedIds,
  allLocationIds,
  onSave,
}: {
  mode: AppMode;
  label: string;
  selectedIds: string[];
  allLocationIds: string[];
  onSave: (ids: string[]) => Promise<void>;
}) {
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setDraft(selectedIds);
  }, [selectedIds]);

  const toggle = (id: string) => {
    setDraft(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id].slice(0, mode === 'subset' ? 7 : 5));
  };

  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="text-sm font-bold text-slate-900">{label}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {allLocationIds.map(id => (
          <button
            key={id}
            type="button"
            onClick={() => toggle(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${
              draft.includes(id) ? 'bg-[#14342b] text-white' : 'border border-slate-200 text-slate-700'
            }`}
          >
            {id}
          </button>
        ))}
      </div>
      <div className="mt-3 text-xs text-slate-500">
        Đã chọn {draft.length} điểm. {mode === 'subset' ? 'Khuyến nghị từ 5 đến 7 điểm.' : 'Nên giữ đúng 5 điểm.'}
      </div>
      <button
        type="button"
        disabled={saving || draft.length < 5}
        onClick={async () => {
          setSaving(true);
          try {
            await onSave(draft);
          } finally {
            setSaving(false);
          }
        }}
        className="mt-3 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
      >
        Lưu preset {mode}
      </button>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.3)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="text-xl font-black text-slate-900">{title}</div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(92vh-72px)] overflow-y-auto px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? 'md:col-span-2' : ''}`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</div>
      {children}
    </label>
  );
}

