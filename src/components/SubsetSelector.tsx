import React from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { TouristLocation } from '../types';

interface SubsetSelectorProps {
  locations: TouristLocation[];
  selectedSubset: string[];
  startId: string;
  onSubsetChange: (ids: string[]) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Danh lam thắng cảnh': 'bg-sky-100 text-sky-700',
  'Ẩm thực': 'bg-orange-100 text-orange-700',
  'Mua sắm': 'bg-purple-100 text-purple-700',
  'Bảo tàng': 'bg-teal-100 text-teal-700',
  'Công viên': 'bg-green-100 text-green-700',
  'Khách sạn': 'bg-amber-100 text-amber-700',
};

export const SubsetSelector: React.FC<SubsetSelectorProps> = ({
  locations, selectedSubset, startId, onSubsetChange,
}) => {
  const toggle = (id: string) => {
    if (id === startId) return; // can't deselect start
    if (selectedSubset.includes(id)) {
      onSubsetChange(selectedSubset.filter(x => x !== id));
    } else {
      onSubsetChange([...selectedSubset, id]);
    }
  };

  const selectAll = () => onSubsetChange(locations.map(l => l.id));
  const clearAll = () => onSubsetChange(startId ? [startId] : []);

  return (
    <div className="border-t border-slate-100 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-amber-700">
          Điểm muốn đến ({selectedSubset.length}/{locations.length})
        </span>
        <div className="flex gap-1">
          <button onClick={selectAll} className="text-[10px] text-slate-500 hover:text-amber-600 font-medium">Tất cả</button>
          <span className="text-slate-300">|</span>
          <button onClick={clearAll} className="text-[10px] text-slate-500 hover:text-red-500 font-medium">Bỏ chọn</button>
        </div>
      </div>
      <div className="space-y-0.5 max-h-64 overflow-y-auto">
        {locations.map(loc => {
          const checked = selectedSubset.includes(loc.id);
          const isStart = loc.id === startId;
          return (
            <button
              key={loc.id}
              onClick={() => toggle(loc.id)}
              disabled={isStart}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                checked ? 'bg-amber-50 border border-amber-200' : 'hover:bg-slate-50 border border-transparent'
              } ${isStart ? 'opacity-70 cursor-default' : 'cursor-pointer'}`}
            >
              {checked
                ? <CheckSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                : <Square className="w-3.5 h-3.5 text-slate-300 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-700 truncate">{loc.fullName}</div>
                <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${CATEGORY_COLORS[loc.category]}`}>
                  {loc.category}
                </span>
              </div>
              {isStart && <span className="text-[9px] text-blue-500 font-bold shrink-0">XP</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};
