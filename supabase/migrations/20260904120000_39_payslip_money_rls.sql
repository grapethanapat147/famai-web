-- FAM-1144 — สลิปเงินเดือน: อ่านได้เฉพาะคนที่มีสิทธิ์ดูตัวเงิน กับเจ้าของสลิปเอง
--
-- ปัญหา: policy เดิม (payslip_scope, migration 31) ให้ "ทุกคนที่เข้าถึงบริษัทนั้นได้" อ่านสลิปของทุกคน
-- การซ่อนตัวเงินตอนนี้อยู่ที่ชั้นแอปอย่างเดียว พนักงานที่เอา token ของตัวเองไปยิง PostgREST ตรง ๆ
-- จึงอ่านเงินเดือน/OT/คอมของเพื่อนร่วมงานได้ทั้งบริษัท (งวดที่ branch_id เป็น null = ข้ามบริษัทด้วย)
--
-- แก้ที่ระดับฐานข้อมูล ไม่ต้องแตะโค้ดแอป: หน้าเงินเดือนเปิดให้เฉพาะ admin/manager/hr/acct
-- ซึ่งทั้งสี่บทบาทมีสิทธิ์ money อยู่แล้ว จึงยังทำงานได้เหมือนเดิมทุกประการ

-- สิทธิ์ "เห็นตัวเงิน" ในภาษาของฐานข้อมูล — ทำแบบเดียวกับ is_admin() / is_all_branch() ที่มีอยู่
create or replace function has_money() returns boolean
language sql stable security definer
set search_path = public
as $$ select exists (
  select 1 from app_user_role ur join role r on r.id = ur.role_id
   where ur.user_id = auth.uid() and coalesce((r.perms->>'money')::boolean, false)) $$;

comment on function has_money() is 'ผู้ใช้ปัจจุบันมีสิทธิ์เห็นตัวเงินไหม (role.perms->>money) — ใช้กับ RLS ของข้อมูลเงินเดือน (FAM-1144)';

drop policy if exists payslip_scope on payslip;

-- 1) คนที่มีสิทธิ์ดูตัวเงิน: จัดการสลิปได้ทั้งงวด ในขอบเขตบริษัทที่ตัวเองเข้าถึงได้ (เงื่อนไขเดิม + has_money)
create policy payslip_manage on payslip for all to authenticated
  using (has_money() and exists (select 1 from payroll_period p where p.id = period_id
          and (p.branch_id is null or is_all_branch() or p.branch_id in (select my_branches()))))
  with check (has_money() and exists (select 1 from payroll_period p where p.id = period_id
          and (p.branch_id is null or is_all_branch() or p.branch_id in (select my_branches()))));

-- 2) ใครก็ตามอ่าน "สลิปของตัวเอง" ได้เสมอ (policy แบบ permissive หลายอันจะถูก OR กัน)
--    เผื่อวันหน้าทำหน้าให้พนักงานเปิดสลิปตัวเอง จะไม่ต้องแก้สิทธิ์อีก
create policy payslip_own on payslip for select to authenticated
  using (exists (select 1 from employee e where e.id = payslip.employee_id and e.user_id = auth.uid()));

comment on table payslip is 'ภาพนิ่งสลิปเงินเดือน ณ วันปิดงวด — อ่านได้เฉพาะผู้มีสิทธิ์ตัวเงิน กับเจ้าของสลิป (FAM-1122, รัดสิทธิ์ FAM-1144)';
