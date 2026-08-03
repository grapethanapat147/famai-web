-- เก็บคำเตือนจาก security advisor

-- 1) audit_changes เป็น trigger function ไม่ควรเรียกผ่าน API ได้เลย
revoke all on function public.audit_changes() from anon, authenticated, public;

-- 2) ฟังก์ชันช่วย RLS — ผู้ที่ยังไม่ล็อกอินไม่ต้องเรียก
--    ส่วน authenticated ยังต้องมีสิทธิ์ เพราะนโยบาย RLS ถูกประเมินในบริบทของผู้เรียก
revoke all on function public.my_branches()   from anon, public;
revoke all on function public.is_all_branch() from anon, public;
revoke all on function public.is_admin()      from anon, public;
revoke all on function public.next_doc_no(uuid, text, int) from anon, public;
grant execute on function public.my_branches()   to authenticated;
grant execute on function public.is_all_branch() to authenticated;
grant execute on function public.is_admin()      to authenticated;
grant execute on function public.next_doc_no(uuid, text, int) to authenticated;

-- 3) ไฟล์แนบ — เดิมเปิดกว้างเกินไป
--    อ่านได้ทุกคนที่ล็อกอิน แต่แก้/ลบได้เฉพาะคนที่อัปโหลดเองหรือแอดมิน
drop policy attachment_auth on attachment;

create policy attachment_read on attachment
  for select to authenticated using (true);

create policy attachment_insert on attachment
  for insert to authenticated with check (uploaded_by = auth.uid() or is_admin());

create policy attachment_update on attachment
  for update to authenticated
  using (uploaded_by = auth.uid() or is_admin())
  with check (uploaded_by = auth.uid() or is_admin());

create policy attachment_delete on attachment
  for delete to authenticated using (uploaded_by = auth.uid() or is_admin());;
