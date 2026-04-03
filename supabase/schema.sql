-- ============================================================
-- unified-tourist-app — Supabase Schema
-- Cập nhật: 2026-04-01 (v2: thêm images[], lat, lng)
-- Chạy toàn bộ file này trong Supabase SQL Editor (New query → Run)
-- ============================================================

-- ------------------------------------------------------------
-- 1. TẠO BẢNG
-- ------------------------------------------------------------

create table if not exists locations (
  id             text    primary key,
  label          text    not null,
  "fullName"     text    not null,
  "fullNameEn"   text,
  category       text    not null,
  description    text    not null,
  "descriptionEn"  text,
  "shortIntro"   text,
  "shortIntroEn" text,
  "imageUrl"     text,
  "googleMapsUrl" text,
  neighborhood   text,
  "neighborhoodEn" text,
  "visitDuration" text,
  "bestFor"      text,
  "bestForEn"    text,
  highlights     text[],
  "highlightsEn" text[],
  images         text[],
  "displayOrder" integer,
  lat            float8,
  lng            float8,
  x              integer not null,
  y              integer not null
);

create table if not exists routes (
  id           text    primary key,
  "from"       text    not null,
  "to"         text    not null,
  "distanceKm" float8  not null,
  "routePoints" jsonb
);

create table if not exists preset_selections (
  mode  text     primary key,
  ids   text[]   not null,
  label text     not null,
  "desc" text    not null,
  "startId" text,
  "endId" text
);

-- ------------------------------------------------------------
-- 2. NÂNG CẤP SCHEMA (an toàn khi chạy lại — dùng IF NOT EXISTS)
-- Chạy block này nếu bảng đã tồn tại từ phiên bản cũ hơn.
-- ------------------------------------------------------------

alter table locations add column if not exists "fullNameEn"     text;
alter table locations add column if not exists "descriptionEn"  text;
alter table locations add column if not exists "shortIntroEn"   text;
alter table locations add column if not exists "googleMapsUrl"  text;
alter table locations add column if not exists "neighborhoodEn" text;
alter table locations add column if not exists "bestForEn"      text;
alter table locations add column if not exists "highlightsEn"   text[];
alter table locations add column if not exists images           text[];
alter table locations add column if not exists "displayOrder"   integer;
alter table locations add column if not exists lat              float8;
alter table locations add column if not exists lng              float8;
alter table preset_selections add column if not exists "startId" text;
alter table preset_selections add column if not exists "endId"   text;
alter table routes add column if not exists "routePoints" jsonb;

-- ------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table locations         enable row level security;
alter table routes             enable row level security;
alter table preset_selections  enable row level security;

-- Xóa policy cũ trước khi tạo lại (tránh lỗi "already exists")
drop policy if exists "read_all"   on locations;
drop policy if exists "read_all"   on routes;
drop policy if exists "read_all"   on preset_selections;
drop policy if exists "admin_only" on locations;
drop policy if exists "admin_only" on routes;
drop policy if exists "admin_only" on preset_selections;

-- Đọc công khai
create policy "read_all" on locations         for select using (true);
create policy "read_all" on routes             for select using (true);
create policy "read_all" on preset_selections  for select using (true);

-- Ghi/xóa chỉ dành cho admin (JWT user_metadata.role = 'admin')
create policy "admin_only" on locations for all to authenticated
  using      ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_only" on routes for all to authenticated
  using      ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');

create policy "admin_only" on preset_selections for all to authenticated
  using      ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');
