import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { AdminDashboard } from '../components/AdminDashboard';
import { useAuth } from '../contexts/AuthContext';
import { INITIAL_GRAPH_DATA, PRESET_SELECTIONS } from '../data/hcmcLocations';
import {
  deleteLocation,
  deleteRoute,
  loadGraphData,
  loadPresets,
  saveLocation,
  saveLocationOrder,
  savePreset,
  saveRoute,
} from '../lib/dataStore';
import { AppMode, GraphData, PresetSelection, PresetSelectionMap } from '../types';

export function AdminPage() {
  const { profile, loading, signIn, signOut, isBackendEnabled, switchDemoRole } = useAuth();
  const [graphData, setGraphData] = useState<GraphData>(INITIAL_GRAPH_DATA);
  const [presets, setPresets] = useState<PresetSelectionMap>(PRESET_SELECTIONS);
  const [loadingData, setLoadingData] = useState(true);
  // Track whether data has ever loaded so subsequent refreshes don't unmount AdminDashboard
  const [everLoaded, setEverLoaded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const refreshData = useCallback(async () => {
    if (!everLoaded) setLoadingData(true);
    try {
      const [graph, nextPresets] = await Promise.all([loadGraphData(), loadPresets()]);
      setGraphData(graph);
      setPresets(nextPresets);
    } finally {
      setLoadingData(false);
      setEverLoaded(true);
    }
  }, [everLoaded]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  const handleSaveLocation = useCallback(async (location: GraphData['locations'][number]) => {
    await saveLocation(location);
    await refreshData();
  }, [refreshData]);

  const handleDeleteLocation = useCallback(async (locationId: string) => {
    await deleteLocation(locationId);
    await refreshData();
  }, [refreshData]);

  const handleSaveLocationOrder = useCallback(async (locationIds: string[]) => {
    setGraphData(current => ({
      ...current,
      locations: locationIds
        .map(id => current.locations.find(location => location.id === id))
        .filter((location): location is GraphData['locations'][number] => Boolean(location))
        .map((location, index) => ({
          ...location,
          displayOrder: index,
        })),
    }));
    await saveLocationOrder(locationIds);
  }, []);

  const handleSaveRoute = useCallback(async (route: GraphData['routes'][number]) => {
    await saveRoute(route);
    await refreshData();
  }, [refreshData]);

  const handleDeleteRoute = useCallback(async (routeId: string) => {
    await deleteRoute(routeId);
    await refreshData();
  }, [refreshData]);

  const handleSavePreset = useCallback(async (mode: AppMode, presetConfig: Pick<PresetSelection, 'ids' | 'startId' | 'endId'>) => {
    const orderedIds = presetConfig.startId && presetConfig.ids.includes(presetConfig.startId)
      ? [presetConfig.startId, ...presetConfig.ids.filter(id => id !== presetConfig.startId)]
      : [...presetConfig.ids];
    const locations = orderedIds
      .map(id => graphData.locations.find(location => location.id === id))
      .filter((location): location is GraphData['locations'][number] => Boolean(location));
    const label = presets[mode]?.label ?? `Preset ${mode}`;
    const desc = locations.map(location => location.fullName).join(' → ');
    const startId = presetConfig.startId ?? orderedIds[0] ?? null;
    const endId = mode === 'cycle'
      ? null
      : presetConfig.endId && orderedIds.includes(presetConfig.endId) && presetConfig.endId !== startId
        ? presetConfig.endId
        : orderedIds.find(id => id !== startId) ?? null;
    await savePreset(mode, { ids: orderedIds, label, desc, startId, endId });
    await refreshData();
  }, [graphData.locations, presets, refreshData]);

  const handleSeedInitialData = useCallback(async () => {
    for (const location of INITIAL_GRAPH_DATA.locations) {
      await saveLocation(location);
    }
    for (const route of INITIAL_GRAPH_DATA.routes) {
      await saveRoute(route);
    }
    for (const mode of (['cycle', 'path', 'subset'] as AppMode[])) {
      await savePreset(mode, PRESET_SELECTIONS[mode]);
    }
    await refreshData();
  }, [refreshData]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      setPassword('');
    } catch (error) {
      const rawMessage = error instanceof Error ? error.message : 'Đăng nhập thất bại.';
      const friendlyMessage = rawMessage === 'Invalid login credentials'
        ? 'Email hoặc mật khẩu chưa đúng. Hãy dùng đúng tài khoản đã tạo trong Supabase Authentication. Nếu muốn, có thể cho quyền admin bằng email cấu hình hoặc bằng User Metadata {"role":"admin"}.'
        : rawMessage;
      setMessage(friendlyMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#efe7da] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Admin route</div>
              <h1 className="mt-2 text-3xl font-black text-slate-900">Quản trị cẩm nang du lịch</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                Trang này được tách riêng tại <code>/admin</code> để giao diện mặc định luôn mở ra như một cẩm nang du lịch cho khách xem.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Về trang cẩm nang
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/admin/algorithms"
              className="inline-flex items-center gap-2 rounded-full bg-[#14342b] px-4 py-2 text-sm font-bold text-white"
            >
              Kiểm tra 3 bài toán ở route riêng
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="rounded-[28px] border border-[#ded5c7] bg-white/90 p-6 text-sm text-slate-600">
            Đang kiểm tra phiên đăng nhập...
          </div>
        ) : profile.role === 'admin' ? (
          <>
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              <span className="inline-flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> Đã đăng nhập bằng quyền admin.</span>
              <button onClick={() => void signOut()} className="ml-3 rounded-full border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800">
                Đăng xuất
              </button>
            </div>

            {loadingData ? (
              <div className="rounded-[28px] border border-[#ded5c7] bg-white/90 p-6 text-sm text-slate-600">
                Đang tải dữ liệu quản trị...
              </div>
            ) : (
              <AdminDashboard
                graphData={graphData}
                presets={presets}
                onSaveLocation={handleSaveLocation}
                onDeleteLocation={handleDeleteLocation}
                onSaveLocationOrder={handleSaveLocationOrder}
                onSaveRoute={handleSaveRoute}
                onDeleteRoute={handleDeleteRoute}
                onSavePreset={handleSavePreset}
                onSeedInitialData={handleSeedInitialData}
              />
            )}
          </>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
            <div className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Admin login</div>
              <h2 className="mt-2 text-2xl font-black text-slate-900">Đăng nhập để chỉnh dữ liệu</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Khách xem không cần tài khoản. Chỉ cần một tài khoản đăng nhập ở đây để vào phần cập nhật điểm đến, tuyến đường và preset.
              </p>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                <strong>Cách đơn giản nhất:</strong> vào <code>Authentication &gt; Users</code>, tạo đúng một tài khoản cho thầy.
                Nếu email đó nằm trong danh sách admin của app thì đăng nhập dùng luôn được. Nếu không, mở tài khoản đó và thêm <code>User Metadata</code> là <code>{'{"role":"admin"}'}</code>, rồi đăng nhập ở <code>/admin</code>.
              </div>

              {isBackendEnabled ? (
                <form onSubmit={handleSubmit} className="mt-5 space-y-3">
                  <label className="block">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Email</div>
                    <input
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      type="email"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
                      placeholder="admin@school.vn"
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Mật khẩu</div>
                    <input
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      type="password"
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-emerald-400"
                      placeholder="••••••••"
                    />
                  </label>
                  {message && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-full bg-[#14342b] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    <KeyRound className="h-4 w-4" />
                    {submitting ? 'Đang đăng nhập...' : 'Đăng nhập admin'}
                  </button>
                </form>
              ) : (
                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                    Chưa có biến môi trường Supabase. Trang đang ở chế độ demo để kiểm tra giao diện quản trị.
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => switchDemoRole()}
                      className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
                    >
                      Vào vai Admin
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-[30px] border border-[#ded5c7] bg-[linear-gradient(135deg,#17354d,#325f76,#d4a36d)] p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">Quy ước vận hành</div>
              <h2 className="mt-2 text-3xl font-black">Trang chính là cẩm nang, trang này chỉ để biên tập</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/82">
                <p>Khách mở website sẽ vào thẳng phần giới thiệu, chọn điểm tham quan và xem lời giải 3 bài toán.</p>
                <p>Tại <code>/admin</code>, thầy đăng nhập bằng tài khoản Supabase duy nhất để cập nhật dữ liệu địa điểm, ảnh, bản tiếng Anh và preset thao giảng.</p>
                <p>Nhờ vậy phần trình bày trước lớp gọn hơn: một luồng cho người xem, một luồng riêng cho biên tập.</p>
              </div>
              {profile.role === 'guest' ? null : (
                <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white">
                  <span className="inline-flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4" /> Nếu muốn đổi sang tài khoản khác, chỉ cần đăng xuất rồi đăng nhập lại.</span>
                  <button onClick={() => void signOut()} className="ml-3 rounded-full border border-white/30 px-3 py-1 text-xs font-bold text-white">
                    Đăng xuất
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
