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
  compact?: boolean;
  layout?: 'panel' | 'toolbar';
}

export const StepNavigator: React.FC<StepNavigatorProps> = ({
  totalSteps, currentIdx, onPrev, onNext, onJump,
  isPlaying, onPlayToggle, playSpeedMs, onSpeedChange, compact = false, layout = 'panel',
}) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        onNext();
      }, playSpeedMs);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, playSpeedMs, onNext]);

  if (totalSteps === 0) return null;

  const SPEEDS = [
    { label: '0.5×', ms: 2000 },
    { label: '1×', ms: 1000 },
    { label: '2×', ms: 500 },
    { label: '4×', ms: 250 },
  ];
  const isToolbar = layout === 'toolbar';

  const shellClass = isToolbar
    ? 'w-full'
    : compact
    ? 'border-t border-slate-100 bg-slate-50 px-4 py-3'
    : 'border-t border-slate-100 bg-slate-50 px-4 py-4';
  const controlsClass = isToolbar
    ? 'flex flex-wrap items-center gap-2 rounded-[20px] border border-slate-200 bg-white px-3 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)] lg:flex-nowrap'
    : compact
    ? 'flex flex-wrap items-center gap-2 rounded-[20px] border border-slate-200 bg-white px-3 py-2.5 shadow-[0_10px_20px_rgba(15,23,42,0.05)] sm:flex-nowrap'
    : 'flex flex-wrap items-center gap-3 rounded-[22px] border border-slate-200 bg-white px-3 py-3 shadow-[0_12px_26px_rgba(15,23,42,0.06)] sm:flex-nowrap';
  const ghostButtonClass = compact || isToolbar
    ? 'flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600'
    : 'flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600';
  const sideButtonClass = compact || isToolbar
    ? 'flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30'
    : 'flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600 disabled:opacity-30';
  const playButtonClass = compact || isToolbar
    ? 'flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-transform hover:scale-105'
    : 'flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 transition-transform hover:scale-105';
  const speedButtonClass = (active: boolean) => `rounded-lg px-2.5 ${(compact || isToolbar) ? 'py-1 text-[10px]' : 'py-1.5 text-[11px]'} font-bold transition-colors ${
    active ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
  }`;

  return (
    <div className={shellClass}>
      {!isToolbar ? (
        <div className={`${compact ? 'mb-2' : 'mb-3'} flex items-center justify-between gap-3`}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Bộ điều khiển mô phỏng</div>
            <div className={`${compact ? 'mt-0.5 text-xs' : 'mt-1 text-sm'} font-semibold text-slate-700`}>
              Bước {currentIdx + 1} / {totalSteps}
            </div>
          </div>
          <div className={`rounded-full bg-white px-3 ${compact ? 'py-0.5 text-[10px]' : 'py-1 text-[11px]'} font-bold text-indigo-600 shadow-sm shadow-indigo-100`}>
            Dijkstra Player
          </div>
        </div>
      ) : null}

      <div className={controlsClass}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onJump(0)}
            title="Về bước đầu tiên"
            aria-label="Về bước đầu tiên"
            className={ghostButtonClass}
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            onClick={onPrev}
            disabled={currentIdx === 0}
            title="Lùi về bước trước"
            aria-label="Lùi về bước trước"
            className={sideButtonClass}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            onClick={onPlayToggle}
            title={isPlaying ? 'Tạm dừng phát từng bước' : 'Phát từng bước'}
            aria-label={isPlaying ? 'Tạm dừng phát từng bước' : 'Phát từng bước'}
            className={playButtonClass}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
          </button>

          <button
            onClick={onNext}
            disabled={currentIdx >= totalSteps - 1}
            title="Tiến tới bước tiếp theo"
            aria-label="Tiến tới bước tiếp theo"
            className={sideButtonClass}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="order-3 flex w-full flex-col gap-2 lg:order-none lg:flex-1">
          <input
            type="range"
            min={0}
            max={Math.max(0, totalSteps - 1)}
            value={currentIdx}
            onChange={event => onJump(Number(event.target.value))}
            title="Thanh chọn bước thuật toán"
            aria-label="Thanh chọn bước thuật toán"
            className="w-full accent-indigo-600"
          />
          <div className={`flex items-center justify-between ${(compact || isToolbar) ? 'text-[10px]' : 'text-[11px]'} text-slate-400`}>
            <span>Khởi tạo</span>
            <span>Đang mô phỏng</span>
            <span>Kết luận</span>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-1 lg:ml-0 lg:flex-nowrap">
          {SPEEDS.map(speed => (
            <button
              key={speed.ms}
              onClick={() => onSpeedChange(speed.ms)}
              title={`Đặt tốc độ ${speed.label}`}
              aria-label={`Đặt tốc độ ${speed.label}`}
              className={speedButtonClass(playSpeedMs === speed.ms)}
            >
              {speed.label}
            </button>
          ))}
          {isToolbar ? (
            <div className="ml-1 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-bold text-indigo-600 shadow-sm shadow-indigo-100">
              Dijkstra Player
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
