import React, { useState } from 'react';
import { X, MapPin } from 'lucide-react';
import { LocationCategory, TouristLocation } from '../types';

const CATEGORIES: LocationCategory[] = [
  'Di sản học đường', 'Danh lam thắng cảnh', 'Ẩm thực', 'Mua sắm', 'Bảo tàng', 'Công viên', 'Khách sạn',
];

interface AddLocationDialogProps {
  open: boolean;
  x: number;
  y: number;
  existingIds: string[];
  onConfirm: (loc: Omit<TouristLocation, 'x' | 'y'>) => void;
  onCancel: () => void;
}

export const AddLocationDialog: React.FC<AddLocationDialogProps> = ({
  open, existingIds, onConfirm, onCancel,
}) => {
  const [id, setId] = useState('');
  const [fullName, setFullName] = useState('');
  const [category, setCategory] = useState<LocationCategory>('Danh lam thắng cảnh');
  const [description, setDescription] = useState('');

  if (!open) return null;

  const idError = id && existingIds.includes(id.toUpperCase()) ? 'Mã này đã tồn tại' : '';
  const canSubmit = id.trim() && fullName.trim() && !idError;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onConfirm({
      id: id.toUpperCase().trim(),
      label: id.toUpperCase().trim().substring(0, 4),
      fullName: fullName.trim(),
      category,
      description: description.trim(),
    });
    setId(''); setFullName(''); setDescription('');
    setCategory('Danh lam thắng cảnh');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-96 max-w-[calc(100vw-2rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="font-bold text-slate-800">Thêm Địa Điểm Mới</span>
          </div>
          <button onClick={onCancel} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex gap-3">
            <div className="w-24">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Mã viết tắt *</label>
              <input
                value={id}
                onChange={e => setId(e.target.value.toUpperCase().slice(0, 4))}
                placeholder="VD: NT"
                className={`w-full border rounded-lg px-2.5 py-1.5 text-sm font-mono uppercase focus:outline-none focus:ring-2 ${
                  idError ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-emerald-200'
                }`}
              />
              {idError && <div className="text-[10px] text-red-500 mt-0.5">{idError}</div>}
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Tên đầy đủ *</label>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Nhà Thờ Đức Bà"
                className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Danh mục</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as LocationCategory)}
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600 mb-1 block">Mô tả (tùy chọn)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              placeholder="Mô tả ngắn về địa điểm..."
              className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`flex-1 py-2 rounded-xl text-sm font-bold text-white transition-colors ${
              canSubmit ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-300 cursor-not-allowed'
            }`}
          >
            Thêm Địa Điểm
          </button>
        </div>
      </div>
    </div>
  );
};
