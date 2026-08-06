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
