import React from 'react';
import { Play, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AppMode, TouristLocation, AlgorithmResult } from '../types';

interface ControlPanelProps {
  appMode: AppMode;
  locations: TouristLocation[];
  startId: string;
  endId: string | null;
  onStartChange: (id: string) => void;
  onEndChange: (id: string) => void;
  onRun: () => void;
  onReset: () => void;
  result: AlgorithmResult | null;
}

const MODE_COLORS = {
  cycle: { btn: 'bg-indigo-600 hover:bg-indigo-700', text: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  path:  { btn: 'bg-rose-600 hover:bg-rose-700',   text: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200' },
  subset:{ btn: 'bg-amber-600 hover:bg-amber-700', text: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  appMode, locations, startId, endId, onStartChange, onEndChange, onRun, onReset, result,
}) => {
  const colors = MODE_COLORS[appMode];
  const canRun = startId !== '' && (appMode !== 'path' || (endId !== null && endId !== startId));

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cấu hình</div>

      {/* Start node */}
      <div>
        <label className="text-xs font-semibold text-slate-700 mb-1 block">
          <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1 align-middle" />
          Điểm xuất phát
        </label>
        <select
          value={startId}
          onChange={e => onStartChange(e.target.value)}
          className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">— Chọn điểm —</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.fullName}</option>
          ))}
        </select>
      </div>

      {/* End node (Bài 2 only) */}
      {appMode === 'path' && (
        <div>
          <label className="text-xs font-semibold text-slate-700 mb-1 block">
            <span className="inline-block w-3 h-3 rounded-full bg-rose-500 mr-1 align-middle" />
            Điểm kết thúc
          </label>
          <select
            value={endId ?? ''}
            onChange={e => onEndChange(e.target.value || null as any)}
            className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-300"
          >
            <option value="">— Chọn điểm —</option>
            {locations.filter(l => l.id !== startId).map(loc => (
              <option key={loc.id} value={loc.id}>{loc.fullName}</option>
            ))}
          </select>
        </div>
      )}

      {/* Hint for each mode */}
      <div className={`text-[10px] ${colors.text} ${colors.bg} border ${colors.border} rounded-lg px-2.5 py-1.5 leading-relaxed`}>
        {appMode === 'cycle' && 'Tìm chu trình ngắn nhất đi qua tất cả địa điểm và quay về.'}
        {appMode === 'path' && 'Tìm đường đi qua tất cả địa điểm từ điểm chọn đến điểm kết thúc.'}
        {appMode === 'subset' && 'Chọn địa điểm muốn đến bên dưới → tìm vòng kín ngắn nhất.'}
      </div>

      {/* Run button */}
      <button
        onClick={onRun}
        disabled={!canRun}
        className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-bold text-white transition-all ${
          canRun ? colors.btn + ' shadow-sm' : 'bg-slate-300 cursor-not-allowed'
        }`}
      >
        <Play className="w-4 h-4" />
        Tìm Lộ Trình
      </button>

      {/* Result summary */}
      {result && (
        <div className={`rounded-xl border p-3 ${result.found ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.found
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              : <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            }
            <span className={`text-xs font-bold ${result.found ? 'text-emerald-700' : 'text-red-600'}`}>
              {result.found ? 'Tìm thấy lộ trình!' : 'Không tìm được'}
            </span>
          </div>
          {result.found && (
            <>
              <div className="text-xl font-black text-emerald-700 text-center">
                {result.totalDistanceKm.toFixed(1)} km
              </div>
              {(result.shortestCycles.length > 1) && (
                <div className="text-[10px] text-emerald-600 text-center mt-0.5">
                  {result.shortestCycles.length} lộ trình cùng độ dài tối ưu
                </div>
              )}
              <div className="text-[10px] text-emerald-600 text-center">
                {result.steps.length} bước xét
              </div>
            </>
          )}
          <button
            onClick={onReset}
            className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-slate-500 hover:text-slate-700"
          >
            <RotateCcw className="w-3 h-3" /> Xóa kết quả
          </button>
        </div>
      )}
    </div>
  );
};
