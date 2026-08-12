-- 18 · ให้สาขาปลายทางเห็นรายละเอียดรถที่กำลังโอนเข้ามา (FAM-1016)
--
-- ปัญหา: ตอนโอน (in_transit) motorcycle_unit.branch_id ยังเป็นสาขาต้นทาง
-- RLS เดิม (branch_id in my_branches) จึงซ่อนรถจากสาขาปลายทาง → คนรับไม่รู้ว่ารับรถอะไร
--
-- แก้: เพิ่ม policy อ่านเพิ่ม (RLS policies เป็น OR กัน) ให้เห็น unit ที่อยู่ในรายการโอน
-- ที่ต้นทาง/ปลายทางเป็นสาขาของเรา และยังไม่จบ (in_transit)
--
-- DRAFT — เจ้าของรีวิว + apply ผ่าน Supabase console (ผมไม่มีสิทธิ์ DB)

drop policy if exists motorcycle_unit_transfer_read on public.motorcycle_unit;
create policy motorcycle_unit_transfer_read on public.motorcycle_unit
  for select to authenticated
  using (
    exists (
      select 1 from public.unit_transfer t
      where t.unit_id = motorcycle_unit.id
        and t.status = 'in_transit'
        and (
          is_all_branch()
          or t.from_branch in (select my_branches())
          or t.to_branch   in (select my_branches())
        )
    )
  );

-- หมายเหตุ: เป็น SELECT-only + จำกัดเฉพาะ unit ที่มีรายการโอนที่เกี่ยวกับสาขาเรา
-- ไม่กระทบสิทธิ์เขียน (update/insert ยังใช้ policy branch เดิม) — ปลอดภัยต่อ branch isolation
