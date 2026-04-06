import React, { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Navigation, RotateCcw, Wand2 } from 'lucide-react';
import { TouristLocation, AppMode, LocationCategory } from '../types';
import { LocationCard } from './LocationCard';
import { LocationDetailModal } from './LocationDetailModal';
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
  onQuickStart: () => void;
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
    titleEn: 'A loop around Marie Curie',
    subtitle: 'Khi muốn dẫn khách đi một vòng gọn gàng rồi quay lại điểm xuất phát, bài toán này giúp biến chuyến tham quan thành một hành trình trọn vẹn và dễ thuyết trình.',
    subtitleEn: 'When visitors need a neat round trip that returns to the start, this problem turns the tour into a complete route that is easy to explain.',
    hint: (n: number) => n < 5 ? `Cần thêm ${5 - n} điểm.` : 'Đủ 5 điểm. Có thể chạy kết quả.',
    hintEn: (n: number) => n < 5 ? `Need ${5 - n} more stops.` : '5 stops ready. You can run the result.',
    story: 'Một đoàn khách đến thăm trường rồi muốn dạo qua các điểm tiêu biểu quanh trung tâm thành phố trước khi quay về nơi ban đầu. Câu chuyện của Bài 1 là một hành trình khép kín, đẹp về mặt trải nghiệm và rõ về mặt cấu trúc.',
    storyEn: 'A visitor group starts at the school, explores landmark stops around the city center, then returns to where the tour began. Mode 1 is about a closed journey that feels complete and structured.',
    need: 'Nhu cầu: tìm một chu trình ngắn nhất đi qua mỗi điểm đúng một lần và quay lại điểm xuất phát.',
    needEn: 'Need: find the shortest cycle that visits each stop exactly once and returns to the start.',
  },
  path: {
    required: 5,
    max: 5,
    btnClass: 'bg-[#6b2745] hover:bg-[#571f38]',
    title: 'Từ cổng trường đến một điểm hẹn cuối',
    titleEn: 'From the school gate to a final destination',
    subtitle: 'Có những chuyến đi không cần quay lại, chỉ cần dẫn người xem từ một điểm xuất phát rõ ràng đến một nơi kết thúc hợp lý, liền mạch và có câu chuyện.',
    subtitleEn: 'Some trips do not need to return. They only need to guide visitors from a clear starting point to a meaningful ending in one coherent story.',
    hint: (n: number) => n < 5 ? `Cần thêm ${5 - n} điểm.` : 'Đủ 5 điểm. Chọn điểm kết thúc để chạy.',
    hintEn: (n: number) => n < 5 ? `Need ${5 - n} more stops.` : '5 stops ready. Choose the end stop to run.',
    story: 'Bài 2 phù hợp khi chuyến tham quan bắt đầu ở Marie Curie nhưng kết thúc ở một điểm hẹn khác, như nhà thờ, công viên hay bảo tàng. Nó mô phỏng nhu cầu thật của một lộ trình đi một chiều có chủ đích.',
    storyEn: 'Mode 2 fits a tour that starts at Marie Curie but ends at another destination such as a church, a park, or a museum. It models a real one-way route with a clear purpose.',
    need: 'Nhu cầu: tìm đường đi ngắn nhất qua mỗi điểm đúng một lần, từ điểm đầu đến điểm cuối đã chọn.',
    needEn: 'Need: find the shortest path that visits each stop exactly once, from the chosen start to the chosen end.',
  },
  subset: {
    required: 2,
    max: Number.MAX_SAFE_INTEGER,
    btnClass: 'bg-[#82501f] hover:bg-[#6a4018]',
    title: 'Đi nhanh nhất từ điểm đầu đến điểm cuối',
    titleEn: 'Fastest route from start to finish',
    subtitle: 'Thầy có thể chọn một tập địa điểm quan tâm, rồi yêu cầu hệ thống tìm đường đi ngắn nhất từ điểm đầu đến điểm cuối chỉ trong tập đó, không dùng các điểm ngoài danh sách.',
    subtitleEn: 'You can choose a subset of locations, then ask the system to find the shortest route from start to finish using only that chosen subset.',
    hint: (n: number) => n < 2 ? `Cần thêm ${2 - n} địa điểm.` : `Đã có ${n} điểm trong tập chọn. Chọn điểm kết thúc để chạy.`,
    hintEn: (n: number) => n < 2 ? `Need ${2 - n} more locations.` : `${n} locations selected. Choose the finish point to run.`,
    story: 'Bài 3 phù hợp khi thầy muốn khoanh riêng một nhóm điểm để minh họa. Thuật toán chỉ được phép đi bên trong nhóm đó, nên lời giải bám sát đúng phạm vi mà thầy chọn.',
    storyEn: 'Mode 3 fits teaching cases where you want to focus on a specific subset. The algorithm is restricted to that subset, so the solution stays within the chosen scope.',
    need: 'Nhu cầu: tìm đường đi ngắn nhất giữa hai địa điểm trong chính tập điểm đã chọn, không bắt buộc đi qua hết.',
    needEn: 'Need: find the shortest path between two locations inside the chosen subset, without visiting all of them.',
  },
} as const;

export const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  locations, appMode, selectedIds, onToggle, onClearAll, onFindRoute,
  onQuickStart, onLoadPreset, preset, endId, onSetEnd,
}) => {
  const { lang, t } = useLang();
  const cfg = MODE_CONFIG[appMode];
  const { state: geoState, request: requestGeo } = useGeolocation();
  const [detailLocationId, setDetailLocationId] = useState<string | null>(null);

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
  const isEndMode = appMode === 'path' || appMode === 'subset';
  const selectedLocations = selectedIds
    .map(id => locations.find(loc => loc.id === id))
    .filter((loc): loc is TouristLocation => Boolean(loc));
  const detailLocation = detailLocationId
    ? locations.find(location => location.id === detailLocationId) ?? null
    : null;
  const isReady = appMode === 'path'
    ? count === cfg.required && endId !== null && endId !== startId
    : isEndMode
      ? count >= cfg.required && endId !== null && endId !== startId
      : count >= cfg.required;

  const hintText = lang === 'en' ? cfg.hintEn(count) : cfg.hint(count);
  const displayTitle = lang === 'en' ? cfg.titleEn : cfg.title;
  const displaySubtitle = lang === 'en' ? cfg.subtitleEn : cfg.subtitle;
  const displayStory = lang === 'en' ? cfg.storyEn : cfg.story;
  const displayNeed = lang === 'en' ? cfg.needEn : cfg.need;
  const selectedSummaryText = selectedLocations
    .slice(0, 3)
    .map(loc => t(loc.fullName, loc.fullNameEn))
    .join(', ');
  const themeClass =
    appMode === 'cycle' ? 'from-[#102c3f] via-[#1f4f73] to-[#d7a15e]' :
    appMode === 'path' ? 'from-[#4d1f32] via-[#8c355c] to-[#d29b73]' :
    'from-[#4f3618] via-[#9b6735] to-[#ead4ad]';
  const flowCards = [
    {
      id: 'pick',
      title: t('Chọn điểm', 'Pick stops'),
      note: t(`Đã có ${count}/${appMode === 'subset' ? Math.max(count, cfg.required) : cfg.required} điểm`, `${count} selected`),
      active: count < cfg.required,
      done: count >= cfg.required,
    },
    {
      id: 'end',
      title: t('Chọn điểm cuối', 'Choose endpoint'),
      note: isEndMode
        ? endId
          ? t('Đã chốt điểm kết thúc', 'Endpoint selected')
          : t('Cần chọn sau khi đủ điểm', 'Select after enough stops')
        : t('Không cần cho bài toán này', 'Not needed in this mode'),
      active: isEndMode && count >= cfg.required && !endId,
      done: !isEndMode || (endId !== null && endId !== startId),
    },
    {
      id: 'preview',
      title: t('Xem trước đồ thị', 'Preview graph'),
      note: isReady
        ? t('Có thể mở bước xem trước', 'Ready for preview')
        : t('Khóa cho đến khi đủ dữ liệu', 'Locked until ready'),
      active: isReady,
      done: false,
    },
  ];

  return (
    <div className="guide-shell flex h-full min-h-0 flex-col overflow-hidden text-slate-900">
      <div className="flex-1 overflow-y-auto">
        <section className="relative isolate overflow-hidden px-3 pb-3 pt-3 text-white md:px-8 md:pb-4 md:pt-6 lg:px-10">
          <div className="absolute inset-0 overflow-hidden rounded-[26px] md:rounded-[34px]">
            <div className="absolute inset-0 bg-[url('/images/hcm.jpg')] bg-cover bg-center" />
            <div className={`absolute inset-0 bg-gradient-to-r ${themeClass} opacity-75`} />
            <div className="absolute inset-0 bg-black/35" />
          </div>

          <div className="relative rounded-[26px] px-4 py-4 md:rounded-[34px] md:px-8 md:py-10 lg:px-10">
            <div className="max-w-3xl space-y-3 md:space-y-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/78">
                {t('Lộ trình quanh Marie Curie', 'Routes around Marie Curie')}
              </div>

              <h1 className="display-serif max-w-2xl text-[1.75rem] font-black leading-[0.96] tracking-tight md:mt-2 md:text-5xl">
                {displayTitle}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-white/88 md:mt-3 md:text-base">
                {displaySubtitle}
              </p>

              <p className="hidden max-w-3xl text-sm leading-6 text-white/78 md:mt-4 md:block md:text-[15px]">
                {displayStory}
              </p>

              <div className="rounded-[18px] border border-white/16 bg-white/10 px-3 py-2.5 text-xs leading-5 text-white/84 backdrop-blur-sm md:hidden">
                {displayNeed}
              </div>

              <div className="flex flex-col gap-2.5 pt-1 sm:flex-row sm:flex-wrap sm:items-center md:mt-5 md:pt-0">
                {preset && (
                  <>
                    <button
                      onClick={onQuickStart}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-bold text-slate-900 transition-transform hover:-translate-y-0.5 sm:w-auto sm:px-5"
                    >
                      <Wand2 className="h-4 w-4" />
                      {t('Xem mẫu ngay', 'Preview sample now')}
                    </button>
                    <button
                      onClick={onLoadPreset}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/16 sm:w-auto sm:px-5"
                    >
                      {t('Nạp mẫu để chỉnh', 'Load sample to edit')}
                    </button>
                  </>
                )}
              </div>

              <div className="hidden max-w-3xl rounded-[24px] border border-white/16 bg-white/10 px-4 py-3 text-sm leading-6 text-white/84 backdrop-blur-sm md:mt-5 md:block">
                <span className="font-semibold text-white">{t('Nhu cầu của bài toán: ', 'Problem need: ')}</span>
                {displayNeed}
              </div>

              <div className="inline-flex max-w-full rounded-full border border-white/20 bg-white/12 px-3 py-2 text-xs text-white/82 backdrop-blur-sm md:mt-4 md:px-4 md:text-sm">
                {count > 0
                  ? t(`Đang có ${count} điểm được chọn.`, `${count} stops currently selected.`)
                  : t('Có thể nạp lộ trình mẫu hoặc bắt đầu chọn thủ công ở phần bên dưới.', 'You can load a sample route or start selecting manually in the section below.')}
              </div>
            </div>
          </div>
        </section>

        <section className="px-3 pb-28 pt-4 md:px-8 md:pb-32 md:pt-6 lg:px-10">
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-3 md:mb-6 md:gap-3">
            {flowCards.map(card => (
              <div
                key={card.id}
                className={`rounded-[22px] border px-3 py-3 ${
                  card.active
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : card.done
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-white text-slate-600'
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">{card.title}</div>
                <div className="mt-1 text-sm font-semibold">{card.note}</div>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3 md:mb-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.32em] text-slate-400">{t('Chọn điểm dừng', 'Choose destinations')}</div>
              <h2 className="display-serif mt-1 text-[1.7rem] font-black tracking-tight text-slate-900 md:mt-2 md:text-3xl">
                {t('Chọn điểm hoặc dùng lộ trình mẫu', 'Pick stops or use the sample route')}
              </h2>
            </div>
            {preset && (
              <button
                onClick={onLoadPreset}
                className="hidden items-center gap-2 rounded-full border border-[#d8cbb8] bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-400 md:inline-flex"
              >
                <Wand2 className="h-4 w-4" />
                {t('Nạp mẫu', 'Load sample')}
              </button>
            )}
          </div>

          {count > 0 && (
            <div className="sticky top-2 z-20 mb-4 md:top-4 md:mb-6">
              <div className="rounded-[24px] border border-[#d8ccb8] bg-[rgba(255,250,243,0.94)] px-3 py-3 shadow-[0_20px_40px_rgba(15,23,42,0.09)] backdrop-blur md:rounded-[26px] md:px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.22)]">
                        <CheckCircle2 className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                          {t('Đã chọn xong bước này', 'Selection confirmed')}
                        </div>
                        <div className="text-sm font-black text-slate-900 md:text-base">
                          {t(`${count} địa điểm đang có trong hành trình`, `${count} places are in this route`)}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                      {selectedSummaryText}
                      {count > 3 ? t(` và thêm ${count - 3} điểm khác.`, ` and ${count - 3} more.`) : '.'}
                    </p>
                  </div>
                  <button
                    onClick={onClearAll}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#e4d9c8] bg-white px-3 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:border-red-200 hover:text-red-600 md:text-xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t('Làm lại', 'Reset')}
                  </button>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1 no-scrollbar md:flex-wrap md:items-center md:overflow-visible md:pb-0">
                  {selectedIds.map((id, idx) => {
                    const loc = locations.find(l => l.id === id)!;
                    const isStart = idx === 0;
                    const isEnd = isEndMode && id === endId;

                    return (
                      <span
                        key={id}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold md:text-xs ${
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
                </div>
              </div>
            </div>
          )}

          {/* ── Bộ lọc ── */}
          <div className="mb-4 space-y-3 md:mb-5">
            {/* Category chips */}
            {availableCategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar md:flex-wrap md:overflow-visible md:pb-0">
                <button
                  onClick={() => setActiveCategories([])}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar md:flex-wrap md:items-center md:overflow-visible md:pb-0">
              {geoState.status !== 'ok' ? (
                <button
                  onClick={requestGeo}
                  disabled={geoState.status === 'loading'}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-400 disabled:opacity-60"
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
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-500">
                    <Navigation className="h-3.5 w-3.5 text-emerald-500" />
                    {t('Vị trí đã bật', 'Location active')}
                  </span>
                  {(['all', 'near', 'far'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setNearFar(f)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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

          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-3 no-scrollbar md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:pb-0 xl:grid-cols-3">
            {filteredLocations.map(loc => {
              const idx = selectedIds.indexOf(loc.id);
              const isSelected = idx !== -1;
              const isDisabled = !isSelected && count >= cfg.max;

              return (
                <div key={loc.id} className="w-[82vw] max-w-[320px] shrink-0 snap-start md:w-auto md:max-w-none md:min-w-0">
                  <LocationCard
                    location={loc}
                    selectionIndex={isSelected ? idx : null}
                    isStart={idx === 0}
                    isEnd={isEndMode && loc.id === endId}
                    isDisabled={isDisabled}
                    distanceKm={distanceMap[loc.id]}
                    onOpen={() => setDetailLocationId(loc.id)}
                    onToggle={() => onToggle(loc.id)}
                  />
                </div>
              );
            })}
          </div>
          {filteredLocations.length === 0 && (
            <div className="col-span-full rounded-[24px] border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
              {t('Không có địa điểm nào khớp bộ lọc.', 'No destinations match the current filters.')}
            </div>
          )}

          {isEndMode && count === cfg.required && (
            <div className="mt-6 rounded-[24px] border border-rose-200 bg-[linear-gradient(135deg,#fff1f5,#fff7f6)] p-4 shadow-[0_12px_35px_rgba(190,24,93,0.08)] md:mt-8 md:rounded-[30px] md:p-5">
              <div className="mb-3 flex items-center gap-3 md:mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500 text-sm font-black text-white">{t('KT', 'End')}</div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-rose-400">{t('Bước cuối', 'Final step')}</div>
                  <div className="text-lg font-black text-rose-800">
                    {appMode === 'path'
                      ? t('Chọn điểm kết thúc cho hành trình', 'Choose the final destination')
                      : t('Chọn đích đến cho đường đi ngắn nhất', 'Choose the destination for the shortest path')}
                  </div>
                </div>
              </div>
              <p className="mb-4 text-sm leading-6 text-rose-700 md:leading-7">
                {t('Điểm xuất phát hiện tại là ', 'The current starting point is ')}
                <strong>{t(locations.find(l => l.id === startId)?.fullName ?? '', locations.find(l => l.id === startId)?.fullNameEn)}</strong>.
                {appMode === 'path'
                  ? t(' Hãy chọn nơi muốn khép tour để hệ thống gợi ý một đường đi thật mạch lạc.', ' Choose where the journey should end so the system can suggest a coherent route.')
                  : t(' Hãy chọn điểm đích để hệ thống tìm đường ngắn nhất nối hai đầu mút.', ' Choose the destination so the system can find the shortest path between the two endpoints.')}
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

        </section>
      </div>

      <LocationDetailModal
        location={detailLocation}
        isOpen={detailLocation !== null}
        isSelected={detailLocation ? selectedIds.includes(detailLocation.id) : false}
        isStart={detailLocation ? selectedIds[0] === detailLocation.id : false}
        isEnd={Boolean(detailLocation && isEndMode && endId === detailLocation.id)}
        isDisabled={Boolean(detailLocation && !selectedIds.includes(detailLocation.id) && count >= cfg.max)}
        distanceKm={detailLocation ? distanceMap[detailLocation.id] : undefined}
        onClose={() => setDetailLocationId(null)}
        onToggle={() => {
          if (!detailLocation) return;
          onToggle(detailLocation.id);
        }}
      />

      <div className="guide-footer px-4 py-3 md:px-8 md:py-4 lg:px-10">
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:gap-3">
          <div className="flex-1">
            {!isReady ? (
              <p className="text-xs text-slate-500">
                {count === 0
                  ? t('Chọn lộ trình mẫu hoặc tự chọn các điểm muốn chạy.', 'Load the sample route or pick the stops you want to run.')
                  : hintText}
              </p>
            ) : (
              <p className="text-xs font-semibold text-emerald-700">
                {t('Sẵn sàng. Mở bước xem trước để kiểm tra điểm, cạnh và thử vài tình huống trước khi giải.', 'Ready. Open the preview step to inspect nodes, edges, and quick trial cases before solving.')}
              </p>
            )}
          </div>
          <button
            onClick={onFindRoute}
            disabled={!isReady}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white transition-all md:w-auto md:px-6 ${
              isReady ? `${cfg.btnClass} shadow-lg shadow-current/30 hover:-translate-y-0.5` : 'cursor-not-allowed bg-slate-300'
            }`}
          >
            {t('Xem đồ thị trước', 'Preview graph first')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
