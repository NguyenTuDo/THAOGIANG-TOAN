import React from 'react';
import { AppMode } from '../types';

interface GraphLegendProps {
  appMode: AppMode;
}

export const GraphLegend: React.FC<GraphLegendProps> = ({ appMode }) => (
  <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2 text-[10px] space-y-1">
    <div className="font-bold text-slate-600 mb-1">Chú thích</div>
    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" /> Điểm xuất phát</div>
    {appMode !== 'cycle' && (
      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" /> Điểm kết thúc</div>
    )}
    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" /> Trong lộ trình</div>
    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" /> Đang xét</div>
    <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-400 shrink-0" /> Quay lui</div>
  </div>
);
