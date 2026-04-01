import React, { useState } from 'react';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function AuthPanel() {
  const { profile, isAuthenticated, isBackendEnabled, loading, signIn, signOut, switchDemoRole } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      setPassword('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Đăng nhập thất bại.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-[28px] border border-[#ded5c7] bg-white/90 p-5 text-sm text-slate-600">
        Đang kiểm tra phiên đăng nhập...
      </div>
    );
  }

  return (
    <div className="rounded-[28px] border border-[#ded5c7] bg-white/92 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Khu quản trị</div>
          <div className="mt-2 text-xl font-black text-slate-900">
            {isAuthenticated ? `Đang đăng nhập: ${profile.displayName}` : 'Đăng nhập để vào phần chỉnh dữ liệu'}
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
          Khách xem không cần tài khoản. Chỉ tài khoản đăng nhập tại `/admin` mới dùng để thêm, sửa, xóa dữ liệu.
        </div>
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
          <div className="flex gap-3">
            {!isAuthenticated ? (
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-full bg-[#14342b] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
              >
                <LockKeyhole className="h-4 w-4" />
                Đăng xuất
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="mt-5 space-y-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
            Chưa có biến môi trường Supabase. App đang ở chế độ demo để kiểm tra giao diện quản trị.
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => switchDemoRole()}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white"
            >
              Vào vai Admin
            </button>
            {isAuthenticated && (
              <button
                onClick={() => void signOut()}
                className="rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
              >
                Thoát demo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
