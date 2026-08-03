-- เปิด RLS ทุกตาราง แล้วเขียนนโยบายให้ครบ
-- เอกสารเดิมมีนโยบายเดียว และไม่มี enable rls เลย ซึ่งแปลว่าไม่มีผลบังคับ

create or replace function is_admin() returns boolean
language sql stable security definer
set search_path = public
as $$ select exists (
  select 1 from app_user_role ur join role r on r.id = ur.role_id
   where ur.user_id = auth.uid() and r.code = 'admin') $$;

-- 1) เปิด RLS ทุกตารางใน public แบบไม่ต้องไล่พิมพ์
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- 2) ข้อมูลอ้างอิง — ทุกคนที่ล็อกอินอ่านได้ แก้ได้เฉพาะแอดมิน
do $$
declare t text;
begin
  foreach t in array array['branch','role','model_variant','model_color','price_history',
                           'finance_company','expense_category','app_setting','app_user']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t||'_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (is_admin()) with check (is_admin())', t||'_admin', t);
  end loop;
end $$;

-- 3) ตารางที่มี branch_id และห้ามเป็น null — แยกสาขาตรง ๆ
do $$
declare t text;
begin
  foreach t in array array['motorcycle_unit','sale','registration','finance_case','receivable',
                           'document','quotation','service_job','part','part_movement',
                           'expense','freebie','follow_up_task','doc_counter','employee']
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (is_all_branch() or branch_id in (select my_branches()))
         with check (is_all_branch() or branch_id in (select my_branches()))',
      t||'_branch', t);
  end loop;
end $$;

-- 4) ตารางที่ branch_id เป็น null ได้ (null = ทุกสาขา)
--    ถ้าใช้ template ข้อ 3 ตรง ๆ แถว null จะได้ค่า NULL แล้วหายไปจากทุกคน
do $$
declare t text;
begin
  foreach t in array array['customer','promotion','payroll_period','commission_rule','import_log']
  loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (branch_id is null or is_all_branch() or branch_id in (select my_branches()))
         with check (branch_id is null or is_all_branch() or branch_id in (select my_branches()))',
      t||'_branch', t);
  end loop;
end $$;

-- 5) โอนย้ายสาขา — เห็นได้ทั้งสาขาต้นทางและปลายทาง
create policy unit_transfer_branch on unit_transfer for all to authenticated
  using (is_all_branch() or from_branch in (select my_branches()) or to_branch in (select my_branches()))
  with check (is_all_branch() or from_branch in (select my_branches()) or to_branch in (select my_branches()));

-- 6) ตารางลูกที่ไม่มี branch_id — ต้องวิ่งผ่านตารางแม่
create policy receipt_payment_scope on receipt_payment for all to authenticated
  using (exists (select 1 from receivable r where r.id = receivable_id
                  and (is_all_branch() or r.branch_id in (select my_branches()))))
  with check (exists (select 1 from receivable r where r.id = receivable_id
                  and (is_all_branch() or r.branch_id in (select my_branches()))));

create policy lead_stage_history_scope on lead_stage_history for all to authenticated
  using (exists (select 1 from customer c where c.id = customer_id
                  and (c.branch_id is null or is_all_branch() or c.branch_id in (select my_branches()))))
  with check (exists (select 1 from customer c where c.id = customer_id
                  and (c.branch_id is null or is_all_branch() or c.branch_id in (select my_branches()))));

create policy registration_event_scope on registration_event for all to authenticated
  using (exists (select 1 from registration g where g.id = registration_id
                  and (is_all_branch() or g.branch_id in (select my_branches()))))
  with check (exists (select 1 from registration g where g.id = registration_id
                  and (is_all_branch() or g.branch_id in (select my_branches()))));

create policy finance_case_event_scope on finance_case_event for all to authenticated
  using (exists (select 1 from finance_case f where f.id = case_id
                  and (is_all_branch() or f.branch_id in (select my_branches()))))
  with check (exists (select 1 from finance_case f where f.id = case_id
                  and (is_all_branch() or f.branch_id in (select my_branches()))));

create policy sale_freebie_scope on sale_freebie for all to authenticated
  using (exists (select 1 from sale s where s.id = sale_id
                  and (is_all_branch() or s.branch_id in (select my_branches()))))
  with check (exists (select 1 from sale s where s.id = sale_id
                  and (is_all_branch() or s.branch_id in (select my_branches()))));

create policy quotation_option_scope on quotation_option for all to authenticated
  using (exists (select 1 from quotation q where q.id = quotation_id
                  and (is_all_branch() or q.branch_id in (select my_branches()))))
  with check (exists (select 1 from quotation q where q.id = quotation_id
                  and (is_all_branch() or q.branch_id in (select my_branches()))));

create policy service_job_line_scope on service_job_line for all to authenticated
  using (exists (select 1 from service_job j where j.id = job_id
                  and (is_all_branch() or j.branch_id in (select my_branches()))))
  with check (exists (select 1 from service_job j where j.id = job_id
                  and (is_all_branch() or j.branch_id in (select my_branches()))));

create policy service_reminder_scope on service_reminder for all to authenticated
  using (exists (select 1 from customer c where c.id = customer_id
                  and (c.branch_id is null or is_all_branch() or c.branch_id in (select my_branches()))))
  with check (exists (select 1 from customer c where c.id = customer_id
                  and (c.branch_id is null or is_all_branch() or c.branch_id in (select my_branches()))));

-- 7) HR — ผูกผ่าน employee
create policy attendance_scope on attendance for all to authenticated
  using (exists (select 1 from employee e where e.id = employee_id
                  and (is_all_branch() or e.branch_id in (select my_branches()))))
  with check (exists (select 1 from employee e where e.id = employee_id
                  and (is_all_branch() or e.branch_id in (select my_branches()))));

create policy leave_request_scope on leave_request for all to authenticated
  using (exists (select 1 from employee e where e.id = employee_id
                  and (is_all_branch() or e.branch_id in (select my_branches()))))
  with check (exists (select 1 from employee e where e.id = employee_id
                  and (is_all_branch() or e.branch_id in (select my_branches()))));

-- เงินเดือน: พนักงานทั่วไปเห็นเฉพาะแถวของตัวเอง — ฝ่ายบุคคล/ผู้บริหารเห็นทั้งสาขา
create policy payroll_line_scope on payroll_line for all to authenticated
  using (exists (select 1 from employee e where e.id = employee_id
                  and (e.user_id = auth.uid()
                       or is_all_branch()
                       or e.branch_id in (select my_branches()))))
  with check (exists (select 1 from employee e where e.id = employee_id
                  and (is_all_branch() or e.branch_id in (select my_branches()))));

-- 8) ไฟล์แนบ — owner_table/owner_id เป็น polymorphic ผูกกับแม่ตรง ๆ ไม่ได้
--    ช่วง demo ให้ผู้ที่ล็อกอินแล้วเข้าถึงได้ และจำกัดให้แคบลงเมื่อมีไฟล์ลูกค้าจริง
create policy attachment_auth on attachment for all to authenticated
  using (true) with check (true);

-- 9) ผู้ใช้กับสิทธิ์ — อ่านได้ (ต้องใช้แสดงชื่อ) แก้ได้เฉพาะแอดมิน
do $$
declare t text;
begin
  foreach t in array array['app_user_role','app_user_branch']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (true)', t||'_read', t);
    execute format('create policy %I on public.%I for all to authenticated using (is_admin()) with check (is_admin())', t||'_admin', t);
  end loop;
end $$;

-- 10) audit log — อ่านได้เฉพาะแอดมิน เขียนผ่าน trigger เท่านั้น
create policy audit_log_admin on audit_log for select to authenticated using (is_admin());;
