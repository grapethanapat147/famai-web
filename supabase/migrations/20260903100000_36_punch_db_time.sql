-- 36 · ลงเวลาด้วยเวลาของฐานข้อมูล (FAM-1132 · fixlist ข้อ 23)
--
-- เดิม clockIn/clockOut ประทับเวลาด้วยนาฬิกาของเซิร์ฟเวอร์แอป (new Date() บน Vercel)
-- กฎโปรเจกต์ (CLAUDE.md / security-checklist §9i) ให้เวลามาจากฐานข้อมูลผ่าน RPC ที่โกงไม่ได้
-- และเขียนแถวใน transaction เดียวกับการตรวจ "ลงเวลาแล้วหรือยัง"
--
-- punch_clock() เดิม (migration 12) บังคับรูป+พิกัดทุกครั้ง และเขียนคอลัมน์ที่แอปไม่ได้ใช้
-- จึงทำ RPC คู่ใหม่ที่รับผลการตรวจ (geofence/เซลฟี่) จาก server action แล้วประทับ now() ของ DB
-- สูตร สาย/ชั่วโมงงาน/OT ตรงกับ lib/hr/time.ts (lateMinutes / workMinutes / otMinutes) ทุกบรรทัด

create or replace function punch_in(
  p_lat         numeric default null,
  p_lng         numeric default null,
  p_distance_m  int     default null,
  p_site_id     uuid    default null,
  p_site_name   text    default null,
  p_selfie_path text    default null,
  p_work_start  text    default '08:30'
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_emp      uuid;
  v_now      timestamptz := now();
  v_local    timestamp := now() at time zone 'Asia/Bangkok';
  v_date     date;
  v_min      int;
  v_start    int;
  v_late     int;
  v_existing timestamptz;
begin
  if v_uid is null then
    raise exception 'ยังไม่ได้ล็อกอิน' using errcode = '42501';
  end if;
  -- ลงเวลาแทนคนอื่นไม่ได้ — พนักงานมาจาก auth.uid() เท่านั้น
  select id into v_emp from employee where user_id = v_uid;
  if not found then
    raise exception 'ไม่มีข้อมูลพนักงานของบัญชีนี้' using errcode = 'P0002';
  end if;

  v_date  := v_local::date;                                   -- วันตามเวลาไทย ไม่ใช่ UTC
  v_min   := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
  v_start := split_part(coalesce(p_work_start, '08:30'), ':', 1)::int * 60
           + split_part(coalesce(p_work_start, '08:30'), ':', 2)::int;
  v_late  := greatest(0, v_min - v_start);

  select check_in into v_existing
    from attendance where employee_id = v_emp and work_date = v_date for update;
  if v_existing is not null then
    raise exception 'ลงเวลาเข้าแล้ววันนี้' using errcode = 'P0001';
  end if;

  insert into attendance (employee_id, work_date, check_in, status, late_minutes,
    check_in_lat, check_in_lng, check_in_distance_m, check_in_site_id, check_in_site_name, check_in_selfie)
  values (v_emp, v_date, v_now, case when v_late > 0 then 'สาย' else 'ปกติ' end, v_late,
    p_lat, p_lng, p_distance_m, p_site_id, p_site_name, nullif(p_selfie_path, ''))
  on conflict (employee_id, work_date) do update
    set check_in = excluded.check_in, status = excluded.status, late_minutes = excluded.late_minutes,
        check_in_lat = excluded.check_in_lat, check_in_lng = excluded.check_in_lng,
        check_in_distance_m = excluded.check_in_distance_m, check_in_site_id = excluded.check_in_site_id,
        check_in_site_name = excluded.check_in_site_name, check_in_selfie = excluded.check_in_selfie;

  return jsonb_build_object('check_in', v_now, 'late_minutes', v_late, 'work_date', v_date);
end $$;

create or replace function punch_out(
  p_work_end text default '17:30',
  p_ot_step  int  default 30
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_emp     uuid;
  v_now     timestamptz := now();
  v_local   timestamp := now() at time zone 'Asia/Bangkok';
  v_row     attendance%rowtype;
  v_in      timestamp;
  v_in_min  int;
  v_out_min int;
  v_end     int;
  v_work    int;
  v_over    int;
  v_ot      int;
  v_step    int := greatest(1, coalesce(p_ot_step, 30));
begin
  if v_uid is null then
    raise exception 'ยังไม่ได้ล็อกอิน' using errcode = '42501';
  end if;
  select id into v_emp from employee where user_id = v_uid;
  if not found then
    raise exception 'ไม่มีข้อมูลพนักงานของบัญชีนี้' using errcode = 'P0002';
  end if;

  select * into v_row from attendance
   where employee_id = v_emp and work_date = v_local::date for update;
  if not found or v_row.check_in is null then
    raise exception 'ยังไม่ได้ลงเวลาเข้า' using errcode = 'P0001';
  end if;
  if v_row.check_out is not null then
    raise exception 'ลงเวลาออกแล้ว' using errcode = 'P0001';
  end if;

  v_in      := v_row.check_in at time zone 'Asia/Bangkok';
  v_in_min  := extract(hour from v_in)::int * 60 + extract(minute from v_in)::int;
  v_out_min := extract(hour from v_local)::int * 60 + extract(minute from v_local)::int;
  v_end     := split_part(coalesce(p_work_end, '17:30'), ':', 1)::int * 60
             + split_part(coalesce(p_work_end, '17:30'), ':', 2)::int;

  v_work := greatest(0, v_out_min - v_in_min);
  -- OT นับจาก max(เวลาเลิกงาน, เวลาเข้า) ปัดลงเป็นช่วงละ p_ot_step นาที (ตรง otMinutes ใน lib/hr/time.ts)
  v_over := v_out_min - greatest(v_end, v_in_min);
  v_ot   := case when v_over < v_step then 0 else (v_over / v_step) * v_step end;

  update attendance
     set check_out = v_now, work_minutes = v_work, ot_minutes = v_ot
   where id = v_row.id;

  return jsonb_build_object('check_out', v_now, 'work_minutes', v_work, 'ot_minutes', v_ot);
end $$;

revoke all on function punch_in(numeric, numeric, int, uuid, text, text, text) from anon, public;
revoke all on function punch_out(text, int) from anon, public;
grant execute on function punch_in(numeric, numeric, int, uuid, text, text, text) to authenticated;
grant execute on function punch_out(text, int) to authenticated;

comment on function punch_in  is 'ลงเวลาเข้า — เวลาจาก now() ของฐานข้อมูล · พนักงานจาก auth.uid() · กันลงซ้ำในแถวเดียวกัน (FAM-1132)';
comment on function punch_out is 'ลงเวลาออก — เวลาจาก now() ของฐานข้อมูล · คิดชั่วโมงงาน/OT ตรงสูตรใน lib/hr/time.ts (FAM-1132)';
