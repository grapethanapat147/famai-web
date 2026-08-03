-- ฟังก์ชันช่วย RLS + ตัวนับเลขเอกสาร + audit trigger
-- ทุกฟังก์ชันตั้ง search_path ตายตัว ไม่งั้น security definer เปิดช่องยกระดับสิทธิ์

create or replace function my_branches() returns setof uuid
language sql stable security definer
set search_path = public
as $$ select branch_id from app_user_branch where user_id = auth.uid() $$;

create or replace function is_all_branch() returns boolean
language sql stable security definer
set search_path = public
as $$ select coalesce((select all_branch from app_user where id = auth.uid()), false) $$;

-- เลขเอกสารกันซ้ำเชิงโครงสร้าง: ล็อกแถวแล้วเพิ่มทีละหนึ่ง แยกสาขา × ประเภท × ปี
create or replace function next_doc_no(p_branch uuid, p_type text, p_year int)
returns text
language plpgsql security definer
set search_path = public
as $$
declare n bigint; pfx text;
begin
  insert into doc_counter (branch_id, doc_type, year_be)
  values (p_branch, p_type, p_year)
  on conflict (branch_id, doc_type, year_be) do nothing;

  update doc_counter set last_no = last_no + 1
   where branch_id = p_branch and doc_type = p_type and year_be = p_year
  returning last_no into n;

  select doc_prefix into pfx from branch where id = p_branch;
  return pfx || '-' || p_type || '-' || p_year || '-' || lpad(n::text, 5, '0');
end $$;

-- audit trigger: เก็บเฉพาะคอลัมน์ที่เปลี่ยนจริง ไม่เก็บทั้งแถว
-- audit_log เป็นตารางเดียวที่โตไม่มีเพดาน การเก็บทั้งแถวจะกินโควตา Free หมดใน 1 ปี
create or replace function audit_changes() returns trigger
language plpgsql security definer
set search_path = public
as $$
declare b jsonb; a jsonb; changed jsonb;
begin
  if tg_op = 'INSERT' then
    b := null; a := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    changed := (select jsonb_object_agg(key, value)
                  from jsonb_each(to_jsonb(new))
                 where to_jsonb(new) -> key is distinct from to_jsonb(old) -> key);
    if changed is null then return new; end if;   -- ไม่มีอะไรเปลี่ยน ไม่ต้องเขียน log
    a := changed;
    b := (select jsonb_object_agg(key, to_jsonb(old) -> key) from jsonb_each(changed));
  else
    b := to_jsonb(old); a := null;
  end if;

  insert into audit_log (actor, table_name, row_id, action, before, after)
  values (auth.uid(), tg_table_name,
          coalesce((to_jsonb(coalesce(new, old)) ->> 'id'), '?'),
          tg_op, b, a);
  return coalesce(new, old);
end $$;

create trigger audit_motorcycle_unit after insert or update or delete on motorcycle_unit
  for each row execute function audit_changes();
create trigger audit_sale after insert or update or delete on sale
  for each row execute function audit_changes();
create trigger audit_registration after insert or update or delete on registration
  for each row execute function audit_changes();
create trigger audit_finance_case after insert or update or delete on finance_case
  for each row execute function audit_changes();
create trigger audit_receivable after insert or update or delete on receivable
  for each row execute function audit_changes();
create trigger audit_app_user after insert or update or delete on app_user
  for each row execute function audit_changes();;
