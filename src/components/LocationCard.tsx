import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock3, Map as MapIcon, MapPinned, Navigation, Sparkles } from 'lucide-react';
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
  onClick: () => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({
  location, selectionIndex, isStart, isEnd, isDisabled, distanceKm, onClick,
}) => {
  const { lang, t } = useLang();
  const [imgIdx, setImgIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allImages: string[] = location.images?.length
    ? location.images
    : location.imageUrl
      ? [location.imageUrl]
      : [];
  const hasMultiple = allImages.length > 1;

  // Auto-play khi hover
  useEffect(() => {
    if (hovered && hasMultiple) {
      intervalRef.current = setInterval(() => {
        setImgIdx(i => (i + 1) % allImages.length);
      }, 1200);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
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
  const displayBestFor = t(location.bestFor ?? '', location.bestForEn);
  const displayHighlights = lang === 'en' && location.highlightsEn?.length
    ? location.highlightsEn
    : location.highlights;
  const addToTripLabel = t('Thêm vào hành trình', 'Add to trip');
  const chooseLabel = t('Chọn điểm dừng này', 'Select this stop');
  const visitLabel = t(
    location.visitDuration ?? 'Hợp cho một chặng đi bộ ngắn',
    location.visitDuration ?? 'Great for a short walk',
  );

  const distanceBadgeColor =
    distanceKm === undefined ? null :
    distanceKm < 1 ? 'bg-emerald-500' :
    distanceKm < 3 ? 'bg-amber-500' :
    'bg-slate-500';

  const distanceLabel =
    distanceKm === undefined ? null :
    distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` :
    `${distanceKm.toFixed(1)} km`;

  return (
    <div
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onClick={isDisabled ? undefined : onClick}
      onKeyDown={isDisabled ? undefined : (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`group relative w-full overflow-hidden rounded-[28px] border border-white/50 text-left transition-all duration-300 ${
        isDisabled ? 'scale-[0.98] cursor-not-allowed opacity-40' : 'cursor-pointer hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.16)]'
      } ${
        isSelected
          ? `ring-2 ring-offset-4 ring-offset-[#f4efe6] shadow-[0_22px_60px_rgba(15,23,42,0.18)] ${
              isStart ? 'ring-blue-500' : isEnd ? 'ring-rose-500' : 'ring-emerald-500'
            }`
          : 'shadow-[0_10px_35px_rgba(15,23,42,0.08)]'
      }`}
    >
      <div
        className={`relative aspect-[0.92] overflow-hidden bg-gradient-to-br ${theme.gradient}`}
      >
        {allImages.map((src, i) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${i === imgIdx ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.32),transparent_34%),linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.68)_100%)]" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-4">
          <div className="rounded-full border border-white/20 bg-white/12 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/86 backdrop-blur-sm">
            {lang === 'en' ? theme.eyebrowEn : theme.eyebrow}
          </div>
          <div className="rounded-full border border-white/20 bg-black/10 px-3 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-sm">
            {lang === 'en' ? theme.metaEn : theme.meta}
          </div>
        </div>

        {/* Distance badge */}
        {distanceBadgeColor && distanceLabel && (
          <div className={`absolute left-4 top-14 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold text-white shadow ${distanceBadgeColor}`}>
            <Navigation className="h-3 w-3" />
            {distanceLabel}
          </div>
        )}

        {/* Image carousel controls */}
        {hasMultiple && (
          <>
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setImgIdx(i => (i - 1 + allImages.length) % allImages.length); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
            >
              <ChevronLeft className="h-4 w-4" />
            </div>
            <div
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setImgIdx(i => (i + 1) % allImages.length); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/60"
            >
              <ChevronRight className="h-4 w-4" />
            </div>
            {/* Dots */}
            <div className="absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-1">
              {allImages.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${i === imgIdx ? 'bg-white' : 'bg-white/40'}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute inset-x-0 bottom-0 p-4">
          <div className={`mb-2 text-[11px] font-medium uppercase tracking-[0.28em] ${theme.accent}`}>
            {displayCategory}
          </div>
          <div className="max-w-[11rem] text-[1.7rem] font-black leading-[0.95] tracking-tight text-white">
            {displayName}
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/84">
            <MapPinned className="h-3.5 w-3.5" />
            <span>{shortLabel}</span>
          </div>
        </div>

        <div className="absolute -right-4 bottom-12 text-[4.5rem] font-black leading-none text-white/12">
          {location.id}
        </div>

        {isSelected && (
          <div
            className={`absolute left-4 top-16 flex h-9 w-9 items-center justify-center rounded-full text-sm font-black text-white shadow-lg ${
              isStart ? 'bg-blue-500' : isEnd ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
          >
            {selectionIndex! + 1}
          </div>
        )}
        {isStart && (
          <div className="absolute bottom-4 right-4 rounded-full bg-blue-500 px-2 py-1 text-[10px] font-black text-white shadow-md">
            XP
          </div>
        )}
        {isEnd && (
          <div className="absolute bottom-4 right-4 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-black text-white shadow-md">
            KT
          </div>
        )}
      </div>

        <div className={`bg-white px-4 pb-4 pt-3 transition-colors ${isSelected ? 'bg-white' : 'group-hover:bg-[#fffdfa]'}`}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] leading-relaxed text-slate-600">
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

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {visitLabel}
          </span>
          <div className="flex items-center gap-2">
            {location.googleMapsUrl && (
              <a
                href={location.googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-100"
              >
                <MapIcon className="h-3 w-3" />
                Maps
              </a>
            )}
            <span className="floating-mark inline-flex items-center gap-1 font-semibold text-slate-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              {addToTripLabel}
            </span>
          </div>
        </div>
        {(displayNeighborhood || displayBestFor) && (
          <div className="mt-2 space-y-1 text-[11px] text-slate-500">
            {displayNeighborhood && (
              <div>{t('Khu vực', 'Area')}: <span className="font-medium text-slate-700">{displayNeighborhood}</span></div>
            )}
            {displayBestFor && (
              <div>{t('Phù hợp', 'Best for')}: <span className="font-medium text-slate-700">{displayBestFor}</span></div>
            )}
          </div>
        )}
        {displayHighlights && displayHighlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {displayHighlights.slice(0, 3).map(item => (
              <span key={item} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600">
                {item}
              </span>
            ))}
          </div>
        )}
      </div>

      {!isSelected && !isDisabled && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/0 opacity-0 transition-all duration-300 group-hover:bg-white/5 group-hover:opacity-100">
          <div className="rounded-full bg-white/92 px-3 py-1 text-xs font-bold text-slate-700 shadow">
            {chooseLabel}
          </div>
        </div>
      )}
    </div>
  );
};
