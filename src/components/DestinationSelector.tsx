import React, { useMemo, useState } from 'react';
import { ArrowRight, Compass, MapPin, Navigation, Route, RotateCcw, Sparkles, Wand2 } from 'lucide-react';
import { TouristLocation, AppMode, LocationCategory } from '../types';
import { LocationCard } from './LocationCard';
import { useLang, CATEGORY_EN } from '../contexts/LanguageContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { haversineKm } from '../lib/geo';

interface DestinationSelectorProps {
  locations: TouristLocation[];
  appMode: AppMode;
  selectedIds: string[];
  onToggle: (id: string) => void;
  onClearAll: () => void;
  onFindRoute: () => void;
  onLoadPreset: () => void;
  preset: { ids: string[]; label: string; desc: string } | null;
  endId: string | null;
  onSetEnd: (id: string | null) => void;
}

const MODE_CONFIG = {
  cycle: {
    required: 5,
    max: 5,
    btnClass: 'bg-[#133654] hover:bg-[#0f2e48]',
    title: 'Một vòng khám phá quanh Marie Curie',
    titleEn: 'A looping walk around Marie Curie',
    subtitle: 'Dành cho khách thích đi bộ, ghé đủ 5 điểm rồi quay lại trong một hành trình gọn gàng và dễ kể chuyện.',
    subtitleEn: 'Made for visitors who enjoy walking, stopping at 5 places, then returning in one clean, memorable loop.',
    hint: (n: number) => n < 5 ? `Cần chọn thêm ${5 - n} địa điểm.` : 'Đủ 5 điểm. Có thể mở lớp bản đồ để hệ thống gợi ý vòng tối ưu.',
    hintEn: (n: number) => n < 5 ? `Select ${5 - n} more stops.` : 'All 5 selected. Open the map to reveal the optimal loop.',
    personality: 'Vòng tròn gọn',
    personalityEn: 'Compact loop',
    personalityDesc: 'Phù hợp để giới thiệu khu trường bằng một tuyến tham quan khép kín.',
    personalityDescEn: 'Best when you want a closed, easy-to-explain school-area route.',
  },
  path: {
    required: 5,
    max: 5,
    btnClass: 'bg-[#6b2745] hover:bg-[#571f38]',
    title: 'Từ cổng trường đến một điểm hẹn cuối',
    titleEn: 'From the school gate to a final stop',
    subtitle: 'Chọn 5 điểm để ghép thành một hành trình liền mạch từ nơi bắt đầu đến nơi kết thúc.',
    subtitleEn: 'Choose 5 places to build a seamless one-way route from the starting point to the final destination.',
    hint: (n: number) => n < 5 ? `Cần chọn thêm ${5 - n} địa điểm.` : 'Đủ 5 điểm. Chọn thêm điểm kết thúc để hoàn chỉnh hành trình.',
    hintEn: (n: number) => n < 5 ? `Select ${5 - n} more stops.` : 'All 5 selected. Pick the final destination to complete the route.',
    personality: 'Đi một mạch',
    personalityEn: 'One-way journey',
    personalityDesc: 'Phù hợp khi muốn dẫn khách từ trường đến một điểm hẹn cuối rõ ràng.',
    personalityDescEn: 'Great when the tour should move from school to one clear destination.',
  },
  subset: {
    required: 5,
    max: 99,
    btnClass: 'bg-[#82501f] hover:bg-[#6a4018]',
    title: 'Tự biên soạn cẩm nang 1 ngày quanh trường',
    titleEn: 'Build a one-day guide around the school',
    subtitle: 'Chỉ giữ lại những nơi thực sự muốn ghé, rồi để hệ thống khép tour thành một vòng tham quan mạch lạc.',
    subtitleEn: 'Keep only the places you truly want to visit, then let the system close the tour into a coherent loop.',
    hint: (n: number) => n < 5 ? `Cần chọn ít nhất ${5 - n} địa điểm nữa.` : `Đã có ${n} điểm. Có thể mở lớp bản đồ để chốt vòng tham quan.`,
    hintEn: (n: number) => n < 5 ? `Select at least ${5 - n} more stops.` : `${n} stops selected. Open the map to finalize the tour.`,
    personality: 'Tự chọn linh hoạt',
    personalityEn: 'Flexible picks',
    personalityDesc: 'Phù hợp khi khách có gu riêng và muốn ưu tiên vài điểm nổi bật.',
    personalityDescEn: 'Best for visitors with personal preferences who want a curated shortlist.',
  },
} as const;

export const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  locations, appMode, selectedIds, onToggle, onClearAll, onFindRoute,
  onLoadPreset, preset, endId, onSetEnd,
}) => {
  const { lang, t } = useLang();
  const cfg = MODE_CONFIG[appMode];
  const { state: geoState, request: requestGeo } = useGeolocation();

  // Category filter
  const [activeCategories, setActiveCategories] = useState<LocationCategory[]>([]);
  const availableCategories = useMemo(
    () => [...new Set(locations.map(l => l.category))] as LocationCategory[],
    [locations],
  );
  const toggleCategory = (cat: LocationCategory) =>
    setActiveCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat],
    );

  // Near/far filter
  const [nearFar, setNearFar] = useState<'all' | 'near' | 'far'>('all');
  const NEAR_THRESHOLD_KM = 2;

  // Compute distances if geolocation available
  const userCoords = geoState.status === 'ok' ? geoState.coords : null;
  const distanceMap = useMemo<Record<string, number>>(() => {
    if (!userCoords) return {};
    return Object.fromEntries(
      locations
        .filter(l => l.lat !== undefined && l.lng !== undefined)
        .map(l => [l.id, haversineKm(userCoords.lat, userCoords.lng, l.lat!, l.lng!)]),
    );
  }, [userCoords, locations]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter(l => {
      if (activeCategories.length > 0 && !activeCategories.includes(l.category)) return false;
      if (nearFar !== 'all' && userCoords && l.lat !== undefined && l.lng !== undefined) {
        const d = distanceMap[l.id] ?? Infinity;
        if (nearFar === 'near' && d >= NEAR_THRESHOLD_KM) return false;
        if (nearFar === 'far' && d < NEAR_THRESHOLD_KM) return false;
      }
      return true;
    });
  }, [locations, activeCategories, nearFar, userCoords, distanceMap]);
  const count = selectedIds.length;
  const startId = selectedIds[0] ?? null;
  const selectedLocations = selectedIds
    .map(id => locations.find(loc => loc.id === id))
    .filter((loc): loc is TouristLocation => Boolean(loc));
  const school = locations.find(loc => loc.id === 'BT') ?? locations[0];

  const isReady = appMode === 'path'
    ? count === cfg.required && endId !== null && endId !== startId
    : count >= cfg.required;

  const hintText = lang === 'en' ? cfg.hintEn(count) : cfg.hint(count);
  const displayTitle = lang === 'en' ? cfg.titleEn : cfg.title;
  const displaySubtitle = lang === 'en' ? cfg.subtitleEn : cfg.subtitle;
  const schoolName = t(school?.fullName ?? '', school?.fullNameEn);
  const schoolAddress = t(
    'THPT Marie Curie, 159 Nam Kỳ Khởi Nghĩa, Quận 3',
    'Marie Curie High School, 159 Nam Ky Khoi Nghia, District 3',
  );
  const themeClass =
    appMode === 'cycle' ? 'from-[#102c3f] via-[#1f4f73] to-[#d7a15e]' :
    appMode === 'path' ? 'from-[#4d1f32] via-[#8c355c] to-[#d29b73]' :
    'from-[#4f3618] via-[#9b6735] to-[#ead4ad]';
  const panelTint =
    appMode === 'cycle' ? 'border-[#9bc3d7]/30 bg-[#10314c]/72' :
    appMode === 'path' ? 'border-[#f0b8c8]/30 bg-[#4f1d36]/72' :
    'border-[#f0d7a6]/35 bg-[#583714]/68';

  return (
    <div className="guide-shell flex h-full flex-col overflow-hidden text-slate-900">
      <div className="flex-1 overflow-y-auto">
        <section className={`relative isolate overflow-hidden bg-gradient-to-br ${themeClass} px-6 pb-10 pt-8 text-white md:px-8 lg:px-10`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_28%)]" />
          <div className="absolute -left-20 top-8 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-black/15 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_420px]">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-white/88 backdrop-blur-sm">
                <Compass className="h-3.5 w-3.5" />
                {t('Cẩm nang tham quan quanh THPT Marie Curie', 'Visitor Guide Around Marie Curie High School')}
              </div>

              <h1 className="display-serif max-w-2xl text-4xl font-black leading-[0.92] tracking-tight md:text-6xl">
                {displayTitle}
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/82 md:text-base">
                {displaySubtitle}
              </p>
              <p className="mt-3 max-w-xl text-sm leading-7 text-white/70">
                {t('Bắt đầu từ ', 'Starting from ')}
                <strong>{schoolAddress}</strong>
                {t(', rồi chọn nhịp tham quan phù hợp cho khách, phụ huynh hoặc cựu học sinh.', ', then choose the pace that suits visitors, parents, or alumni.')}
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {preset && (
                  <button
                    onClick={onLoadPreset}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-900 transition-transform hover:-translate-y-0.5"
                  >
                    <Wand2 className="h-4 w-4" />
                    {t('Thử lộ trình mẫu', 'Try sample route')}
                  </button>
                )}
                <div className="rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white/82 backdrop-blur-sm">
                  {t('Mỗi điểm chỉ ghé 1 lần, lớp đồ thị chỉ hiện sau khi đã chọn xong hành trình.', 'Each stop is visited once, and the graph view only appears after the route is selected.')}
                </div>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className={`rounded-[24px] border px-4 py-4 backdrop-blur-sm ${panelTint}`}>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">{t('Điểm khởi hành', 'Starting point')}</div>
                  <div className="mt-2 text-xl font-bold">{schoolName}</div>
                  <div className="mt-1 text-sm text-white/72">
                    {t('Có thể chọn làm điểm số 1 để tour bám đúng ngữ cảnh thăm trường.', 'Use this as stop number 1 to keep the route anchored to the school visit context.')}
                  </div>
                </div>
                <div className={`rounded-[24px] border px-4 py-4 backdrop-blur-sm ${panelTint}`}>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">{t('Nhịp hành trình', 'Route rhythm')}</div>
                  <div className="mt-2 text-xl font-bold">
                    {count === 0 ? t('Chưa chọn điểm', 'No stops selected') : t(`${count} điểm đang cân nhắc`, `${count} stops in consideration`)}
                  </div>
                  <div className="mt-1 text-sm text-white/72">{hintText}</div>
                </div>
                <div className={`rounded-[24px] border px-4 py-4 backdrop-blur-sm ${panelTint}`}>
                  <div className="text-[11px] uppercase tracking-[0.24em] text-white/60">{t('Tính cách tour', 'Tour style')}</div>
                  <div className="mt-2 text-xl font-bold">{lang === 'en' ? cfg.personalityEn : cfg.personality}</div>
                  <div className="mt-1 text-sm text-white/72">{lang === 'en' ? cfg.personalityDescEn : cfg.personalityDesc}</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[32px] border border-white/15 bg-black/18 p-5 backdrop-blur-md">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">{t('Câu chuyện hành trình', 'Route story')}</div>
                <div className="mt-3 text-2xl font-black leading-tight">
                  {t(
                    'Khách đến trường có thể bước ra cổng, đi bộ qua các điểm biểu tượng, rồi mới mở lớp bản đồ để xem lời giải toán học.',
                    'Visitors can leave the school gate, walk past iconic city stops, then open the graph layer to see the mathematical solution.',
                  )}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {selectedLocations.length > 0 ? selectedLocations.slice(0, 5).map((loc, idx) => (
                  <div key={loc.id} className="flex items-center justify-between border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.24em] text-white/50">{t(`Điểm ${idx + 1}`, `Stop ${idx + 1}`)}</div>
                      <div className="mt-1 text-base font-semibold text-white">{t(loc.fullName, loc.fullNameEn)}</div>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/82">
                      {idx === 0
                        ? t('Xuất phát', 'Start')
                        : appMode === 'path' && loc.id === endId
                          ? t('Kết thúc', 'Finish')
                          : t('Dừng chân', 'Stop')}
                    </div>
                  </div>
                )) : (
                  <div className="rounded-[24px] border border-dashed border-white/20 p-5 text-sm leading-7 text-white/72">
                    {t(
                      'Hãy nhấn vào các điểm du lịch bên dưới. Từ đây, trang này sẽ đọc giống một city guide hơn là một bảng điều khiển kỹ thuật.',
                      'Tap the destinations below. From here, the page reads like a city guide instead of a technical dashboard.',
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="px-6 pb-32 pt-8 md:px-8 lg:px-10">
          <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">{t('Chọn điểm dừng', 'Choose destinations')}</div>
              <h2 className="display-serif mt-2 text-3xl font-black tracking-tight text-slate-900">
                {t('Những nơi nên ghé nếu đã đến thăm THPT Marie Curie', 'Places worth visiting after arriving at Marie Curie High School')}
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                {t(
                  'Mỗi thẻ dưới đây là một gợi ý dừng chân thật sự quanh khu Nam Kỳ Khởi Nghĩa, Võ Thị Sáu và trung tâm quận 1. Hãy chọn theo đúng gu tham quan của khách: kiến trúc, lịch sử, không gian xanh hay nhịp sống địa phương.',
                  'Each card below is a real stop around Nam Ky Khoi Nghia, Vo Thi Sau and central District 1. Pick based on your visitor profile: architecture, history, greenery or local city life.',
                )}
              </p>
            </div>
            <div className="rounded-[28px] border border-[#ded5c5] bg-[#f6f0e4] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">{t('Cách dùng nhanh', 'Quick guide')}</div>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">1</span>
                  <span>{t('Chọn điểm đầu tiên làm xuất phát, lý tưởng nhất là ', 'Choose the first stop as the starting point, ideally ')}<strong>{schoolName}</strong>.</span>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">2</span>
                  <span>{t('Chọn đủ 5 điểm cho Bài 1 và Bài 2. Bài 3 cho phép mở rộng từ 5 điểm trở lên.', 'Pick 5 places for Modes 1 and 2. Mode 3 can expand from 5 stops upward.')}</span>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">3</span>
                  <span>{t('Nhấn ', 'Press ')}<strong>{t('Gợi ý lộ trình', 'Suggest route')}</strong>{t(' để mở lớp bản đồ và xem lời giải bài toán ở tầng sau.', ' to open the map layer and reveal the algorithmic solution.')}</span>
                </div>
              </div>
            </div>
          </div>

          {count > 0 && (
            <div className="mb-6 flex flex-wrap items-center gap-2 rounded-[26px] border border-[#e8ded0] bg-white/90 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
              <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{t('Hành trình đang chọn', 'Current route')}</span>
              {selectedIds.map((id, idx) => {
                const loc = locations.find(l => l.id === id)!;
                const isStart = idx === 0;
                const isEnd = appMode === 'path' && id === endId;

                return (
                  <span
                    key={id}
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold ${
                      isStart ? 'border-blue-200 bg-blue-50 text-blue-700' :
                      isEnd ? 'border-rose-200 bg-rose-50 text-rose-700' :
                      'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {idx + 1}. {t(loc.fullName, loc.fullNameEn)}
                    {isStart ? ` • ${t('XP', 'Start')}` : isEnd ? ` • ${t('KT', 'End')}` : ''}
                  </span>
                );
              })}
              <button
                onClick={onClearAll}
                className="ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('Làm lại từ đầu', 'Reset route')}
              </button>
            </div>
          )}

          {/* ── Bộ lọc ── */}
          <div className="mb-5 space-y-3">
            {/* Category chips */}
            {availableCategories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveCategories([])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeCategories.length === 0
                      ? 'border-slate-800 bg-slate-800 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {t('Tất cả', 'All')}
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      activeCategories.includes(cat)
                        ? 'border-slate-800 bg-slate-800 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    {lang === 'en' ? (CATEGORY_EN[cat] ?? cat) : cat}
                  </button>
                ))}
              </div>
            )}

            {/* Near/Far filter + geolocation */}
            <div className="flex flex-wrap items-center gap-2">
              {geoState.status !== 'ok' ? (
                <button
                  onClick={requestGeo}
                  disabled={geoState.status === 'loading'}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 disabled:opacity-60"
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {geoState.status === 'loading'
                    ? t('Đang xác định vị trí...', 'Locating...')
                    : geoState.status === 'error'
                      ? t('Không lấy được vị trí', 'Location unavailable')
                      : t('Bật vị trí để lọc gần/xa', 'Enable location for near/far filter')}
                </button>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Navigation className="h-3.5 w-3.5 text-emerald-500" />
                    {t('Vị trí đã bật', 'Location active')}
                  </span>
                  {(['all', 'near', 'far'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setNearFar(f)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                        nearFar === f
                          ? 'border-emerald-600 bg-emerald-600 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                      }`}
                    >
                      {f === 'all' ? t('Tất cả', 'All') : f === 'near' ? t('Gần tôi (<2 km)', 'Near me (<2 km)') : t('Xa hơn', 'Further away')}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filteredLocations.map(loc => {
              const idx = selectedIds.indexOf(loc.id);
              const isSelected = idx !== -1;
              const isDisabled = !isSelected && count >= cfg.max;

              return (
                <LocationCard
                  key={loc.id}
                  location={loc}
                  selectionIndex={isSelected ? idx : null}
                  isStart={idx === 0}
                  isEnd={appMode === 'path' && loc.id === endId}
                  isDisabled={isDisabled}
                  distanceKm={distanceMap[loc.id]}
                  onClick={() => onToggle(loc.id)}
                />
              );
            })}
            {filteredLocations.length === 0 && (
              <div className="col-span-full rounded-[24px] border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
                {t('Không có địa điểm nào khớp bộ lọc.', 'No destinations match the current filters.')}
              </div>
            )}
          </div>

          {appMode === 'path' && count === cfg.required && (
            <div className="mt-8 rounded-[30px] border border-rose-200 bg-[linear-gradient(135deg,#fff1f5,#fff7f6)] p-5 shadow-[0_12px_35px_rgba(190,24,93,0.08)]">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-sm font-black text-white">{t('KT', 'End')}</div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-400">{t('Bước cuối', 'Final step')}</div>
                  <div className="text-lg font-black text-rose-800">{t('Chọn điểm kết thúc cho hành trình', 'Choose the final destination')}</div>
                </div>
              </div>
              <p className="mb-4 text-sm leading-7 text-rose-700">
                {t('Điểm xuất phát hiện tại là ', 'The current starting point is ')}
                <strong>{t(locations.find(l => l.id === startId)?.fullName ?? '', locations.find(l => l.id === startId)?.fullNameEn)}</strong>.
                {t(' Hãy chọn nơi muốn khép tour để hệ thống gợi ý một đường đi thật mạch lạc.', ' Choose where the journey should end so the system can suggest a coherent route.')}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedIds.filter(id => id !== startId).map(id => {
                  const loc = locations.find(l => l.id === id)!;

                  return (
                    <button
                      key={id}
                      onClick={() => onSetEnd(endId === id ? null : id)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                        endId === id
                          ? 'border-rose-500 bg-rose-500 text-white shadow'
                          : 'border-white bg-white text-slate-700 hover:border-rose-300'
                      }`}
                    >
                      {t(loc.fullName, loc.fullNameEn)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-8 rounded-[30px] border border-[#e4dbc9] bg-white p-5 shadow-[0_14px_35px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">{t('Lớp sau của bài toán', 'The algorithm layer')}</div>
                <h3 className="display-serif mt-2 text-2xl font-black tracking-tight text-slate-900">
                  {t('Bản đồ và thuật toán chỉ xuất hiện khi đã có câu chuyện hành trình', 'The map and algorithm appear only after the route story is ready')}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {t(
                    'Giao diện này ưu tiên vai trò cẩm nang du lịch. Sau khi chọn điểm, hệ thống mới mở lớp đồ thị để phục vụ thao giảng: mỗi điểm chỉ đi qua một lần, có thể xem từng bước quay lui, và đủ trực quan để giải thích cho học sinh.',
                    'This interface prioritizes the travel-guide experience. After the stops are selected, the graph layer opens for teaching: each place is visited once, backtracking steps can be replayed, and the logic stays visual enough for students.',
                  )}
                </p>
              </div>
              <div className="grid min-w-[250px] gap-3 text-sm text-slate-700">
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  {t('Điểm đầu tiên được xem là xuất phát', 'The first selected stop becomes the starting point')}
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <Route className="h-4 w-4 text-emerald-600" />
                  {t('Mỗi điểm chỉ được ghé đúng một lần', 'Each stop can be visited only once')}
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  {t('Lộ trình mẫu giúp thao tác nhanh khi trình chiếu', 'Sample routes make classroom demos faster')}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="guide-footer px-6 py-4 md:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            {!isReady ? (
              <p className="text-xs text-slate-500">
                {count === 0
                  ? t('Nhấn vào các thẻ để biến trang này thành một cẩm nang thực sự cho khách đến thăm trường.', 'Select the cards to turn this page into a real guidebook for school visitors.')
                  : hintText}
              </p>
            ) : (
              <p className="text-xs font-semibold text-emerald-700">
                {t('Sẵn sàng. Có thể mở lớp bản đồ để hệ thống gợi ý lộ trình ngắn nhất.', 'Ready. You can now open the map layer to get the shortest route suggestion.')}
              </p>
            )}
          </div>
          <button
            onClick={onFindRoute}
            disabled={!isReady}
            className={`inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-black text-white transition-all ${
              isReady ? `${cfg.btnClass} shadow-lg shadow-current/30 hover:-translate-y-0.5` : 'cursor-not-allowed bg-slate-300'
            }`}
          >
            {t('Gợi ý lộ trình', 'Suggest route')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
