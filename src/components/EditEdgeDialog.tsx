import React, { useState, useEffect } from 'react';
import { X, Trash2, Route } from 'lucide-react';
import { Route as RouteType, TouristLocation } from '../types';

interface EditEdgeDialogProps {
  open: boolean;
  route: RouteType | null;
  fromLocation: TouristLocation | null;
  toLocation: TouristLocation | null;
  onConfirm: (distanceKm: number) => void;
  onDelete: () => void;
  onCancel: () => void;
}

export const EditEdgeDialog: React.FC<EditEdgeDialogProps> = ({
  open, route, fromLocation, toLocation, onConfirm, onDelete, onCancel,
}) => {
  const [distance, setDistance] = useState('');

  useEffect(() => {
    if (route) setDistance(String(route.distanceKm));
  }, [route]);

  if (!open || !route || !fromLocation || !toLocation) return null;

  const val = parseFloat(distance);
  const valid = !isNaN(val) && val >= 0.1 && val <= 9999;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-80">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-emerald-600" />
            <span className="font-bold text-sm text-slate-800">Chỉnh Sửa Tuyến Đường</span>
          </div>
          <button onClick={onCancel} className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Route info */}
          <div className="bg-slate-50 rounded-xl px-3 py-2 text-center">
            <div className="text-xs text-slate-500">Tuyến đường</div>
            <div className="text-sm font-bold text-slate-800 mt-0.5">
              {fromLocation.fullName} ↔ {toLocation.fullName}
            </div>
          </div>

          {/* Distance input */}
          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Khoảng cách (km)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={0.1}
                max={9999}
                step={0.1}
                value={distance}
                onChange={e => setDistance(e.target.value)}
                className={`flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 ${
                  valid ? 'border-slate-200 focus:ring-emerald-200' : 'border-red-300 focus:ring-red-200'
                }`}
              />
              <span className="text-sm text-slate-500 shrink-0">km</span>
            </div>
            <input
              type="range" min={0.1} max={50} step={0.1}
              value={Math.min(50, val || 1)}
              onChange={e => setDistance(e.target.value)}
              className="w-full mt-1 accent-emerald-600"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={onDelete}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5" /> Xóa tuyến
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            onClick={() => valid && onConfirm(val)}
            disabled={!valid}
            className={`flex-1 py-2 rounded-xl text-sm font-bold text-white ${
              valid ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};
