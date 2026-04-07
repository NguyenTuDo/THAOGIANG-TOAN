import React, { useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';

export function AuthPanel() {
  const { profile, isAuthenticated, loading, signOut, switchDemoRole } = useAuth();
  const { t } = useLang();
  const [message, setMessage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[#ded5c7] bg-white/90 p-5 text-sm text-slate-600">
        {t('Đang kiểm tra phiên đăng nhập...', 'Checking session...')}
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-[#ded5c7] bg-white/92 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">{t('Khu quản trị', 'Admin area')}</div>
          <div className="mt-2 text-xl font-black text-slate-900">
            {isAuthenticated
              ? t(`Đang đăng nhập: ${profile.displayName}`, `Signed in as ${profile.displayName}`)
              : t('Đăng nhập để vào phần chỉnh dữ liệu', 'Sign in to edit data')}
          </div>
        </div>
        <div className={`rounded-full px-3 py-1 text-xs font-bold ${
          profile.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {profile.role.toUpperCase()}
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          {t(
            'Khách xem không cần tài khoản. Khi cần chỉnh dữ liệu ngay trên máy này, chỉ việc bật quyền admin cục bộ.',
            'Guests need no account. When you need to edit data on this machine, just enable local admin access.',
          )}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          {t('Dữ liệu hiện đã được nhúng trực tiếp trong code web. Các lần chỉnh sửa từ trang admin sẽ được lưu cục bộ trên trình duyệt của máy này.', 'The data is now embedded directly in the web code. Edits from the admin page are saved locally in this browser on this machine.')}
        </div>
        {message && <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>}
        <div className="flex flex-wrap gap-3">
          {!isAuthenticated ? (
            <button
              onClick={() => {
                setMessage(null);
                switchDemoRole();
              }}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
            >
              {t('Bật quyền Admin cục bộ', 'Enable local admin')}
            </button>
          ) : (
            <button
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
            >
              <LockKeyhole className="h-4 w-4" />
              {t('Thoát quyền Admin', 'Exit admin mode')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
