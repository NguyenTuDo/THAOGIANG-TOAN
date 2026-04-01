import React from 'react';
import { MapPin, Edit3, Eye } from 'lucide-react';
import { AppMode, UIMode } from '../types';

interface HeaderProps {
  appMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  uiMode: UIMode;
  onUIModeChange: (mode: UIMode) => void;
}

const MODES: { id: AppMode; label: string; short: string; color: string; activeColor: string; desc: string }[] = [
  {
    id: 'cycle',
    label: 'Bài 1 — Chu Trình Hamilton',
    short: 'Bài 1',
    color: 'text-indigo-600',
    activeColor: 'bg-indigo-600 text-white',
    desc: 'Đi đủ tất cả điểm, quay về xuất phát — tìm vòng ngắn nhất',
  },
  {
    id: 'path',
    label: 'Bài 2 — Đường Đi Hamilton',
    short: 'Bài 2',
    color: 'text-rose-600',
    activeColor: 'bg-rose-600 text-white',
    desc: 'Từ A đến B, đi qua tất cả điểm — tìm đường ngắn nhất',
  },
  {
    id: 'subset',
    label: 'Bài 3 — Lộ Trình Tùy Chọn',
    short: 'Bài 3',
    color: 'text-amber-600',
    activeColor: 'bg-amber-600 text-white',
    desc: 'Chọn điểm muốn đến — tìm vòng kín ngắn nhất trên tập đó',
  },
];

export const Header: React.FC<HeaderProps> = ({ appMode, onModeChange, uiMode, onUIModeChange }) => {
  const current = MODES.find(m => m.id === appMode)!;

  return (
    <header className="bg-white border-b border-slate-200 shadow-sm z-10 relative">
      <div className="flex items-center h-14 px-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div className="leading-tight hidden sm:block">
            <div className="text-sm font-black text-slate-800">Lộ Trình TP.HCM</div>
            <div className="text-[10px] text-slate-500 font-medium">Bài Toán Đường Đi Ngắn Nhất</div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 mx-auto bg-slate-100 rounded-xl p-1">
          {MODES.map(mode => (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              title={mode.desc}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap ${
                appMode === mode.id
                  ? mode.activeColor + ' shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-white'
              }`}
            >
              {mode.short}
            </button>
          ))}
        </div>

        {/* Edit/View toggle */}
        <button
          onClick={() => onUIModeChange(uiMode === 'view' ? 'edit' : 'view')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 shrink-0 ${
            uiMode === 'edit'
              ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {uiMode === 'edit' ? (
            <><Edit3 className="w-3.5 h-3.5" /> Chỉnh sửa</>
          ) : (
            <><Eye className="w-3.5 h-3.5" /> Xem</>
          )}
        </button>
      </div>

      {/* Mode description bar */}
      <div className={`px-4 py-1 text-xs font-medium border-t ${
        appMode === 'cycle' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
        appMode === 'path'  ? 'bg-rose-50 text-rose-700 border-rose-100' :
                              'bg-amber-50 text-amber-700 border-amber-100'
      }`}>
        <strong>{current.label}</strong> — {current.desc}
      </div>
    </header>
  );
};
