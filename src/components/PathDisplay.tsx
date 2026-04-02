import React from 'react';
import { ArrowRight, MapPinned, RotateCcw } from 'lucide-react';
import { TouristLocation, AppMode } from '../types';

interface PathDisplayProps {
  path: string[];
  totalKm: number;
  locations: TouristLocation[];
  appMode: AppMode;
  allCount: number;
}

export const PathDisplay: React.FC<PathDisplayProps> = ({ path, totalKm, locations, appMode, allCount }) => {
  if (path.length === 0) return null;

  const getName = (id: string) => locations.find(l => l.id === id)?.fullName ?? id;
  const getShort = (id: string) => {
    const label = locations.find(l => l.id === id)?.label ?? id;
    return label.split('\n')[0];
  };

  // Unique nodes in order (exclude the closing return-to-start duplicate)
  // For cycle: path = [A, B, C, D, E, A] → unique visited = [A, B, C, D, E]
  const isCycle = appMode === 'cycle';
  const uniqueVisited = isCycle && path.length > 1 && path[0] === path[path.length - 1]
    ? path.slice(0, -1)
    : path;

  const color = appMode === 'cycle' ? 'emerald' : appMode === 'path' ? 'rose' : 'amber';
  const colorMap = {
    emerald: {
      shell: 'border-emerald-200 bg-[linear-gradient(180deg,#f3fbf7_0%,#edf8f2_100%)]',
      text: 'text-emerald-800',
      subtext: 'text-emerald-700',
      pill: 'bg-emerald-600 text-white',
      pillSoft: 'bg-emerald-100 text-emerald-800',
      arrow: 'text-emerald-500',
      number: 'bg-emerald-800 text-white',
    },
    rose: {
      shell: 'border-rose-200 bg-[linear-gradient(180deg,#fff1f4_0%,#ffe7ee_100%)]',
      text: 'text-rose-800',
      subtext: 'text-rose-700',
      pill: 'bg-rose-600 text-white',
      pillSoft: 'bg-rose-100 text-rose-800',
      arrow: 'text-rose-500',
      number: 'bg-rose-800 text-white',
    },
    amber: {
      shell: 'border-amber-200 bg-[linear-gradient(180deg,#fff8ea_0%,#ffefd5_100%)]',
      text: 'text-amber-800',
      subtext: 'text-amber-700',
      pill: 'bg-amber-600 text-white',
      pillSoft: 'bg-amber-100 text-amber-800',
      arrow: 'text-amber-500',
      number: 'bg-amber-800 text-white',
    },
  };
  const c = colorMap[color];
  const title = appMode === 'subset' ? 'Đường đi ngắn nhất' : isCycle ? 'Chu trình tối ưu' : 'Đường đi tối ưu';

  return (
    <div className={`rounded-[22px] border p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] ${c.shell}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className={`inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] ${c.subtext}`}>
            <MapPinned className="h-3.5 w-3.5" />
            {title}
          </div>
          <div className="mt-1 text-sm font-semibold text-slate-600">{uniqueVisited.length} điểm</div>
        </div>
        <div className="text-right">
          <div className={`text-[11px] font-bold uppercase tracking-[0.18em] ${c.subtext}`}>Tổng quãng đường</div>
          <div className={`mt-1 text-3xl font-black leading-none ${c.text}`}>{totalKm.toFixed(1)} km</div>
        </div>
      </div>

      <div className="mt-4 rounded-[20px] border border-white/80 bg-white/80 p-3">
        <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Thứ tự lộ trình</div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {uniqueVisited.map((nodeId, idx) => {
          const isLastUnique = idx === uniqueVisited.length - 1;

          return (
            <React.Fragment key={`${nodeId}-${idx}`}>
              <div
                title={getName(nodeId)}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 shadow-[0_6px_14px_rgba(15,23,42,0.06)] ${c.pill}`}
              >
                <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[10px] font-black ${c.number}`}>
                  {idx + 1}
                </span>
                <span className="text-sm font-bold leading-none">{getShort(nodeId)}</span>
              </div>
              {idx < uniqueVisited.length - 1 && (
                <ArrowRight className={`h-4 w-4 shrink-0 ${c.arrow}`} />
              )}
              {isCycle && isLastUnique && (
                <>
                  <ArrowRight className={`h-4 w-4 shrink-0 ${c.arrow}`} />
                  <div
                    title={getName(uniqueVisited[0])}
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold shadow-[0_6px_14px_rgba(15,23,42,0.06)] ${c.pillSoft}`}
                  >
                    <span className="text-base leading-none">↩</span>
                    <span>{getShort(uniqueVisited[0])}</span>
                  </div>
                </>
              )}
            </React.Fragment>
          );
        })}
      </div>
      </div>

      {appMode === 'cycle' && allCount > 1 && (
        <div className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${c.pillSoft}`}>
          <RotateCcw className="h-3.5 w-3.5" />
          {allCount} phương án tối ưu cùng độ dài
        </div>
      )}
    </div>
  );
};
