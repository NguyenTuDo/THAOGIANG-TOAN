import React, { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Map as MapIcon,
  MapPinned,
  Navigation,
  Route as RouteIcon,
  Sparkles,
} from 'lucide-react';
import { useLang, CATEGORY_EN } from '../contexts/LanguageContext';
import { AppMode, Route, SelectedElement, TouristLocation } from '../types';

interface LocationInsightPanelProps {
  selectedElement: SelectedElement;
  locations: TouristLocation[];
  routes: Route[];
  appMode: AppMode;
}

const CATEGORY_GRADIENT: Record<string, string> = {
  'Di sản học đường': 'from-[#14342b] via-[#1e5244] to-[#9cc6a3]',
  'Danh lam thắng cảnh': 'from-[#12375d] via-[#1f5f8b] to-[#d7a15e]',
  'Ẩm thực': 'from-[#5b1f16] via-[#b85c38] to-[#f1c27d]',
  'Mua sắm': 'from-[#4a274f] via-[#81537f] to-[#dcc6e0]',
  'Bảo tàng': 'from-[#213640] via-[#4f7d73] to-[#d8ccb8]',
  'Công viên': 'from-[#20412c] via-[#5b8c5a] to-[#d9e7bf]',
  'Khách sạn': 'from-[#47311b] via-[#9e7a47] to-[#ead9b0]',
};

export const LocationInsightPanel: React.FC<LocationInsightPanelProps> = ({
  selectedElement,
  locations,
  routes,
  appMode,
}) => {
  const { lang, t } = useLang();
  const [imageIndex, setImageIndex] = useState(0);

  const selectedLocation = useMemo(() => {
    if (selectedElement?.type !== 'location') return null;
    return locations.find(location => location.id === selectedElement.id) ?? null;
  }, [locations, selectedElement]);

  const selectedRoute = useMemo(() => {
    if (selectedElement?.type !== 'route') return null;
    return routes.find(route => route.id === selectedElement.id) ?? null;
  }, [routes, selectedElement]);

  const routeEndpoints = useMemo(() => {
    if (!selectedRoute) return null;
    return {
      from: locations.find(location => location.id === selectedRoute.from) ?? null,
      to: locations.find(location => location.id === selectedRoute.to) ?? null,
    };
  }, [locations, selectedRoute]);

  if (!selectedLocation && !selectedRoute) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
          {t('Khám phá địa điểm', 'Explore stop')}
        </div>
        <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm leading-6 text-slate-500">
          {t(
            'Bấm vào một điểm trên bản đồ hoặc đồ thị để xem ảnh, thông tin chi tiết, highlights và liên kết Google Maps.',
            'Click a stop on the map or graph to view images, detailed information, highlights, and the Google Maps link.',
          )}
        </div>
      </div>
    );
  }

  if (selectedRoute && routeEndpoints) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
        <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
          {t('Thông tin cạnh', 'Route segment')}
        </div>
        <div className="mt-3 rounded-[22px] bg-slate-900 px-4 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-white/60">{selectedRoute.id}</div>
              <div className="mt-2 text-lg font-black">
                {routeEndpoints.from?.fullName ?? selectedRoute.from}
              </div>
              <div className="text-sm text-white/72">
                {t('đến', 'to')} {routeEndpoints.to?.fullName ?? selectedRoute.to}
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2 text-right">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">{t('Khoảng cách', 'Distance')}</div>
              <div className="mt-1 text-2xl font-black">{selectedRoute.distanceKm.toFixed(1)} km</div>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-sm text-slate-700">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
            <div className="inline-flex items-center gap-2 font-semibold text-slate-800"><Navigation className="h-4 w-4 text-sky-600" /> {t('Điểm đầu', 'From')}</div>
            <div className="mt-1">{routeEndpoints.from?.fullName ?? selectedRoute.from}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
            <div className="inline-flex items-center gap-2 font-semibold text-slate-800"><RouteIcon className="h-4 w-4 text-amber-600" /> {t('Điểm đến', 'To')}</div>
            <div className="mt-1">{routeEndpoints.to?.fullName ?? selectedRoute.to}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs leading-6 text-slate-600">
            {t(
              appMode === 'path'
                ? 'Đây là một đoạn trong đường đi Hamilton một chiều từ điểm xuất phát đến điểm kết thúc.'
                : 'Đây là một đoạn trong chu trình khép kín, mỗi điểm chỉ ghé đúng một lần trước khi hoàn tất lộ trình.',
              appMode === 'path'
                ? 'This segment belongs to the one-way Hamiltonian path from the start to the destination.'
                : 'This segment belongs to the closed tour where each stop is visited exactly once before the route is completed.',
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!selectedLocation) return null;

  const images = selectedLocation.images?.length
    ? selectedLocation.images
    : selectedLocation.imageUrl
      ? [selectedLocation.imageUrl]
      : [];

  const gradient = CATEGORY_GRADIENT[selectedLocation.category] ?? 'from-slate-600 via-slate-700 to-slate-800';
  const displayCategory = lang === 'en' ? (CATEGORY_EN[selectedLocation.category] ?? selectedLocation.category) : selectedLocation.category;
  const displayName = t(selectedLocation.fullName, selectedLocation.fullNameEn);
  const displayIntro = t(
    selectedLocation.shortIntro ?? selectedLocation.description,
    selectedLocation.shortIntroEn ?? selectedLocation.descriptionEn,
  );
  const displayDescription = t(selectedLocation.description, selectedLocation.descriptionEn);
  const displayNeighborhood = t(selectedLocation.neighborhood ?? '', selectedLocation.neighborhoodEn);
  const displayBestFor = t(selectedLocation.bestFor ?? '', selectedLocation.bestForEn);
  const displayHighlights = lang === 'en' && selectedLocation.highlightsEn?.length
    ? selectedLocation.highlightsEn
    : selectedLocation.highlights;

  const prevImage = () => setImageIndex(current => (current - 1 + images.length) % images.length);
  const nextImage = () => setImageIndex(current => (current + 1) % images.length);

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">
        {t('Hồ sơ điểm đến', 'Stop profile')}
      </div>

      <div className={`relative mt-3 overflow-hidden rounded-[24px] bg-gradient-to-br ${gradient}`}>
        {images.length > 0 ? (
          <>
            <img src={images[imageIndex]} alt={displayName} className="h-52 w-full object-cover" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_28%),linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.82)_100%)]" />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={prevImage}
                  className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                  title={t('Ảnh trước', 'Previous image')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={nextImage}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
                  title={t('Ảnh tiếp theo', 'Next image')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-14 left-1/2 flex -translate-x-1/2 gap-1.5">
                  {images.map((image, index) => (
                    <span key={image} className={`h-1.5 w-1.5 rounded-full ${index === imageIndex ? 'bg-white' : 'bg-white/40'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="h-52 w-full bg-gradient-to-br from-white/20 to-black/10" />
        )}

        <div className="absolute left-4 top-4 rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
          {displayCategory}
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/70">{selectedLocation.id}</div>
          <div className="mt-2 text-[2rem] font-black leading-[0.95] tracking-tight">{displayName}</div>
          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs text-white/88 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> {displayIntro}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {displayNeighborhood && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <div className="inline-flex items-center gap-2 font-semibold text-slate-800"><MapPinned className="h-4 w-4 text-sky-600" /> {t('Khu vực', 'Area')}</div>
            <div className="mt-1 text-sm leading-7 text-slate-600">{displayNeighborhood}</div>
          </div>
        )}
        {selectedLocation.visitDuration && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-700">
            <div className="inline-flex items-center gap-2 font-semibold text-slate-800"><Clock3 className="h-4 w-4 text-amber-600" /> {t('Thời lượng', 'Visit time')}</div>
            <div className="mt-1 text-sm leading-7 text-slate-600">{selectedLocation.visitDuration}</div>
          </div>
        )}
      </div>

      <div className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('Giới thiệu', 'Overview')}</div>
        <div className="mt-2 text-sm leading-7 text-slate-700">{displayDescription}</div>
      </div>

      {(displayBestFor || selectedLocation.googleMapsUrl) && (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {displayBestFor && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-700">
              <div className="inline-flex items-center gap-2 font-semibold text-slate-800"><Navigation className="h-4 w-4 text-emerald-600" /> {t('Phù hợp', 'Best for')}</div>
              <div className="mt-1 text-sm leading-7 text-slate-600">{displayBestFor}</div>
            </div>
          )}
          {selectedLocation.googleMapsUrl && (
            <a
              href={selectedLocation.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 text-sm text-slate-700 transition hover:bg-slate-100"
            >
              <div className="inline-flex items-center gap-2 font-semibold text-slate-800"><MapIcon className="h-4 w-4 text-blue-600" /> Google Maps</div>
              <div className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
                {t('Mở bản đồ chỉ đường', 'Open navigation link')} <ExternalLink className="h-3.5 w-3.5" />
              </div>
            </a>
          )}
        </div>
      )}

      {displayHighlights && displayHighlights.length > 0 && (
        <div className="mt-3 rounded-2xl border border-slate-100 bg-white px-3 py-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{t('Điểm nổi bật', 'Highlights')}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {displayHighlights.map(item => (
              <span key={item} className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,0.04)]">
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};