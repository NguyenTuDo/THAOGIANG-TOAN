import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Map as MapIcon, MapPinned, Navigation, Plus } from 'lucide-react';
import { TouristLocation } from '../types';
import { useLang, CATEGORY_EN } from '../contexts/LanguageContext';

const CATEGORY_THEME: Record<string, {
  gradient: string;
  eyebrow: string;
  eyebrowEn: string;
  meta: string;
  metaEn: string;
  accent: string;
}> = {
  'Di sản học đường': {
    gradient: 'from-[#14342b] via-[#1e5244] to-[#9cc6a3]',
    eyebrow: 'Điểm phải ghé',
    eyebrowEn: 'Must Visit',
    meta: 'Bắt đầu hành trình',
    metaEn: 'Start here',
    accent: 'text-emerald-50',
  },
  'Danh lam thắng cảnh': {
    gradient: 'from-[#12375d] via-[#1f5f8b] to-[#d7a15e]',
    eyebrow: 'Biểu tượng trung tâm',
    eyebrowEn: 'City Landmark',
    meta: 'Rất hợp để chụp ảnh',
    metaEn: 'Great for photos',
    accent: 'text-amber-50',
  },
  'Ẩm thực': {
    gradient: 'from-[#5b1f16] via-[#b85c38] to-[#f1c27d]',
    eyebrow: 'Ăn gì gần đây',
    eyebrowEn: 'Local Eats',
    meta: 'Dừng chân vừa đủ',
    metaEn: 'Quick stop',
    accent: 'text-orange-50',
  },
  'Mua sắm': {
    gradient: 'from-[#4a274f] via-[#81537f] to-[#dcc6e0]',
    eyebrow: 'Đời sống địa phương',
    eyebrowEn: 'Local Life',
    meta: 'Mua quà và khám phá',
    metaEn: 'Shop & explore',
    accent: 'text-fuchsia-50',
  },
  'Bảo tàng': {
    gradient: 'from-[#213640] via-[#4f7d73] to-[#d8ccb8]',
    eyebrow: 'Lớp trầm lịch sử',
    eyebrowEn: 'History & Culture',
    meta: 'Đậm chất chiều sâu',
    metaEn: 'Rich in depth',
    accent: 'text-teal-50',
  },
  'Công viên': {
    gradient: 'from-[#20412c] via-[#5b8c5a] to-[#d9e7bf]',
    eyebrow: 'Khoảng xanh thư giãn',
    eyebrowEn: 'Green Space',
    meta: 'Hợp để nghỉ chân',
    metaEn: 'Rest & relax',
    accent: 'text-lime-50',
  },
  'Khách sạn': {
    gradient: 'from-[#47311b] via-[#9e7a47] to-[#ead9b0]',
    eyebrow: 'Điểm lưu trú',
    eyebrowEn: 'Accommodation',
    meta: 'Tiện cho khách xa',
    metaEn: 'Ideal for visitors',
    accent: 'text-amber-50',
  },
};

interface LocationCardProps {
  location: TouristLocation;
  selectionIndex: number | null;
  isStart: boolean;
  isEnd: boolean;
  isDisabled: boolean;
  distanceKm?: number;
  onOpen: () => void;
  onToggle: () => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  location, selectionIndex, isStart, isEnd, isDisabled, distanceKm, onOpen, onToggle,
}) => {
  const { lang, t } = useLang();
  const [imgIdx, setImgIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imgScrollRef = useRef<HTMLDivElement>(null);

  const handleImageScroll = () => {
    if (!imgScrollRef.current) return;
    const { scrollLeft, clientWidth } = imgScrollRef.current;
    if (clientWidth === 0) return;
    const newIdx = Math.round(scrollLeft / clientWidth);
    if (newIdx !== imgIdx) setImgIdx(newIdx);
  };

  useEffect(() => {
    if (!imgScrollRef.current) return;
    const { scrollLeft, clientWidth } = imgScrollRef.current;
    if (Math.round(scrollLeft / clientWidth) !== imgIdx) {
      imgScrollRef.current.scrollTo({
        left: imgIdx * clientWidth,
        behavior: hovered ? 'smooth' : 'instant',
      });
    }
  }, [imgIdx, hovered]);

  const allImages: string[] = location.images?.length
    ? location.images
    : location.imageUrl
      ? [location.imageUrl]
      : [];
  const hasMultiple = allImages.length > 1;

  useEffect(() => {
    if (hovered && hasMultiple) {
      intervalRef.current = setInterval(() => {
        setImgIdx(i => (i + 1) % allImages.length);
      }, 1400);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [hovered, hasMultiple, allImages.length]);

  const theme = CATEGORY_THEME[location.category] ?? {
    gradient: 'from-slate-500 via-slate-600 to-slate-700',
    eyebrow: 'Điểm dừng',
    eyebrowEn: 'Stop',
    meta: 'Khám phá thêm',
    metaEn: 'Explore more',
    accent: 'text-white',
  };
  const isSelected = selectionIndex !== null;
  const shortLabel = location.label.replace(/\n/g, ' ');
  const displayName = t(location.fullName, location.fullNameEn);
  const previewText = lang === 'en'
    ? (location.shortIntroEn ?? location.descriptionEn ?? location.shortIntro ?? location.description)
    : (location.shortIntro ?? location.description);
  const displayCategory = lang === 'en' ? (CATEGORY_EN[location.category] ?? location.category) : location.category;
  const displayNeighborhood = t(location.neighborhood ?? '', location.neighborhoodEn);
  const compactAreaLabel = displayNeighborhood
    ? displayNeighborhood.split(',')[0]?.trim() ?? displayNeighborhood
    : '';
  const displayHighlights = lang === 'en' && location.highlightsEn?.length
    ? location.highlightsEn
    : location.highlights;
  const toggleLabel = isSelected ? t('Bỏ khỏi hành trình', 'Remove from trip') : t('Thêm vào hành trình', 'Add to trip');
  const chooseLabel = t('Nhấn để xem địa danh', 'Tap to explore');
  const visitBadge = location.visitDuration
    ? location.visitDuration.split('/')[0]?.trim() ?? location.visitDuration
    : '';
  const distanceBadgeColor =
    distanceKm === undefined ? null :
    distanceKm < 1 ? 'bg-emerald-500' :
    distanceKm < 3 ? 'bg-amber-500' :
    'bg-slate-500';
  const distanceLabel =
    distanceKm === undefined ? null :
    distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` :
    `${distanceKm.toFixed(1)} km`;
  const stateToneClass = isStart
    ? 'bg-blue-500 text-white'
    : isEnd
      ? 'bg-rose-500 text-white'
      : 'bg-emerald-500 text-white';
  const selectionBadge = isStart ? t('Điểm đầu', 'Start') : isEnd ? t('Điểm cuối', 'End') : t('Đã chọn', 'Selected');

  return (
    <div
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={t(`Xem chi tiết ${displayName}`, `View details for ${displayName}`)}
      className={`group relative w-full overflow-hidden rounded-[26px] border border-white/70 text-left transition-all duration-300 md:rounded-[28px] ${
        isSelected
          ? `ring-2 ring-offset-4 ring-offset-[#f4efe6] shadow-[0_22px_60px_rgba(15,23,42,0.18)] ${
              isStart ? 'ring-blue-500' : isEnd ? 'ring-rose-500' : 'ring-emerald-500'
            }`
          : 'shadow-[0_10px_35px_rgba(15,23,42,0.08)]'
      } hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.16)]`}
    >
      <div className={`relative aspect-[0.92] overflow-hidden bg-gradient-to-br md:aspect-[0.9] ${theme.gradient}`}>
        <div
          ref={imgScrollRef}
          onScroll={handleImageScroll}
          className="flex h-full w-full overflow-x-auto snap-x snap-mandatory no-scrollbar"
        >
          {allImages.map(src => (
            <img
              key={src}
              src={src}
              alt=""
              className="h-full w-full flex-none snap-center object-cover"
            />
          ))}
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.32),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0.02)_0%,rgba(15,23,42,0.72)_100%)]" />

        <div className="absolute left-3 top-3 md:left-4 md:top-4">
          <div className="rounded-full border border-white/20 bg-black/25 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/86 backdrop-blur-sm md:px-3 md:text-[10px]">
            {lang === 'en' ? theme.eyebrowEn : theme.eyebrow}
          </div>
        </div>

        {distanceBadgeColor && distanceLabel && (
          <div className={`absolute left-3 top-12 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow md:left-4 md:top-14 ${distanceBadgeColor}`}>
            <Navigation className="h-3 w-3" />
            {distanceLabel}
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setImgIdx(i => (i - 1 + allImages.length) % allImages.length);
              }}
              aria-label={t('Ảnh trước', 'Previous image')}
              title={t('Ảnh trước', 'Previous image')}
              className="absolute left-3 top-[58%] hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60 md:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setImgIdx(i => (i + 1) % allImages.length);
              }}
              aria-label={t('Ảnh tiếp theo', 'Next image')}
              title={t('Ảnh tiếp theo', 'Next image')}
              className="absolute right-3 top-[58%] hidden h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60 md:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1 md:bottom-[1.15rem]">
              {allImages.map((_, index) => (
                <span
                  key={`${location.id}-${index}`}
                  className={`h-1.5 rounded-full transition-all ${index === imgIdx ? 'w-5 bg-white' : 'w-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3.5 md:p-4">
          <div className={`mb-1.5 text-[10px] font-medium uppercase tracking-[0.24em] md:mb-2 md:text-[11px] md:tracking-[0.28em] ${theme.accent}`}>
            {displayCategory}
          </div>
          <div className="line-clamp-2 max-w-[13rem] text-[1.18rem] font-black leading-[0.98] tracking-tight text-white md:max-w-[17rem] md:text-[1.9rem]">
            {displayName}
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px] text-white/84 md:mt-3 md:text-[11px]">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/15 px-2.5 py-1 backdrop-blur-sm">
              <MapPinned className="h-3.5 w-3.5" />
              {shortLabel}
            </span>
            {visitBadge && (
              <span className="inline-flex rounded-full border border-white/15 bg-black/15 px-2.5 py-1 backdrop-blur-sm">
                {visitBadge}
              </span>
            )}
          </div>
        </div>

        <div className="absolute -right-3 bottom-10 text-[4rem] font-black leading-none text-white/12 md:-right-4 md:bottom-12 md:text-[4.5rem]">
          {location.id}
        </div>

        {isSelected && (
          <div
            className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black shadow-lg md:right-4 md:top-4 md:text-[11px] ${stateToneClass}`}
          >
            <span>{selectionIndex + 1}</span>
            <span className="hidden sm:inline">{selectionBadge}</span>
          </div>
        )}
        {isStart && (
          <div className="absolute bottom-3 right-3 rounded-full bg-blue-500 px-2 py-1 text-[10px] font-black text-white shadow-md md:bottom-4 md:right-4">
            XP
          </div>
        )}
        {isEnd && (
          <div className="absolute bottom-3 right-3 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-black text-white shadow-md md:bottom-4 md:right-4">
            KT
          </div>
        )}
      </div>

      <div className={`bg-white px-3.5 pb-3.5 pt-3 transition-colors md:px-4 md:pb-4 ${isSelected ? 'bg-white' : 'group-hover:bg-[#fffdfa]'}`}>
        <div className="space-y-2.5 md:space-y-3">
          <div className="flex items-start justify-between gap-3">
            <p className="line-clamp-2 text-[12px] leading-relaxed text-slate-600">
              {previewText}
            </p>
            {isSelected && (
              <CheckCircle2
                className={`mt-0.5 h-5 w-5 shrink-0 ${
                  isStart ? 'text-blue-500' : isEnd ? 'text-rose-500' : 'text-emerald-500'
                }`}
              />
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 text-[10px] md:gap-2 md:text-[11px]">
            {compactAreaLabel && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
                {compactAreaLabel}
              </span>
            )}
            {displayHighlights?.[0] && (
              <span className="rounded-full bg-[#f5efe6] px-2.5 py-1 font-medium text-[#7a5a2b]">
                {displayHighlights[0]}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3 md:mt-4">
          <div className="flex w-full items-center gap-2">
            {location.googleMapsUrl && (
              <a
                href={location.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-2 text-[10px] font-semibold text-blue-600 hover:bg-blue-100"
              >
                <MapIcon className="h-3 w-3" />
                Maps
              </a>
            )}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (!isDisabled || isSelected) onToggle();
              }}
              disabled={isDisabled && !isSelected}
              className={`inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-[11px] font-bold transition-all md:flex-none md:px-3 md:py-2 md:text-[10px] ${
                isSelected
                  ? stateToneClass
                  : isDisabled
                    ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              <span className="floating-mark truncate">{toggleLabel}</span>
            </button>
          </div>
        </div>
      </div>

      {!isSelected && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/0 opacity-0 transition-all duration-300 group-hover:bg-white/5 group-hover:opacity-100">
          <div className="rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-slate-700 shadow">
            {chooseLabel}
          </div>
        </div>
      )}
    </div>
  );
};
