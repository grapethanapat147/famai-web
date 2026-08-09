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
-- value เป็น jsonb: ข้อความต้องใส่เครื่องหมายคำพูดให้เป็น JSON ที่ถูกต้อง
-- ('geo_mode','watch') จะพัง เพราะ watch เปล่า ๆ ไม่ใช่ JSON — ส่วนตัวเลขไม่ต้องใส่
insert into app_setting (key,value) values
  ('geo_mode', to_jsonb('watch'::text)), ('geo_acc_m','120'::jsonb), ('geo_slack_m','100'::jsonb)
  on conflict (key) do nothing;
