import React from 'react';
import { ArrowRight, RotateCcw, ShieldCheck } from 'lucide-react';
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
  const isCycle = appMode === 'cycle' || appMode === 'subset';
  const uniqueVisited = isCycle && path.length > 1 && path[0] === path[path.length - 1]
    ? path.slice(0, -1)
    : path;

  const color = appMode === 'cycle' ? 'emerald' : appMode === 'path' ? 'rose' : 'amber';
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', chip: 'bg-emerald-600', chipLight: 'bg-emerald-100 text-emerald-800', arrow: 'text-emerald-400', ring: 'ring-emerald-300' },
    rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    chip: 'bg-rose-600',    chipLight: 'bg-rose-100 text-rose-800',    arrow: 'text-rose-400',    ring: 'ring-rose-300' },
    amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   chip: 'bg-amber-600',   chipLight: 'bg-amber-100 text-amber-800',   arrow: 'text-amber-400',   ring: 'ring-amber-300' },
  };
  const c = colorMap[color];

  return (
    <div className={`${c.bg} border ${c.border} rounded-xl p-3 space-y-2`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${c.text}`}>
          {isCycle ? '🔄 Chu trình tối ưu' : '🗺️ Đường đi tối ưu'}
        </span>
        <span className={`text-lg font-black ${c.text}`}>{totalKm.toFixed(1)} km</span>
      </div>

      {/* ⭐ Ràng buộc: mỗi điểm 1 lần */}
      <div className="flex items-center gap-1.5 bg-white/70 rounded-lg px-2 py-1">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="text-[10px] font-bold text-emerald-700">
          {uniqueVisited.length} điểm — mỗi điểm thăm đúng 1 lần
        </span>
        {isCycle && (
          <span className="text-[10px] text-slate-500 ml-auto">↩ cuối cùng chỉ khép vòng về điểm đầu</span>
        )}
      </div>

      {/* Path chips with visit order numbers */}
      <div className="flex flex-wrap items-center gap-1">
        {uniqueVisited.map((nodeId, idx) => {
          const isLastUnique = idx === uniqueVisited.length - 1;

          return (
            <React.Fragment key={`${nodeId}-${idx}`}>
              <div
                title={getName(nodeId)}
                className={`flex items-center gap-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md cursor-default ${c.chip}`}
              >
                <span className="opacity-70 text-[9px]">{idx + 1}.</span>
                <span>{getShort(nodeId)}</span>
              </div>
              {idx < uniqueVisited.length - 1 && (
                <ArrowRight className={`w-3 h-3 ${c.arrow} shrink-0`} />
              )}
              {isCycle && isLastUnique && (
                <>
                  <ArrowRight className={`w-3 h-3 ${c.arrow} shrink-0`} />
                  <div
                    title={getName(uniqueVisited[0])}
                    className="flex items-center gap-1 rounded-md bg-slate-400 px-1.5 py-0.5 text-[10px] font-bold text-white ring-1 ring-slate-300"
                  >
                    <span>↩</span>
                    <span>{getShort(uniqueVisited[0])}</span>
                  </div>
                </>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {allCount > 1 && (
        <div className={`text-[10px] ${c.text} flex items-center gap-1`}>
          <RotateCcw className="w-3 h-3" />
          {allCount} lộ trình cùng độ dài — luân phiên hiển thị
        </div>
      )}
    </div>
  );
};
