-- 22: ฟอนต์แบรนด์ — bucket สำหรับอัปโหลดฟอนต์เอง (FAM-1039)
-- ร้านอัปโหลดไฟล์ฟอนต์ (.woff2/.ttf/.otf) เพื่อใช้เป็นฟอนต์หัวข้อของทั้งแอป
-- เก็บแค่ path ใน app_setting (theme_custom_font) ไม่เก็บไฟล์ในฐานข้อมูล
--
-- อ่านได้ทุกคน (CSS @font-face โหลดฟอนต์ผ่าน url สาธารณะ ไม่ผ่าน auth) · เขียน/ลบเฉพาะแอดมิน (คุมธีมทั้งร้าน)
-- contentType กำหนดเองฝั่ง client ตามนามสกุล จึง whitelist เฉพาะ mime ของฟอนต์
-- แพ็กฟรี 1 GB เหลือเฟือ — ฟอนต์ woff2 ไม่กี่ร้อย KB ต่อไฟล์

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('brand-font', 'brand-font', true, 3145728, array['font/woff2','font/ttf','font/otf'])
on conflict (id) do update
  set public = true, file_size_limit = 3145728,
      allowed_mime_types = array['font/woff2','font/ttf','font/otf'];

drop policy if exists brand_font_read on storage.objects;
create policy brand_font_read on storage.objects for select
  to anon, authenticated using (bucket_id = 'brand-font');

drop policy if exists brand_font_write on storage.objects;
create policy brand_font_write on storage.objects for insert
  to authenticated with check (bucket_id = 'brand-font' and is_admin());

drop policy if exists brand_font_update on storage.objects;
create policy brand_font_update on storage.objects for update
  to authenticated using (bucket_id = 'brand-font' and is_admin())
  with check (bucket_id = 'brand-font' and is_admin());

drop policy if exists brand_font_delete on storage.objects;
create policy brand_font_delete on storage.objects for delete
  to authenticated using (bucket_id = 'brand-font' and is_admin());
