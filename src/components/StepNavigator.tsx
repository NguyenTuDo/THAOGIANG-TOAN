import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';

interface StepNavigatorProps {
  totalSteps: number;
  currentIdx: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (idx: number) => void;
  isPlaying: boolean;
  onPlayToggle: () => void;
  playSpeedMs: number;
  onSpeedChange: (ms: number) => void;
}

export const StepNavigator: React.FC<StepNavigatorProps> = ({
  totalSteps, currentIdx, onPrev, onNext, onJump,
  isPlaying, onPlayToggle, playSpeedMs, onSpeedChange,
}) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        onNext();
      }, playSpeedMs);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, playSpeedMs, onNext]);

  if (totalSteps === 0) return null;

  const SPEEDS = [
    { label: '0.5×', ms: 2000 },
    { label: '1×',   ms: 1000 },
    { label: '2×',   ms: 500 },
    { label: '4×',   ms: 250 },
  ];

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Bộ điều khiển mô phỏng</div>
          <div className="mt-1 text-sm font-semibold text-slate-700">Bước {currentIdx + 1} / {totalSteps}</div>
        </div>
        <div className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-indigo-600 shadow-sm shadow-indigo-100">
          Dijkstra Player
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-3 py-3 shadow-[0_12px_26px_rgba(15,23,42,0.06)] sm:flex-nowrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onJump(0)}
            title="Về bước đầu tiên"
            aria-label="Về bước đầu tiên"
            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={onPrev}
            disabled={currentIdx === 0}
            title="Lùi về bước trước"
            aria-label="Lùi về bước trước"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={onPlayToggle}
            title={isPlaying ? 'Tạm dừng phát từng bước' : 'Phát từng bước'}
            aria-label={isPlaying ? 'Tạm dừng phát từng bước' : 'Phát từng bước'}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-transform hover:scale-105"
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
          </button>

          <button
            onClick={onNext}
            disabled={currentIdx >= totalSteps - 1}
            title="Tiến tới bước tiếp theo"
            aria-label="Tiến tới bước tiếp theo"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="order-3 flex w-full flex-col gap-2 sm:order-none sm:flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentIdx}
            onChange={e => onJump(Number(e.target.value))}
            title="Thanh chọn bước thuật toán"
            aria-label="Thanh chọn bước thuật toán"
            className="w-full accent-indigo-600"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Khởi tạo</span>
            <span>Đang mô phỏng</span>
            <span>Kết luận</span>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap gap-1 shrink-0 sm:ml-0 sm:flex-nowrap">
          {SPEEDS.map(s => (
            <button
              key={s.ms}
              onClick={() => onSpeedChange(s.ms)}
              title={`Đặt tốc độ ${s.label}`}
              aria-label={`Đặt tốc độ ${s.label}`}
              className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                playSpeedMs === s.ms ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
