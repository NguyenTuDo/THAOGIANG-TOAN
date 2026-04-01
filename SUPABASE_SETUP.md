# Thiết lập Supabase — 3 bước

> **Thầy đã có project Supabase rồi — chỉ cần làm theo dưới.**

---

## Bước 1: Lấy thông tin kết nối (2 phút)

Vào **https://supabase.com** → project của thầy → **Settings** → **API**

Sao chép:
- **Project URL** — dạng `https://xxxxx.supabase.co`
- **anon (public)** key

---

## Bước 2: Chạy SQL tạo bảng (1 lần duy nhất)

Vào **SQL Editor** → **New query** → dán cả đoạn dưới → **Run**

```sql
create table if not exists locations (
  id text primary key,
  label text not null,
  "fullName" text not null,
  category text not null,
  description text not null,
  "shortIntro" text,
  "imageUrl" text,
  neighborhood text,
  "visitDuration" text,
  "bestFor" text,
  highlights text[],
  x integer not null,
  y integer not null
);

create table if not exists routes (
  id text primary key,
  "from" text not null,
  "to" text not null,
  "distanceKm" float8 not null
);

create table if not exists preset_selections (
  mode text primary key,
  ids text[] not null,
  label text not null,
  "desc" text not null
);

alter table locations enable row level security;
alter table routes enable row level security;
alter table preset_selections enable row level security;

create policy "read_all" on locations for select using (true);
create policy "read_all" on routes for select using (true);
create policy "read_all" on preset_selections for select using (true);

create policy "admin_only" on locations for all to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_only" on routes for all to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_only" on preset_selections for all to authenticated
  using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
```

---

## Bước 3: Tạo tài khoản admin (1 lần duy nhất)

**Authentication** → **Users** → **Add user**

- Email: `admin@truong.edu.vn`
- Mật khẩu: (tự đặt)
- Bấm **Create user**

Sau đó cuộn xuống **User Metadata** → dán vào:
```json
{
  "role": "admin"
}
```

Bấm **Save**

---

## Bước 4: Cấu hình .env và chạy

Tạo file `.env` trong `C:\App\WEB-THAO-GIANG\unified-tourist-app`:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

Thay bằng **Project URL** và **anon key** từ Bước 1.

Chạy:
```powershell
cd C:\App\WEB-THAO-GIANG\unified-tourist-app
npm run dev
```

Mở **http://127.0.0.1:3000** → đăng nhập `admin@truong.edu.vn` → **Quản trị** → **Nạp dữ liệu mẫu** → Xong!

---

**Người dùng mặc định vào demo mode, xem danh sách điểm mà không cần đăng nhập.**
