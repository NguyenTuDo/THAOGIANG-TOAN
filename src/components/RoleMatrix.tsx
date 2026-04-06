import React from 'react';
import { useRolePermissions } from '../contexts/AuthContext';

const FEATURES = [
  { label: 'Xem danh sách điểm đến', guest: true, user: true, admin: true },
  { label: 'Chạy thuật toán tìm lộ trình', guest: false, user: true, admin: true },
  { label: 'Dùng bộ điểm mẫu cài sẵn', guest: false, user: true, admin: true },
  { label: 'Mở giao diện admin', guest: false, user: false, admin: true },
  { label: 'Thêm, sửa, xóa địa điểm', guest: false, user: false, admin: true },
  { label: 'Quản lý khoảng cách cung đường', guest: false, user: false, admin: true },
  { label: 'Chỉnh preset cho 3 chế độ', guest: false, user: false, admin: true },
];

export function RoleMatrix() {
  const permissions = useRolePermissions();

  return (
    <section className="rounded-[30px] border border-[#ded5c7] bg-white/95 p-6 shadow-[0_18px_40px_rgba(15,23,42,0.08)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">Phân quyền chi tiết</div>
      <h2 className="mt-2 text-3xl font-black text-slate-900">Ma trận chức năng cho 2 nhóm đối tượng</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
        `user` tập trung vào trải nghiệm tham quan và xem gợi ý lộ trình. `admin` chịu trách nhiệm dữ liệu nền, preset thao giảng và quản trị nội dung.
      </p>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-sm">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="px-4 py-2">Chức năng</th>
              <th className="px-4 py-2">Guest</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Admin</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map(feature => (
              <tr key={feature.label} className="rounded-2xl bg-slate-50">
                <td className="rounded-l-2xl px-4 py-3 font-semibold text-slate-800">{feature.label}</td>
                <td className="px-4 py-3">{feature.guest ? 'Co' : 'Khong'}</td>
                <td className="px-4 py-3">{feature.user ? 'Co' : 'Khong'}</td>
                <td className="rounded-r-2xl px-4 py-3">{feature.admin ? 'Co' : 'Khong'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
        Vai trò hiện tại đang có quyền chạy thuật toán: {permissions.canRunAlgorithms ? 'Co' : 'Khong'}.
        Quyen vao admin panel: {permissions.canAccessAdminPanel ? 'Co' : 'Khong'}.
      </div>
    </section>
  );
}
