-- 37 · ไฟล์แนบใช้งานได้จริง — บิลรับรถ / ใบเสร็จค่าใช้จ่าย (FAM-1134 · fixlist ข้อ 09)
--
-- ตาราง attachment + RLS มีครบตั้งแต่ migration 04/07 แต่ไม่มี bucket ให้เก็บไฟล์ และไม่มีโค้ดอัปโหลด
-- รูปแบบเดียวกับเซลฟี่ลงเวลา (migration 27): bucket ส่วนตัว เข้าถึงผ่าน signed URL เท่านั้น

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 5242880,
        array['image/webp', 'image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = 5242880,
      allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'application/pdf'];

-- อ่าน/อัปโหลดได้ทุกคนที่ล็อกอิน (ตาราง attachment คุมอีกชั้นว่าใครผูกไฟล์กับอะไร)
drop policy if exists attachments_read on storage.objects;
create policy attachments_read on storage.objects for select
  to authenticated using (bucket_id = 'attachments');

drop policy if exists attachments_write on storage.objects;
create policy attachments_write on storage.objects for insert
  to authenticated with check (bucket_id = 'attachments');

-- ลบได้เฉพาะไฟล์ที่ตัวเองอัป หรือแอดมิน (ตรงกับ attachment_delete ของตาราง)
drop policy if exists attachments_delete on storage.objects;
create policy attachments_delete on storage.objects for delete
  to authenticated using (bucket_id = 'attachments' and (owner = auth.uid() or is_admin()));

-- ค้นไฟล์แนบของแถวหนึ่ง ๆ ให้เร็ว (หน้าค่าใช้จ่าย/สต๊อกดึงทีละหลายแถว)
create index if not exists attachment_owner_idx on attachment (owner_table, owner_id);
