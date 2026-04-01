import React, { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

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
    <div className="bg-white border-t border-slate-200 px-4 py-3 flex items-center gap-3">
      {/* Play/Pause */}
      <button
        onClick={onPlayToggle}
        className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors shrink-0"
      >
        {isPlaying ? <Pause className="w-4 h-4 text-slate-700" /> : <Play className="w-4 h-4 text-slate-700" />}
      </button>

      {/* Prev */}
      <button
        onClick={onPrev}
        disabled={currentIdx === 0}
        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center shrink-0"
      >
        <ChevronLeft className="w-4 h-4 text-slate-700" />
      </button>

      {/* Slider */}
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalSteps - 1)}
          value={currentIdx}
          onChange={e => onJump(Number(e.target.value))}
          className="flex-1 accent-emerald-600"
        />
        <span className="text-xs text-slate-500 font-mono shrink-0 w-16 text-right">
          {currentIdx + 1} / {totalSteps}
        </span>
      </div>

      {/* Next */}
      <button
        onClick={onNext}
        disabled={currentIdx >= totalSteps - 1}
        className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 disabled:opacity-30 flex items-center justify-center shrink-0"
      >
        <ChevronRight className="w-4 h-4 text-slate-700" />
      </button>

      {/* Speed */}
      <div className="flex gap-0.5 shrink-0">
        {SPEEDS.map(s => (
          <button
            key={s.ms}
            onClick={() => onSpeedChange(s.ms)}
            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold transition-colors ${
              playSpeedMs === s.ms ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
};
