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
