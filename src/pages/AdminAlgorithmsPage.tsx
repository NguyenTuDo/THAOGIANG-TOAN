import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { AdminAlgorithmWorkbench } from '../components/AdminAlgorithmWorkbench';
import { useAuth } from '../contexts/AuthContext';
import { INITIAL_GRAPH_DATA, PRESET_SELECTIONS } from '../data/hcmcLocations';
import { loadGraphData, loadPresets } from '../lib/dataStore';
import { GraphData, PresetSelectionMap } from '../types';

export function AdminAlgorithmsPage() {
  const { profile, loading } = useAuth();
  const [graphData, setGraphData] = useState<GraphData>(INITIAL_GRAPH_DATA);
  const [presets, setPresets] = useState<PresetSelectionMap>(PRESET_SELECTIONS);
  const [loadingData, setLoadingData] = useState(true);

  const refreshData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [graph, nextPresets] = await Promise.all([loadGraphData(), loadPresets()]);
      setGraphData(graph);
      setPresets(nextPresets);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  return (
    <div className="min-h-screen bg-[#efe7da] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Admin algorithm route</div>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Kiểm tra 3 bài toán trước khi trình bày</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Route này tách riêng phần chạy thử lời giải để thầy kiểm soát dữ liệu hiện tại mà không làm rối trang quản trị nội dung.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                <ArrowLeft className="h-4 w-4" /> Về quản trị dữ liệu
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Xem trang cẩm nang
              </Link>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="rounded-[28px] border border-[#ded5c7] bg-white/90 p-6 text-sm text-slate-600">
            Đang kiểm tra quyền admin...
          </div>
        ) : profile.role !== 'admin' ? (
          <div className="rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
            Route này chỉ dành cho admin. Vui lòng đăng nhập tại <strong>/admin</strong> trước.
          </div>
        ) : loadingData ? (
          <div className="rounded-[28px] border border-[#ded5c7] bg-white/90 p-6 text-sm text-slate-600">
            Đang tải dữ liệu thuật toán...
          </div>
        ) : (
          <>
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              <span className="inline-flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Đang dùng dữ liệu hiện có của hệ thống để chạy thử 3 bài toán.</span>
            </div>
            <AdminAlgorithmWorkbench graphData={graphData} presets={presets} />
          </>
        )}
      </div>
    </div>
  );
}
