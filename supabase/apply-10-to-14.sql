-- ============================================================================
--  Famai Motor — ชุดรวม migration 10 ถึง 14 สำหรับวางใน Supabase SQL Editor
-- ============================================================================
--  สร้างจากไฟล์จริงใน supabase/migrations/ ไม่ได้เขียนใหม่
--  ตอนที่สร้างไฟล์นี้ ฐานข้อมูลจริงยังรันถึงแค่ migration 09
--  (ตรวจแล้ว: ตาราง branch/sale มีอยู่ · company_event ของ 10 ยังไม่มี)
--
--  วิธีใช้
--    1. เปิด Supabase → SQL Editor → New query
--    2. คัดลอกไฟล์นี้ทั้งไฟล์ไปวาง แล้วกด Run
--    3. เสร็จแล้วไปที่ Settings → API → Exposed schemas เพิ่ม "pub"
--    4. Storage → ตรวจว่ามี bucket ชื่อ model-photo และเป็น public
--
--  ปลอดภัยที่จะรันซ้ำ ทุกคำสั่งเป็น if not exists / drop if exists / on conflict
--
--  ระวังหนึ่งอย่าง: ตอนท้ายมีการถอนสิทธิ์ anon ออกจากสคีมา public ทั้งหมด
--  ซึ่งตั้งใจให้เป็นแบบนั้น หลังจากนี้คนที่ไม่ล็อกอินจะเข้าถึงได้เฉพาะสคีมา pub
-- ============================================================================



-- ==========================================================================
-- ไฟล์: 20260804010000_10_v1_features.sql
-- ==========================================================================

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


-- ==========================================================================
-- ไฟล์: 20260806120000_11_attendance_review.sql
-- ==========================================================================

-- v1.5: การลงเวลาที่ตรวจสอบได้ — เติมช่องที่ migration 10 ยังขาด
-- ต้นแบบยังทำเฉพาะโหมดสาธิต (เก็บรูปใน IndexedDB ที่เครื่อง)
-- ไฟล์นี้เตรียมฝั่งฐานข้อมูลไว้ให้พร้อม ตอนต่อโหมดข้อมูลจริงจะได้ไม่ต้องแก้ schema ระหว่างทาง

-- ── หลักฐานฝั่งลงเวลาออก ────────────────────────────────────────────────
-- migration 10 มีพิกัดกับอุปกรณ์เฉพาะตอนเข้า ทำให้ตรวจย้อนหลังฝั่งออกไม่ได้
alter table attendance
  add column if not exists check_out_lat    numeric(9,6),
  add column if not exists check_out_lng    numeric(9,6),
  add column if not exists check_out_device text,
  add column if not exists check_in_acc     integer,   -- ความคลาดเคลื่อนพิกัด (เมตร)
  add column if not exists check_out_acc    integer;

-- ── ผู้จัดการตรวจการลงเวลา ──────────────────────────────────────────────
-- คิวตรวจขึ้นเฉพาะบันทึกที่มีธง (สาย · OT · ลืมลงเวลาออก · ถูกแก้เวลา)
-- review_status ว่าง = ยังไม่ตรวจ · 'ok' = ยืนยัน · 'flag' = ติดปัญหา (ต้องมี review_note)
alter table attendance
  add column if not exists review_status text
    check (review_status in ('ok','flag')),
  add column if not exists review_by   uuid references app_user(id),
  add column if not exists review_at   timestamptz,
  add column if not exists review_note text;

-- ติดปัญหาต้องบอกเหตุผลเสมอ — บังคับที่ฐานข้อมูล ไม่ใช่แค่ที่หน้าจอ
alter table attendance drop constraint if exists attendance_flag_needs_note;
alter table attendance add constraint attendance_flag_needs_note
  check (review_status is distinct from 'flag' or coalesce(review_note,'') <> '');

-- ── ประวัติการแก้เวลา ───────────────────────────────────────────────────
-- migration 10 เก็บได้ครั้งเดียว (edited_by/edit_reason) แต่ของจริงแก้ได้หลายรอบ
-- [{"by":"...","at":"...","why":"...","from":{"in":"08:30:00","out":null}}]
alter table attendance
  add column if not exists edit_log jsonb not null default '[]';

-- ── อายุของรูปหลักฐาน ───────────────────────────────────────────────────
-- สด 640×480 → เกิน 30 วัน 384×288 → เกิน 1 ปีลบไฟล์ (เวลายังอยู่ครบ)
-- ฝั่งจริงควรให้งานตามกำหนดเวลาที่หลังบ้านเป็นคนย่อ ไม่ใช่เครื่องของพนักงาน
alter table attendance
  add column if not exists photo_tier text not null default 'fresh'
    check (photo_tier in ('fresh','small','gone'));

comment on column attendance.photo_tier is
  'ชั้นความละเอียดของรูปหลักฐาน: fresh 640x480 · small 384x288 (เกิน 30 วัน) · gone (เกิน 1 ปี ลบไฟล์แล้ว)';

-- คิวตรวจถามด้วยสาขา + เดือน + สถานะการตรวจเสมอ
create index if not exists attendance_review_idx
  on attendance (work_date desc, review_status);

-- ── เกณฑ์ผ่อนผันสาย ─────────────────────────────────────────────────────
-- สายนับเมื่อเข้าหลังเวลาเข้างาน + ผ่อนผัน (ค่าเริ่มต้น 5 นาที) แก้ได้ที่หน้าตั้งค่า
-- app_setting เป็นตาราง key/value จึงเพิ่มเป็นแถว ไม่ใช่คอลัมน์
insert into app_setting (key,value) values ('late_grace_min','5')
  on conflict (key) do nothing;

-- หมายเหตุ: attendance มี unique (employee_id, work_date) อยู่แล้วตั้งแต่ migration 03
-- ตรงกับกุญแจ staffId + date ที่ต้นแบบใช้ — ย้ายข้อมูลได้ตรง ๆ ไม่ต้องแปลง

-- ── หลักฐานตอนลงเวลา ต้องครบก่อนถึงบันทึกได้ (v1.8) ─────────────────────
-- ต้นแบบเปลี่ยนกติกาแล้ว: ลงเวลาไม่ได้ถ้าไม่มีทั้งรูปและพิกัด
-- และเวลาที่บันทึกคือวินาทีที่กดปุ่มยืนยัน ไม่ใช่วินาทีที่กดเปิดหน้าจอ
-- จึงต้องเก็บ 3 เวลาแยกกันเพื่อให้ผู้จัดการตรวจย้อนกลับได้ว่าอะไรเกิดตอนไหน
alter table attendance
  add column if not exists check_in_opened_at  timestamptz,
  add column if not exists check_in_photo_at   timestamptz,
  add column if not exists check_in_geo_at     timestamptz,
  add column if not exists check_out_opened_at timestamptz,
  add column if not exists check_out_photo_at  timestamptz,
  add column if not exists check_out_geo_at    timestamptz;

comment on column attendance.check_in_opened_at is
  'วินาทีที่กดปุ่มลงเวลาเปิดหน้าจอ — เทียบกับ check_in เพื่อดูว่าเสียเวลาไปกับการถ่ายรูปนานแค่ไหน';
comment on column attendance.check_in_photo_at is
  'วินาทีที่กดชัตเตอร์ — ต้องห่างจาก check_in ไม่เกิน 120 วินาที ตามกติกา proofStale()';
comment on column attendance.check_in_geo_at is
  'วินาทีที่ได้พิกัดมา — ต้องห่างจาก check_in ไม่เกิน 120 วินาที';

-- หมายเหตุสำหรับตอนต่อของจริง: ด่าน "ต้องมีหลักฐานครบ" ต้องบังคับที่หลังบ้านด้วย
-- ไม่ใช่เชื่อฝั่งเบราว์เซอร์อย่างเดียว เพราะฝั่งหน้าเป็นแค่ UX ไม่ใช่การกัน
-- ทำเป็น constraint หรือ trigger เมื่อคอลัมน์รูป/พิกัดพร้อมใช้งานจริงแล้ว


-- ==========================================================================
-- ไฟล์: 20260809120000_12_attendance_sites.sql
-- ==========================================================================

-- 12: จุดลงเวลา + ให้หลังบ้านเป็นคนจับเวลาและเป็นคนตัดสิน
-- ปิดข้อค้างที่ migration 11 เขียนหมายเหตุไว้เอง:
--   "ด่านต้องบังคับที่หลังบ้านด้วย ไม่ใช่เชื่อฝั่งเบราว์เซอร์อย่างเดียว"
--
-- ต้นแบบ (index.html) ทำฝั่งหน้าไว้ครบแล้วในโหมดสาธิต ไฟล์นี้เตรียมฝั่งฐานข้อมูล
-- ให้พร้อมสำหรับตอนต่อโหมดข้อมูลจริง ซึ่ง liveLogin() ยังไม่บันทึกการลงเวลาเลยในรอบนี้
--
-- สิ่งที่ปลอมไม่ได้จริงมีอย่างเดียวคือ "เวลา" ที่มาจาก now() ของฐานข้อมูล
-- ส่วนพิกัดยังมาจากเบราว์เซอร์อยู่ดี จึงเป็นมาตรการทางวินัย ไม่ใช่มาตรการความปลอดภัย

-- ── จุดลงเวลา ─────────────────────────────────────────────────────────
-- ร้านย่อยของแต่ละสาขาเป็นแถวหนึ่งในตารางนี้ ไม่ใช่ลำดับชั้นใต้ branch
-- เพราะรอบนี้สต๊อกยังผูกกับ 3 สาขาเหมือนเดิมตามที่เจ้าของสั่ง
create table if not exists branch_site (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references branch(id),
  name        text not null,
  kind        text not null default 'main' check (kind in ('main','sub','other')),
  lat         numeric(9,6) not null,
  lng         numeric(9,6) not null,
  radius_m    integer not null default 150 check (radius_m between 50 and 2000),
  pin_acc_m   integer,                                  -- หมุดเองแม่นแค่ไหน หมุดห่วยต้องมองเห็นได้
  holds_stock boolean not null default false,           -- จองไว้สำหรับรอบ "สต๊อกร้านย่อย" ยังไม่มีใครอ่าน
  is_active   boolean not null default true,
  created_by  uuid references app_user(id),
  created_at  timestamptz not null default now(),
  unique (branch_id, name)                              -- กติกาเดียวกับที่หน้าจอบังคับ
);
create index if not exists branch_site_active_idx on branch_site (branch_id) where is_active;

comment on table branch_site is
  'จุดที่พนักงานกดลงเวลาได้ · ร้านย่อยก็เป็นแถวหนึ่งในนี้ · สาขาที่ไม่มีแถวที่ is_active = ข้ามการตรวจตำแหน่ง';

-- ── ผลการตัดสินถูกแช่ไว้ ไม่คิดใหม่ ────────────────────────────────────
-- ถ้าคิดระยะใหม่ทุกครั้งที่อ่าน วันที่เจ้าของขยับหมุดหรือขยายรัศมี
-- ธงของบันทึกย้อนหลังทุกใบจะเปลี่ยนเงียบ ๆ และเดือนที่ตรวจไปแล้วจะพลิกทั้งเดือน
alter table attendance
  add column if not exists check_in_site_id    uuid references branch_site(id),
  add column if not exists check_in_site_name  text,
  add column if not exists check_in_dist_m     integer,
  add column if not exists check_in_outside    boolean,
  add column if not exists check_in_reason     text,
  add column if not exists check_in_client_at  timestamptz,
  add column if not exists check_in_device_id  text,
  add column if not exists check_out_site_id   uuid references branch_site(id),
  add column if not exists check_out_site_name text,
  add column if not exists check_out_dist_m    integer,
  add column if not exists check_out_outside   boolean,
  add column if not exists check_out_reason    text,
  add column if not exists check_out_client_at timestamptz,
  add column if not exists check_out_device_id text,
  add column if not exists geo_flags jsonb not null default '[]';

comment on column attendance.check_in_site_name is
  'ชื่อจุด ณ วินาทีที่ลงเวลา — เก็บซ้ำไว้เพราะเปลี่ยนชื่อจุดทีหลังแล้วประวัติต้องไม่เปลี่ยนตาม';
comment on column attendance.check_in_client_at is
  'นาฬิกาของเครื่องพนักงาน — ผลต่างกับ check_in (now() ของเซิร์ฟเวอร์ ซึ่งเป็นเวลาที่ใช้คิดเงิน) '
  'คือหลักฐานว่านาฬิกาเครื่องถูกปรับ';
comment on column attendance.geo_flags is
  'ธงที่หลังบ้านคิดเอง เช่น ["outside","clockskew"] — ฝั่งหน้าคิดซ้ำได้แต่ถืออันนี้เป็นของจริง';

-- นอกพื้นที่ต้องมีเหตุผลเสมอ บังคับที่ฐานข้อมูล ไม่ใช่แค่ที่หน้าจอ
-- แบบเดียวกับ attendance_flag_needs_note ของ migration 11
-- not valid = ไม่ย้อนไปตรวจแถวเก่าที่ยังไม่มีคอลัมน์พวกนี้
alter table attendance drop constraint if exists attendance_outside_needs_reason;
alter table attendance add constraint attendance_outside_needs_reason
  check ((check_in_outside  is not true or coalesce(check_in_reason,'')  <> '')
     and (check_out_outside is not true or coalesce(check_out_reason,'') <> '')) not valid;

-- ── ระยะทางบนผิวโลก ───────────────────────────────────────────────────
-- haversine พอสำหรับระยะระดับร้อยเมตร ไม่ต้องลง PostGIS ให้ฐานข้อมูลหนักขึ้น
create or replace function meters_between(la1 numeric, ln1 numeric, la2 numeric, ln2 numeric)
returns integer language sql immutable
set search_path = public
as $$
  select (2 * 6371000 * asin(sqrt(
      power(sin(radians(la2 - la1) / 2), 2)
    + cos(radians(la1)) * cos(radians(la2)) * power(sin(radians(ln2 - ln1) / 2), 2)
  )))::integer
$$;
revoke all on function public.meters_between(numeric,numeric,numeric,numeric) from anon, public;
grant execute on function public.meters_between(numeric,numeric,numeric,numeric) to authenticated;

-- ── ใครแก้จุดลงเวลาได้ ────────────────────────────────────────────────
-- แอดมินกับผู้บริหาร — ระบบยังไม่มีบทบาท "หัวหน้าสาขา" ที่เห็นแค่สาขาตัวเอง
create or replace function is_manager() returns boolean
language sql stable security definer
set search_path = public
as $$ select exists (select 1 from app_user_role ur join role r on r.id = ur.role_id
       where ur.user_id = auth.uid() and r.code in ('admin','manager')) $$;
revoke all on function public.is_manager() from anon, public;
grant execute on function public.is_manager() to authenticated;

alter table branch_site enable row level security;
drop policy if exists branch_site_read on branch_site;
create policy branch_site_read on branch_site for select to authenticated
  using (is_all_branch() or branch_id in (select my_branches()));
drop policy if exists branch_site_write on branch_site;
create policy branch_site_write on branch_site for all to authenticated
  using (is_manager() and (is_all_branch() or branch_id in (select my_branches())))
  with check (is_manager() and (is_all_branch() or branch_id in (select my_branches())));

-- ── หลังบ้านเป็นคนจับเวลาและเป็นคนตัดสิน ───────────────────────────────
-- ข้อสำคัญที่สุดของ migration นี้: เวลาที่บันทึกคือ now() ของฐานข้อมูล
-- ไม่ใช่ค่าที่เบราว์เซอร์ส่งมา และระยะถูกคิดใหม่ที่นี่ ไม่รับคำตัดสินจากลูกข่าย
create or replace function punch_clock(
  p_side       text,
  p_lat        numeric,
  p_lng        numeric,
  p_acc        integer,
  p_photo_url  text,
  p_device     text,
  p_device_id  text,
  p_client_at  timestamptz,
  p_photo_at   timestamptz,
  p_geo_at     timestamptz,
  p_opened_at  timestamptz,
  p_reason     text default null)
returns jsonb language plpgsql security definer
set search_path = public
as $$
declare
  v_emp   employee%rowtype;
  v_now   timestamptz := now();
  v_date  date;
  v_site  uuid; v_name text; v_dist integer; v_out boolean := false;
  v_n     integer;
  v_flags jsonb := '[]'::jsonb;
begin
  if p_side not in ('in','out') then raise exception 'ด้านไม่ถูกต้อง'; end if;

  -- ลงเวลาแทนคนอื่นไม่ได้ แม้จะยิง API ตรง — พนักงานมาจาก auth.uid() เท่านั้น
  select * into v_emp from employee where user_id = auth.uid();
  if not found then raise exception 'ไม่พบพนักงานของบัญชีนี้'; end if;

  if p_photo_url is null or p_lat is null or p_lng is null then
    raise exception 'ต้องมีทั้งรูปและพิกัดก่อนลงเวลา'; end if;

  -- หลักฐานต้องสด และต้องไม่มาจากอนาคตด้วย — เวลาในอนาคตน่าสงสัยพอ ๆ กับเวลาที่เก่าเกินไป
  if p_photo_at is null or p_geo_at is null
     or v_now - p_photo_at > interval '120 seconds'
     or v_now - p_geo_at   > interval '120 seconds'
     or p_photo_at > v_now + interval '60 seconds'
     or p_geo_at   > v_now + interval '60 seconds'
  then raise exception 'หลักฐานเก่าเกินไป — ถ่ายใหม่แล้วกดยืนยันอีกครั้ง'; end if;

  -- วันของแถวต้องเป็นวันตามเวลาไทย ไม่ใช่ UTC
  -- (commit 0bd486b เคยแก้บั๊กเดียวกันนี้ฝั่งหน้า — ลงเวลาตอนค่ำจะไปลงผิดแถว)
  v_date := (v_now at time zone 'Asia/Bangkok')::date;

  select count(*) into v_n from branch_site
   where branch_id = v_emp.branch_id and is_active;

  if v_n = 0 then
    -- สาขายังไม่ได้ปักหมุด = ไม่มีอะไรให้เทียบ ต้องปล่อยผ่าน ไม่ใช่ปิดกั้น
    v_flags := v_flags || '["nosite"]'::jsonb;
  else
    select s.id, s.name, d.dist,
           d.dist > s.radius_m + least(coalesce(p_acc,0), 100)
      into v_site, v_name, v_dist, v_out
      from branch_site s
      cross join lateral (select meters_between(p_lat, p_lng, s.lat, s.lng) as dist) d
     where s.branch_id = v_emp.branch_id and s.is_active
     order by d.dist
     limit 1;

    if v_out and coalesce(p_reason,'') = '' then
      raise exception 'อยู่นอกพื้นที่ลงเวลา — ต้องระบุเหตุผลก่อน'; end if;
    if v_out then v_flags := v_flags || '["outside"]'::jsonb; end if;
  end if;

  if p_client_at is not null
     and abs(extract(epoch from (v_now - p_client_at))) > 120
    then v_flags := v_flags || '["clockskew"]'::jsonb; end if;

  insert into attendance (employee_id, work_date) values (v_emp.id, v_date)
    on conflict (employee_id, work_date) do nothing;

  if p_side = 'in' then
    update attendance set
      check_in = v_now, check_in_photo_url = p_photo_url,
      check_in_lat = p_lat, check_in_lng = p_lng, check_in_acc = p_acc,
      check_in_device = p_device, check_in_device_id = p_device_id,
      check_in_site_id = v_site, check_in_site_name = v_name, check_in_dist_m = v_dist,
      check_in_outside = coalesce(v_out,false), check_in_reason = nullif(p_reason,''),
      check_in_client_at = p_client_at, check_in_opened_at = p_opened_at,
      check_in_photo_at = p_photo_at, check_in_geo_at = p_geo_at,
      geo_flags = geo_flags || v_flags
    where employee_id = v_emp.id and work_date = v_date;
  else
    update attendance set
      check_out = v_now, check_out_photo_url = p_photo_url,
      check_out_lat = p_lat, check_out_lng = p_lng, check_out_acc = p_acc,
      check_out_device = p_device, check_out_device_id = p_device_id,
      check_out_site_id = v_site, check_out_site_name = v_name, check_out_dist_m = v_dist,
      check_out_outside = coalesce(v_out,false), check_out_reason = nullif(p_reason,''),
      check_out_client_at = p_client_at, check_out_opened_at = p_opened_at,
      check_out_photo_at = p_photo_at, check_out_geo_at = p_geo_at,
      geo_flags = geo_flags || v_flags
    where employee_id = v_emp.id and work_date = v_date;
  end if;

  return jsonb_build_object('at', v_now, 'date', v_date, 'site', v_name,
                            'dist', v_dist, 'outside', coalesce(v_out,false), 'flags', v_flags);
end $$;

revoke all on function public.punch_clock(text,numeric,numeric,integer,text,text,text,
  timestamptz,timestamptz,timestamptz,timestamptz,text) from anon, public;
grant execute on function public.punch_clock(text,numeric,numeric,integer,text,text,text,
  timestamptz,timestamptz,timestamptz,timestamptz,text) to authenticated;

-- ── เกณฑ์การตรวจตำแหน่ง ───────────────────────────────────────────────
-- geo_mode เริ่มที่ watch เสมอ: คิดและเก็บทุกอย่างแต่ยังไม่บังคับและยังไม่ติดธง
-- รัศมีที่เดาเอาจะเด้งใส่คนที่มาทำงานจริงทุกเช้า แล้วสุดท้ายฟีเจอร์จะถูกสั่งปิด
-- เก็บตัวเลขจริงสัก 2-3 สัปดาห์ ดูการกระจายของ acc กับ dist แล้วค่อยตั้งรัศมีจากหลักฐาน
insert into app_setting (key,value) values
  ('geo_mode','watch'), ('geo_acc_m','120'), ('geo_slack_m','100')
  on conflict (key) do nothing;


-- ==========================================================================
-- ไฟล์: 20260809130000_13_model_photo.sql
-- ==========================================================================

-- 13: คลังรูปรถ — คุณภาพดีแต่ประหยัดพื้นที่
-- เจ้าของสั่ง: "ทำ storage ให้รูปรถ แต่ทำให้รูป quality ดีแต่ประหยัดพื้นที่"
--
-- วิธีประหยัดคือ "ย่อที่เครื่องก่อนอัป" ไม่ใช่ "ย่อทีหลัง"
-- รูปจากมือถือใบละ 3-12 MB จะไม่ถูกอัปขึ้นเลย ฝั่งหน้าแปลงเป็น WebP บนแคนวาสก่อน
-- (imgResize() ใน index.html) แล้วอัปเฉพาะสองชั้น:
--   card 640x640  q0.82  ~50-70 KB   ใช้ในแกลเลอรีของแอปและกริดบนเว็บขาย
--   full 1600x1600 q0.82 ~250-400 KB ใช้หน้ารายละเอียดรถบนเว็บขาย
-- ประมาณ 14 รุ่น x สูงสุด 4 มุม x 2 ชั้น = ~110 ไฟล์ ~40-50 MB อยู่ในโควตาฟรี 1 GB สบาย
--
-- หมายเหตุ: Image Transformation ของ Supabase เป็นของแพ็กเสียเงิน อย่าไปพึ่ง
-- การย่อที่เครื่องคือคำตอบเดียวที่ใช้ได้บนแพ็กฟรี
-- และการเข้ารหัสใหม่บนแคนวาสลบ EXIF ให้เอง พิกัด GPS ที่ติดมากับรูปจึงไม่หลุดไปกับเว็บสาธารณะ

-- ── bucket สาธารณะสำหรับรูปรถ ─────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('model-photo', 'model-photo', true, 2097152, array['image/webp','image/jpeg'])
on conflict (id) do update
  set public = true, file_size_limit = 2097152,
      allowed_mime_types = array['image/webp','image/jpeg'];

-- อ่านได้ทุกคน (เว็บขายรถต้องเรียกได้โดยไม่ล็อกอิน) · เขียนได้เฉพาะแอดมินกับผู้บริหาร
drop policy if exists model_photo_read on storage.objects;
create policy model_photo_read on storage.objects for select
  to anon, authenticated using (bucket_id = 'model-photo');

drop policy if exists model_photo_write on storage.objects;
create policy model_photo_write on storage.objects for insert
  to authenticated with check (bucket_id = 'model-photo' and is_manager());

drop policy if exists model_photo_update on storage.objects;
create policy model_photo_update on storage.objects for update
  to authenticated using (bucket_id = 'model-photo' and is_manager())
  with check (bucket_id = 'model-photo' and is_manager());

drop policy if exists model_photo_delete on storage.objects;
create policy model_photo_delete on storage.objects for delete
  to authenticated using (bucket_id = 'model-photo' and is_manager());

-- ── รูปหลายมุมต่อรุ่น ─────────────────────────────────────────────────
-- sort = 0 คือรูปปก · เริ่มจากรูปเดียวต่อรุ่นก็ได้ เพิ่มมุมทีหลังไม่ต้องแก้ schema
create table if not exists model_photo (
  id         uuid primary key default gen_random_uuid(),
  variant_id uuid not null references model_variant(id) on delete cascade,
  path_card  text not null,
  path_full  text not null,
  bytes      integer,
  sort       integer not null default 0 check (sort between 0 and 3),
  alt        text,
  created_at timestamptz not null default now(),
  unique (variant_id, sort)
);
create index if not exists model_photo_variant_idx on model_photo (variant_id, sort);

comment on table model_photo is
  'รูปรถต่อรุ่น สูงสุด 4 มุม · sort 0 = รูปปก · เก็บ path ใน bucket model-photo ไม่ได้เก็บไฟล์ในฐานข้อมูล';
comment on column model_photo.path_card is '640x640 สำหรับกริดและแกลเลอรี';
comment on column model_photo.path_full is '1600x1600 สำหรับหน้ารายละเอียดรถ';

alter table model_photo enable row level security;
drop policy if exists model_photo_row_read on model_photo;
create policy model_photo_row_read on model_photo for select to anon, authenticated using (true);
drop policy if exists model_photo_row_write on model_photo;
create policy model_photo_row_write on model_photo for all to authenticated
  using (is_manager()) with check (is_manager());

-- model_variant.photo_url มีอยู่แล้วตั้งแต่ migration 10 แต่ไม่มีใครเขียน
-- ต่อไปให้ถือว่าเป็น "รูปปก" ที่คัดลอกมาจาก model_photo sort=0 เพื่อให้ query ง่าย
comment on column model_variant.photo_url is
  'URL รูปปก (ชั้น card) — สำเนาของ model_photo ที่ sort = 0 เก็บไว้ให้ query ง่าย';


-- ==========================================================================
-- ไฟล์: 20260809140000_14_public_api.sql
-- ==========================================================================

-- 14: ข้อมูลสาธารณะสำหรับเว็บขายรถ
--
-- โครงสร้าง: สคีมา pub = สาธารณะทั้งหมด · สคีมา public = ห้าม anon แตะเด็ดขาด
-- กฎเดียวที่ต้องจำคือ "อะไรอยู่ใน pub คือสาธารณะ อะไรอยู่ใน public คือห้ามแตะ"
-- แบบนี้เป็นไปไม่ได้เชิงโครงสร้างที่ anon จะเอื้อมถึงตารางจริง ไม่ใช่แค่ "เราจำได้ว่าอย่าเปิด"
--
-- วิวใน pub ทำงานด้วยสิทธิ์ของเจ้าของ (security_invoker ปิดเป็นค่าเริ่มต้น)
-- จึงข้ามผ่าน RLS ของตารางแม่ได้ตามที่ตั้งใจ
-- *** แปลว่ารายชื่อคอลัมน์กับเงื่อนไข where ของวิวคือเส้นแบ่งความปลอดภัยทั้งหมด ***
-- ต้องเขียนคอลัมน์ทีละชื่อเสมอ ห้าม select *
--
-- รูปร่างข้อมูลต้องตรงกับ pubModel()/pubOrder() ใน index.html เป๊ะ ๆ
-- ฝั่งนั้นมีชุดทดสอบ publicshape-r14.js คุมอยู่ ที่นี่จึงตามให้ตรงเท่านั้น
--
-- ขั้นตอนที่ไม่ใช่ SQL และต้องทำด้วยมือหลังรัน migration นี้:
--   1) Settings → API → Exposed schemas เพิ่ม "pub"
--   2) รัน advisor แล้วยืนยันว่าไม่มีคำเตือนใหม่นอกจาก security_definer_view ที่ตั้งใจไว้

create schema if not exists pub;

-- ── 1) ปิดประตูหลังก่อน ────────────────────────────────────────────────
-- Supabase ให้ anon มีสิทธิ์บนตารางใน public โดยปริยาย
-- สิ่งที่กันอยู่ตอนนี้คือ RLS ไม่ใช่ grant — เผลอเพิ่ม policy หลวมข้อเดียวก็รั่วทันที
revoke all on all tables    in schema public from anon;
revoke all on all routines  in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on routines  from anon;
alter default privileges in schema public revoke all on sequences from anon;

-- ── 2) รหัสติดตามของลูกค้า ─────────────────────────────────────────────
-- Crockford base32 12 ตัว = 60 บิต · ตัด I L O U เพราะลูกค้าต้องอ่านทางโทรศัพท์ได้
-- get_byte % 32 ไม่มี modulo bias เพราะ 256 หารด้วย 32 ลงตัว
create or replace function pub.gen_token() returns text
language plpgsql volatile
set search_path = public
as $$
declare
  a text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  b bytea := extensions.gen_random_bytes(12);   -- pgcrypto อยู่ในสคีมา extensions บน Supabase
  o text := ''; i int;
begin
  for i in 0..11 loop o := o || substr(a, (get_byte(b, i) % 32) + 1, 1); end loop;
  return substr(o,1,4) || '-' || substr(o,5,4) || '-' || substr(o,9,4);
end $$;
revoke all on function pub.gen_token() from anon, public;

alter table sale
  add column if not exists public_token      text,
  add column if not exists public_token_at   timestamptz default now(),
  add column if not exists public_expires_at timestamptz;

update sale set public_token = pub.gen_token() where public_token is null;   -- เติมย้อนหลังให้ของเก่า
alter table sale alter column public_token set default pub.gen_token();
alter table sale alter column public_token set not null;
create unique index if not exists sale_public_token_key on sale (public_token);

comment on column sale.public_token is
  'รหัสติดตามที่พิมพ์ให้ลูกค้าบนใบเสร็จ — เป็นกุญแจถือครอง ใครมีรหัสก็ดูได้ จึงต้องสุ่มและเพิกถอนได้';
comment on column sale.public_expires_at is
  'หมดอายุ 90 วันหลังส่งมอบ (ค่าว่าง = ยังไม่กำหนด) · ออกรหัสใหม่ได้จากหน้าดีลถ้าลูกค้าส่งต่อผิดคน';

-- ── 3) บันทึกการเรียก (PDPA: เก็บแฮชของไอพี ไม่เก็บไอพี) ────────────────
create table if not exists public.public_lookup_log (
  id      bigserial primary key,
  ip_hash text not null,
  at      timestamptz not null default now(),
  hit     boolean not null default false
);
create index if not exists public_lookup_log_idx on public.public_lookup_log (ip_hash, at desc);
alter table public.public_lookup_log enable row level security;   -- ไม่มี policy = ไม่มีใครอ่านผ่าน API ได้

comment on table public.public_lookup_log is
  'นับการเรียกหน้าติดตามเพื่อจำกัดอัตราและให้เห็นการใช้ผิดปกติ · เก็บแฮชของไอพีเท่านั้น ไม่เก็บไอพีจริง';

-- ── 4) แคตตาล็อกรุ่น — เส้นแบ่งความปลอดภัย ─────────────────────────────
create or replace view pub.model
with (security_barrier = true) as
select
  v.code,
  v.model_name                        as model,
  coalesce(v.model_th,'')             as model_th,
  coalesce(v.category,'')             as cat,
  v.cc,
  v.model_year                        as year,
  ph.retail,
  v.photo_url                         as photo,
  (select jsonb_agg(jsonb_build_object('code', c.color_code, 'name', c.color_name)
            order by c.color_code)
     from public.model_color c where c.variant_id = v.id)                    as colors,
  (select jsonb_agg(jsonb_build_object('card', mp.path_card, 'full', mp.path_full)
            order by mp.sort)
     from public.model_photo mp where mp.variant_id = v.id)                  as photos,
  -- จำนวนคันไม่เคยออกจากเซิร์ฟเวอร์ ยุบเป็นถังตั้งแต่ในวิว
  case when av.n = 0 then 'order'
       when av.n <= ls.low then 'low'
       else 'ready' end                                                      as availability
from public.model_variant v
cross join lateral (select coalesce((select value::int from public.app_setting
                                      where key = 'low_stock'), 2) as low) ls
left join lateral (select p.retail from public.price_history p
                    where p.variant_id = v.id and p.effective_from <= current_date
                    order by p.effective_from desc limit 1) ph on true
left join lateral (select count(*) as n from public.motorcycle_unit u
                    where u.variant_id = v.id and u.status = 'available') av on true;

comment on view pub.model is
  'สาธารณะ — วิวนี้คือเส้นแบ่งความปลอดภัย ห้ามเติมคอลัมน์ต้นทุน กำไร ส่วนลด เลขเครื่อง '
  'เลขตัวถัง เอกสารซื้อ และห้ามคืนจำนวนคันเป็นตัวเลขหรือแยกสาขา '
  '(คู่แข่งดึงทุกวันแล้วรู้ยอดขายรายรุ่นได้) ให้คืนเป็น ready/low/order เท่านั้น';

-- ── 5) สถานะการซื้อของลูกค้า — เป็น RPC ไม่ใช่วิว เพราะต้องจำกัดอัตราและบันทึกการเรียก ──
-- กฎที่สำคัญที่สุดของฟังก์ชันนี้เป็นกฎเรื่องศักดิ์ศรี ไม่ใช่กฎเรื่องข้อมูล:
-- เคสไฟแนนซ์ที่ไม่ผ่านคืนแค่ 'กรุณาติดต่อร้าน' ห้ามบอกเหตุผล ห้ามบอกชื่อเจ้าไฟแนนซ์
-- ลูกค้าอาจเปิดลิงก์นี้ต่อหน้าครอบครัว
create or replace function pub.order_status(p_token text)
returns jsonb language plpgsql stable security definer
set search_path = public
as $$
declare r record; v_ip text; v_h text; v_n int; v_status text;
begin
  v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for',''), ',', 1);
  v_h  := encode(extensions.digest(coalesce(nullif(v_ip,''),'-'), 'sha256'), 'hex');

  select count(*) into v_n from public.public_lookup_log
   where ip_hash = v_h and at > now() - interval '1 hour';
  if v_n > 20 then raise exception 'ขอข้อมูลถี่เกินไป กรุณารอสักครู่'; end if;
  insert into public.public_lookup_log(ip_hash) values (v_h);

  select s.id, s.pay_method, g.stage, g.due_at, g.plate_no, g.delivered_at,
         c.full_name, c.phone, b.name as shop, b.phone as shop_phone,
         mv.model_name, mv.model_th, mc.color_name, f.status as fin_status
    into r
    from public.sale s
    join public.customer c        on c.id = s.customer_id
    join public.branch b          on b.id = s.branch_id
    join public.motorcycle_unit u on u.id = s.unit_id
    join public.model_variant mv  on mv.id = u.variant_id
    left join public.model_color mc on mc.variant_id = u.variant_id and mc.color_code = u.color_code
    left join public.registration g on g.sale_id = s.id
    left join public.finance_case f on f.sale_id = s.id
   where s.public_token = upper(trim(p_token))
     and s.voided_at is null
     and (s.public_expires_at is null or s.public_expires_at > now());

  if not found then return jsonb_build_object('found', false); end if;

  update public.public_lookup_log set hit = true
   where id = (select max(id) from public.public_lookup_log where ip_hash = v_h);

  v_status := case
    when r.delivered_at is not null then 'ส่งมอบรถแล้ว'
    when r.fin_status = 'ปฏิเสธ'    then 'กรุณาติดต่อร้าน'
    when r.fin_status is not null and r.fin_status <> 'อนุมัติแล้ว'
                                    then 'กำลังดำเนินการเรื่องสินเชื่อ'
    else 'กำลังดำเนินการเรื่องทะเบียน' end;

  return jsonb_build_object(
    'found',    true,
    'status',   v_status,
    'model',    r.model_name,
    'model_th', coalesce(r.model_th,''),
    'color',    coalesce(r.color_name,''),
    'plate',    r.plate_no,
    'due_at',   r.due_at,
    'delivered_at', r.delivered_at,
    'customer', jsonb_build_object(
        'name',  split_part(r.full_name, ' ', 1),
        'phone', 'xxx-xxx-' || right(regexp_replace(coalesce(r.phone,''), '\D', '', 'g'), 4)),
    'shop',     jsonb_build_object('name', r.shop, 'phone', r.shop_phone));
end $$;

-- ── 6) เปิดเฉพาะสคีมา pub ให้ anon ─────────────────────────────────────
grant usage  on schema pub to anon, authenticated;
grant select on pub.model  to anon, authenticated;
revoke all    on function pub.order_status(text) from public;
grant execute on function pub.order_status(text) to anon, authenticated;
