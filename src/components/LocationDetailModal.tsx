import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, ExternalLink, MapPinned, Navigation, Sparkles, X } from 'lucide-react';
import { TouristLocation } from '../types';
import { CATEGORY_EN, useLang } from '../contexts/LanguageContext';

interface LocationDetailModalProps {
  location: TouristLocation | null;
  isOpen: boolean;
  isSelected: boolean;
  isStart: boolean;
  isEnd: boolean;
  isDisabled: boolean;
  distanceKm?: number;
  onClose: () => void;
  onToggle: () => void;
}

export const LocationDetailModal: React.FC<LocationDetailModalProps> = ({
  location,
  isOpen,
  isSelected,
  isStart,
  isEnd,
  isDisabled,
  distanceKm,
  onClose,
  onToggle,
}) => {
  const { lang, t } = useLang();
  const [imageIndex, setImageIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    setImageIndex(0);
  }, [location?.id]);

  const images = useMemo(() => {
    if (!location) return [];
    if (location.images?.length) return location.images;
    if (location.imageUrl) return [location.imageUrl];
    return [];
  }, [location]);

  if (!isOpen || !location) return null;

  const displayName = t(location.fullName, location.fullNameEn);
  const displayCategory = lang === 'en' ? (CATEGORY_EN[location.category] ?? location.category) : location.category;
  const displayNeighborhood = t(location.neighborhood ?? '', location.neighborhoodEn);
  const displayDescription = t(location.description, location.descriptionEn ?? location.description);
  const displayIntro = t(
    location.shortIntro ?? location.description,
    location.shortIntroEn ?? location.descriptionEn ?? location.shortIntro ?? location.description,
  );
  const displayBestFor = t(location.bestFor ?? '', location.bestForEn);
  const displayHighlights = lang === 'en' && location.highlightsEn?.length ? location.highlightsEn : location.highlights;
  const distanceLabel = distanceKm === undefined
    ? null
    : distanceKm < 1
      ? `${Math.round(distanceKm * 1000)} m`
      : `${distanceKm.toFixed(1)} km`;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm md:items-center md:p-6" onClick={onClose}>
      <div
        className="max-h-[94vh] w-full overflow-hidden rounded-t-[30px] bg-[#f8f3eb] shadow-[0_30px_100px_rgba(15,23,42,0.35)] md:max-w-5xl md:rounded-[32px]"
        onClick={event => event.stopPropagation()}
      >
        <div className="grid max-h-[94vh] grid-cols-1 overflow-hidden md:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[280px] bg-slate-900 md:min-h-[640px]">
            {images.length > 0 ? (
              <>
                <img src={images[imageIndex]} alt={displayName} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.72))]" />
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top_left,#7c8aa0,#334155_62%,#0f172a)] p-8 text-center text-white/80">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.28em] text-white/60">{displayCategory}</div>
                  <div className="mt-3 text-3xl font-black">{displayName}</div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
              aria-label={t('Đóng', 'Close')}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="absolute left-4 top-4 flex flex-wrap gap-2 pr-16">
              <span className="rounded-full border border-white/15 bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                {displayCategory}
              </span>
              {distanceLabel && (
                <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-black/20 px-3 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                  <Navigation className="h-3 w-3" />
                  {distanceLabel}
                </span>
              )}
            </div>

            <div className="absolute inset-x-0 bottom-0 p-5 text-white md:p-7">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/70">{location.label.replace(/\n/g, ' ')}</div>
              <h2 className="mt-2 max-w-lg text-3xl font-black leading-none md:text-5xl">{displayName}</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-white/84 md:text-base">{displayIntro}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {displayNeighborhood && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm">
                    <MapPinned className="h-3.5 w-3.5" />
                    {displayNeighborhood}
                  </span>
                )}
                {location.visitDuration && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs backdrop-blur-sm">
                    <Clock3 className="h-3.5 w-3.5" />
                    {location.visitDuration}
                  </span>
                )}
              </div>
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImageIndex(current => (current - 1 + images.length) % images.length)}
                  className="absolute left-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
                  aria-label={t('Ảnh trước', 'Previous image')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setImageIndex(current => (current + 1) % images.length)}
                  className="absolute right-4 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur-sm transition-colors hover:bg-black/40"
                  aria-label={t('Ảnh tiếp theo', 'Next image')}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <div className="absolute bottom-4 right-4 flex gap-1.5">
                  {images.map((image, index) => (
                    <button
                      type="button"
                      key={image}
                      onClick={() => setImageIndex(index)}
                      className={`h-2 rounded-full transition-all ${index === imageIndex ? 'w-8 bg-white' : 'w-2 bg-white/45'}`}
                      aria-label={`${t('Ảnh', 'Image')} ${index + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="flex max-h-[94vh] flex-col overflow-hidden">
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 md:px-7 md:py-7">
              <div className="rounded-[24px] border border-white/70 bg-white/92 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">{t('Tóm tắt địa danh', 'Location snapshot')}</div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{displayDescription}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {displayBestFor && (
                  <div className="rounded-[22px] border border-[#eadfce] bg-[#fffaf2] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('Phù hợp cho', 'Best for')}</div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-slate-800">{displayBestFor}</div>
                  </div>
                )}
                {location.visitDuration && (
                  <div className="rounded-[22px] border border-[#eadfce] bg-[#fffaf2] p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('Thời lượng gợi ý', 'Suggested duration')}</div>
                    <div className="mt-2 text-sm font-semibold leading-6 text-slate-800">{location.visitDuration}</div>
                  </div>
                )}
              </div>

              {displayHighlights && displayHighlights.length > 0 && (
                <div className="rounded-[24px] border border-[#eadfce] bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">{t('Điểm nổi bật', 'Highlights')}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {displayHighlights.map(item => (
                      <span key={item} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#e8ded0] bg-white/92 px-5 py-4 md:px-7">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                  {isSelected && (
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
                      isStart ? 'bg-blue-50 text-blue-700' : isEnd ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                    }`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {isStart ? t('Điểm xuất phát', 'Starting point') : isEnd ? t('Điểm kết thúc', 'Ending point') : t('Đã nằm trong hành trình', 'Already selected')}
                    </span>
                  )}
                  {location.googleMapsUrl && (
                    <a
                      href={location.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Google Maps
                    </a>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onToggle}
                  disabled={isDisabled && !isSelected}
                  className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-all ${
                    isSelected
                      ? isStart
                        ? 'bg-blue-500 text-white'
                        : isEnd
                          ? 'bg-rose-500 text-white'
                          : 'bg-emerald-500 text-white'
                      : isDisabled
                        ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  {isSelected ? t('Bỏ khỏi hành trình', 'Remove from trip') : t('Thêm vào hành trình', 'Add to trip')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
