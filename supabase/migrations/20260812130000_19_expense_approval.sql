-- 19 · เพิ่มการอนุมัติค่าใช้จ่าย (R1 §ค่าใช้จ่าย: "การเงินกดอนุมัติ ถูกต้อง/ผ่าน")
--
-- expense เดิมไม่มีคอลัมน์อนุมัติ (มีแต่ leave_request) → เพิ่มร่องรอยการอนุมัติ
-- ใช้กับ flow เดียวกับ sale.payment_confirmed_by (R1 A4)
--
-- DRAFT — เจ้าของรีวิว + apply ผ่าน Supabase console (ผมไม่มีสิทธิ์ DB)
-- หน้า /expense เวอร์ชันแรก (FAM-1019) ยังไม่อ่านคอลัมน์นี้ → apply ก่อนค่อยเปิด flow อนุมัติ (FAM-1030)

alter table public.expense
  add column if not exists approved_by uuid references public.app_user(id),
  add column if not exists approved_at timestamptz;

-- หมายเหตุ: การกดอนุมัติควรจำกัดสิทธิ์คนที่มี perm 'approve' (role.perms->>'approve')
-- บังคับจริงใน server action (canApproveExpense) — RLS ตารางยังเป็น branch-scoped เดิม
