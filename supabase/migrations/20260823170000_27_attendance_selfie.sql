-- FAM-1101 P2 · ถ่ายเซลฟี่ยืนยันตอนลงเวลา
-- branch.require_selfie: opt-in ต่อบริษัท (แยกจาก geofence) — ไม่ตั้ง = ไม่ต้องเซลฟี่
-- attendance.check_in_selfie: path รูปใน bucket 'attendance-selfie' (private)
alter table branch
  add column if not exists require_selfie boolean not null default false;

alter table attendance
  add column if not exists check_in_selfie text;

-- ── bucket ส่วนตัวสำหรับเซลฟี่ลงเวลา (public=false — เข้าถึงผ่าน signed URL เท่านั้น) ──
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attendance-selfie', 'attendance-selfie', false, 1048576, array['image/webp','image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 1048576,
      allowed_mime_types = array['image/webp','image/jpeg'];

-- อ่าน/เขียนได้เฉพาะผู้ล็อกอิน (ไม่เปิด anon — เป็นข้อมูลส่วนบุคคล)
drop policy if exists att_selfie_read on storage.objects;
create policy att_selfie_read on storage.objects for select
  to authenticated using (bucket_id = 'attendance-selfie');

drop policy if exists att_selfie_write on storage.objects;
create policy att_selfie_write on storage.objects for insert
  to authenticated with check (bucket_id = 'attendance-selfie');
