-- 31 · ปิดงวดเงินเดือน = แช่ยอดสลิปไว้ (FAM-1122 · fixlist ข้อ 08)
--
-- ปัญหา: หน้าเงินเดือน "คำนวณสด" จากบันทึกเวลา + กำไรการขายทุกครั้งที่เปิด
--        แปลว่าเดือนที่จ่ายเงินไปแล้ว ถ้ามีคนแก้บันทึกเวลาย้อนหลัง ตัวเลขในระบบจะขยับตาม
--        กลายเป็นไม่ตรงกับเงินที่จ่ายจริงโดยไม่มีใครรู้
--
-- ทางแก้: ตอนปิดงวด เก็บ "ภาพนิ่ง" ของสลิปทุกคนไว้ในตาราง payslip
--        หน้าเงินเดือนของงวดที่ปิดแล้วจะอ่านจากภาพนิ่ง ไม่คำนวณใหม่
--
-- ตัวเลขคำนวณฝั่งเซิร์ฟเวอร์ด้วยสูตรเดียวกับที่แสดงผล (lib/payroll) — เบราว์เซอร์ไม่ได้ส่งยอดมา

create table if not exists payslip (
  id             uuid primary key default gen_random_uuid(),
  period_id      uuid not null references payroll_period(id) on delete cascade,
  employee_id    uuid not null references employee(id),
  employee_name  text not null,              -- แช่ชื่อ ณ วันปิดงวด (เปลี่ยนชื่อทีหลังสลิปเก่าไม่เพี้ยน)
  position       text,
  base           numeric(12,2) not null default 0,
  ot_minutes     int not null default 0,
  ot_amount      numeric(12,2) not null default 0,
  commission_base numeric(12,2) not null default 0,
  commission     numeric(12,2) not null default 0,
  ssn            numeric(12,2) not null default 0,
  net            numeric(12,2) not null default 0,
  created_at     timestamptz not null default now(),
  unique (period_id, employee_id)
);

comment on table payslip is 'ภาพนิ่งสลิปเงินเดือน ณ วันปิดงวด — งวดที่ปิดแล้วอ่านจากตารางนี้ ไม่คำนวณใหม่ (FAM-1122)';

alter table payslip enable row level security;

-- เห็น/แก้ได้เฉพาะบริษัทที่เข้าถึงได้ (ผ่านงวดที่สลิปสังกัด) · งวดที่ branch_id เป็น null = ทุกบริษัท
create policy payslip_scope on payslip for all to authenticated
  using (exists (select 1 from payroll_period p where p.id = period_id
                  and (p.branch_id is null or is_all_branch() or p.branch_id in (select my_branches()))))
  with check (exists (select 1 from payroll_period p where p.id = period_id
                  and (p.branch_id is null or is_all_branch() or p.branch_id in (select my_branches()))));

create index if not exists payslip_period_idx on payslip (period_id);
