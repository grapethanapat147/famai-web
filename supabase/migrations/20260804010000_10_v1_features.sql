-- v1.0: รองรับฟีเจอร์ชุดใหม่ของต้นแบบไว้ล่วงหน้า (ต้นแบบยังเขียนเฉพาะโหมดสาธิต — Phase 1 ค่อยต่อจริง)
-- ลงเวลาแบบมีหลักฐาน · ปฏิทินผู้บริหาร · เรตไฟแนนซ์รายช่วงงวด · ประวัติเคสสินเชื่อ · รูปรุ่นรถ · ที่อยู่ลูกค้า

-- หลักฐานยืนยันตัวตนตอนลงเวลา — เวลาเป็น timestamptz มีวินาทีอยู่แล้ว
alter table attendance
  add column if not exists check_in_photo_url  text,          -- รูปถ่าย ณ วินาทีที่กด (Supabase Storage)
  add column if not exists check_in_lat        numeric(9,6),
  add column if not exists check_in_lng        numeric(9,6),
  add column if not exists check_in_device     text,          -- userAgent ย่อ
  add column if not exists check_out_photo_url text,
  add column if not exists edited_by           uuid references app_user(id),  -- HR/แอดมินแก้ย้อนหลัง
  add column if not exists edit_reason         text;          -- การแก้ต้องมีเหตุผลเสมอ

-- เรตดอกเบี้ยรายช่วงงวด เช่น {"12":1.29,"36":1.45} — ไม่มีคีย์ไหนใช้เรตฐาน flat_rate_pct
alter table finance_company add column if not exists rate_tiers jsonb;

-- ประวัติการเปลี่ยนสถานะเคส [{"to":"ยื่นเอกสาร","at":"2026-08-04"}] — progress รายคนใช้คิดวันค้าง
alter table finance_case add column if not exists stage_log jsonb not null default '[]';

-- รูปประจำรุ่น — ไม่มีรูประบบวาดเงารถให้
alter table model_variant add column if not exists photo_url text;

alter table customer
  add column if not exists address text,
  add column if not exists note    text;

-- ปฏิทินผู้บริหาร — งานบริษัท (อีเวนท์ ประชุม งานรับเชิญ) แยกจากงานปฏิบัติการ
create table if not exists company_event (
  id         uuid primary key default gen_random_uuid(),
  branch_id  uuid references branch(id),        -- null = ทั้งบริษัท
  event_date date not null,
  event_type text not null default 'อีเวนท์',   -- อีเวนท์ | ประชุม | รับเชิญ | อื่นๆ
  title      text not null,
  note       text,
  created_by uuid references app_user(id),
  created_at timestamptz not null default now()
);
create index if not exists company_event_date_idx on company_event (event_date);

alter table company_event enable row level security;
-- เห็น/แก้ได้เฉพาะ admin กับ manager — ตรงกับแท็บผู้บริหารในหน้าจอ
create policy company_event_exec on company_event
  for all to authenticated
  using (exists (select 1 from app_user_role ur join role r on r.id = ur.role_id
                  where ur.user_id = auth.uid() and r.code in ('admin','manager')))
  with check (exists (select 1 from app_user_role ur join role r on r.id = ur.role_id
                  where ur.user_id = auth.uid() and r.code in ('admin','manager')));
