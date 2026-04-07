import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';
import { AdminDashboard } from '../components/AdminDashboard';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
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
  const { profile, loading, signOut, switchDemoRole } = useAuth();
  const { t } = useLang();
  const [graphData, setGraphData] = useState<GraphData>(INITIAL_GRAPH_DATA);
  const [presets, setPresets] = useState<PresetSelectionMap>(PRESET_SELECTIONS);
  const [loadingData, setLoadingData] = useState(true);
  // Track whether data has ever loaded so subsequent refreshes don't unmount AdminDashboard
  const [everLoaded, setEverLoaded] = useState(false);
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

  const handleSavePreset = useCallback(async (mode: AppMode, presetConfig: Pick<PresetSelection, 'ids' | 'routeIds' | 'startId' | 'endId'>) => {
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
    await savePreset(mode, { ids: orderedIds, routeIds: presetConfig.routeIds ?? [], label, desc, startId, endId });
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

  return (
    <div className="min-h-screen bg-[#efe7da] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Admin route</div>
              <h1 className="mt-2 text-3xl font-black text-slate-900">{t('Quản trị cẩm nang du lịch', 'Tourist Guidebook Admin')}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
                {t(
                  'Trang này được tách riêng tại /admin để giao diện mặc định luôn mở ra như một cẩm nang du lịch cho khách xem.',
                  'This page is separated at /admin so the default interface always opens as a tourist guidebook for visitors.',
                )}
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('Về trang cẩm nang', 'Back to guidebook')}
            </Link>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/admin/algorithms"
              className="inline-flex items-center gap-2 rounded-full bg-[#14342b] px-4 py-2 text-sm font-bold text-white"
            >
              {t('Kiểm tra 3 bài toán ở route riêng', 'Test 3 problems at separate route')}
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="rounded-[28px] border border-[#ded5c7] bg-white/90 p-6 text-sm text-slate-600">
            {t('Đang kiểm tra phiên đăng nhập...', 'Checking session...')}
          </div>
        ) : profile.role === 'admin' ? (
          <>
            <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
              <span className="inline-flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" /> {t('Đã đăng nhập bằng quyền admin.', 'Signed in as admin.')}</span>
              <button onClick={() => void signOut()} className="ml-3 rounded-full border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-800">
                {t('Đăng xuất', 'Sign out')}
              </button>
            </div>

            {loadingData ? (
              <div className="rounded-[28px] border border-[#ded5c7] bg-white/90 p-6 text-sm text-slate-600">
                {t('Đang tải dữ liệu quản trị...', 'Loading admin data...')}
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
              <h2 className="mt-2 text-2xl font-black text-slate-900">{t('Đăng nhập để chỉnh dữ liệu', 'Sign in to edit data')}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {t(
                  'Khách xem không cần tài khoản. Khi cần chỉnh dữ liệu trên máy này, thầy chỉ việc bật quyền admin cục bộ để vào phần cập nhật điểm đến, tuyến đường và preset.',
                  'Guests need no account. When you need to edit data on this machine, just enable local admin access to update destinations, routes, and presets.',
                )}
              </p>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                <strong>{t('Cách dùng hiện tại:', 'Current workflow:')}</strong> {t('dữ liệu gốc đã được chép trực tiếp từ Supabase vào mã nguồn. Từ giờ, mỗi lần cần chỉnh tạm trên máy này thì vào', 'the base data has been copied directly from Supabase into the source code. From now on, whenever you need a local edit on this machine, open')} <code>/admin</code> {t('và bật quyền admin cục bộ.', 'and enable local admin access.')}
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                  {t('Các chỉnh sửa tại đây được lưu trong trình duyệt của máy này. Nếu muốn biến chúng thành dữ liệu cố định của website, chỉ cần chép lại vào file dữ liệu trong code rồi build lại.', 'Edits here are saved in this browser on this machine. If you want them to become the website’s fixed data, copy them back into the code data file and rebuild.')}
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => switchDemoRole()}
                    className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
                  >
                    {t('Bật quyền Admin cục bộ', 'Enable local admin')}
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-[#ded5c7] bg-[linear-gradient(135deg,#17354d,#325f76,#d4a36d)] p-6 text-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/60">{t('Quy ước vận hành', 'Operating convention')}</div>
              <h2 className="mt-2 text-3xl font-black">{t('Trang chính là cẩm nang, trang này chỉ để biên tập', 'Main page is the guidebook, this page is for editing only')}</h2>
              <div className="mt-4 space-y-3 text-sm leading-7 text-white/82">
                <p>{t('Khách mở website sẽ vào thẳng phần giới thiệu, chọn điểm tham quan và xem lời giải 3 bài toán.', 'Visitors open the website directly to the introduction, select destinations, and view solutions to 3 problems.')}</p>
                <p>{t('Tại ', 'At ')}<code>/admin</code>{t(', thầy bật quyền admin cục bộ để cập nhật dữ liệu địa điểm, ảnh, bản tiếng Anh và preset thao giảng ngay trên máy đang dùng.', ', enable local admin access to update location data, images, English translations, and demo presets on the current machine.')}</p>
                <p>{t('Nhờ vậy phần trình bày trước lớp gọn hơn: dữ liệu gốc nằm trong code web, còn phần biên tập thử nghiệm vẫn tách riêng.', 'This keeps the classroom presentation clean: the base data lives in the web code, while experimental editing stays separate.')}</p>
              </div>
              {profile.role === 'guest' ? null : (
                <div className="mt-5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white">
                  <span className="inline-flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4" /> {t('Nếu muốn đổi sang tài khoản khác, chỉ cần đăng xuất rồi đăng nhập lại.', 'To switch to a different account, just sign out and sign in again.')}</span>
                  <button onClick={() => void signOut()} className="ml-3 rounded-full border border-white/30 px-3 py-1 text-xs font-bold text-white">
                    {t('Đăng xuất', 'Sign out')}
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
