-- FAM-1145 — ปิดคอลัมน์อ่อนไหวของพนักงานที่ระดับฐานข้อมูล (ต่อจาก FAM-1144)
--
-- ปัญหา: `employee.base_salary` (เงินเดือน) กับ `ssn_no` / `bank_code` / `bank_account`
-- (เลขประกันสังคม + บัญชีธนาคาร — ข้อมูลอ่อนไหวตาม PDPA) อ่านได้ด้วย token ของผู้ใช้คนไหนก็ได้
-- ที่ยิง PostgREST ตรง ๆ เพราะ RLS กันได้แค่ระดับ "แถว" ไม่ใช่ระดับ "คอลัมน์"
--
-- แก้ด้วยการถอนสิทธิ์อ่านเฉพาะ 4 คอลัมน์นี้ออกจาก role `authenticated` (คือผู้ใช้ที่ล็อกอินทุกคน)
-- แล้วเปิดทางเดียวให้อ่านผ่านฟังก์ชัน security definer ที่ตรวจสิทธิ์ money + ขอบเขตบริษัทเอง
-- คอลัมน์อื่นของ employee (id, user_id, branch_id, emp_code, position, hired_at, resigned_at)
-- ยังอ่านได้ตามปกติ อีก 6 จุดในแอปที่อ่านเฉพาะคอลัมน์เหล่านั้นจึงไม่กระทบ

revoke select (base_salary, ssn_no, bank_code, bank_account) on public.employee from authenticated;

-- ทางเดียวที่จะอ่านสี่คอลัมน์นี้ได้ — คืนแถวเฉพาะเมื่อมีสิทธิ์เห็นตัวเงิน และเฉพาะบริษัทที่เข้าถึงได้
-- ไม่มีสิทธิ์ = ได้ผลลัพธ์ว่าง (ไม่ throw) เพื่อให้หน้าที่เรียกไปแสดง "—" ได้ตามปกติ
create or replace function employee_pay_info()
returns table (id uuid, base_salary numeric, ssn_no text, bank_code text, bank_account text)
language sql stable security definer
set search_path = public
as $$
  select e.id, e.base_salary, e.ssn_no, e.bank_code, e.bank_account
    from employee e
   where has_money()
     and (is_all_branch() or e.branch_id in (select my_branches()))
$$;

comment on function employee_pay_info() is
  'เงินเดือน/เลข ปกส./บัญชีธนาคารของพนักงาน — เปิดให้เฉพาะผู้มีสิทธิ์ตัวเงิน ในบริษัทที่เข้าถึงได้ (FAM-1145)';

revoke all on function employee_pay_info() from public;
grant execute on function employee_pay_info() to authenticated;
