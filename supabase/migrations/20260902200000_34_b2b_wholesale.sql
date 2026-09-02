-- 34 · ขายส่งระหว่างร้าน (B2B) — FAM-1127 · fixlist ข้อ 12 · บรีฟ R1 หมวด D
--
-- ตอนนี้ระบบขายได้เฉพาะลูกค้าปลีก (B2C) งานขายส่งให้ร้านค้าด้วยกันบันทึกในระบบไม่ได้เลย
--
-- โครงสร้าง: 1 ใบสั่งขายส่ง = หลายคัน (ต่างจากขายปลีกที่ 1 บิล = 1 คัน)
--   wholesale_company    ร้านค้าปลายทาง (มีข้อมูลผู้เสียภาษีเพราะต้องออกใบกำกับให้)
--   wholesale_order      หัวบิล
--   wholesale_order_line รายคัน (ราคาขายส่ง + ต้นทุนแช่ไว้ ณ วันขาย)

-- เงินค้างรับจากขายส่งไม่ได้ผูกกับ sale (ขายส่งมีบิลของตัวเอง) — ต้องยอมให้ sale_id ว่าง
alter table receivable alter column sale_id drop not null;

create table if not exists wholesale_company (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid references branch(id),       -- null = ใช้ได้ทุกบริษัท
  name        text not null,
  tax_id      text,
  address     text,
  phone       text,
  contact_name text,
  credit_days int not null default 0,           -- 0 = รับเงินสด · >0 = ขายเชื่อ ตั้งเงินค้างรับอัตโนมัติ
  note        text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (name)
);

comment on table wholesale_company is 'ร้านค้าที่เราขายส่งให้ (B2B) — FAM-1127';

create table if not exists wholesale_order (
  id             uuid primary key default gen_random_uuid(),
  branch_id      uuid not null references branch(id),
  company_id     uuid not null references wholesale_company(id),
  order_no       text not null,
  sold_at        date not null default current_date,
  salesperson_id uuid references app_user(id),
  total          numeric(12,2) not null default 0,
  cost_total     numeric(12,2) not null default 0,
  gross_profit   numeric(12,2) not null default 0,
  note           text,
  voided_at      timestamptz,
  voided_reason  text,
  created_at     timestamptz not null default now(),
  unique (branch_id, order_no)
);

comment on table wholesale_order is 'หัวบิลขายส่ง — 1 ใบมีได้หลายคัน (FAM-1127)';

create table if not exists wholesale_order_line (
  id        bigserial primary key,
  order_id  uuid not null references wholesale_order(id) on delete cascade,
  unit_id   uuid not null references motorcycle_unit(id),
  price     numeric(12,2) not null,
  cost      numeric(12,2) not null,             -- แช่ต้นทุน ณ วันขาย (ไม่ขยับตามราคาทุนปัจจุบัน)
  unique (unit_id)                              -- คันหนึ่งขายส่งได้ครั้งเดียว
);

comment on table wholesale_order_line is 'รายคันในบิลขายส่ง · unique(unit_id) กันคันเดียวถูกขายส่งซ้ำ (FAM-1127)';

create index if not exists wholesale_order_company_idx on wholesale_order (company_id);
create index if not exists wholesale_order_line_order_idx on wholesale_order_line (order_id);

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table wholesale_company enable row level security;
alter table wholesale_order enable row level security;
alter table wholesale_order_line enable row level security;

-- บริษัทขายส่ง: branch_id null = ทุกบริษัทเห็น · อ่านได้ทุกคนที่ล็อกอิน แก้ได้เฉพาะผู้จัดการขึ้นไป
create policy wholesale_company_read on wholesale_company for select to authenticated
  using (branch_id is null or is_all_branch() or branch_id in (select my_branches()));
create policy wholesale_company_write on wholesale_company for all to authenticated
  using (is_manager() and (branch_id is null or is_all_branch() or branch_id in (select my_branches())))
  with check (is_manager() and (branch_id is null or is_all_branch() or branch_id in (select my_branches())));

create policy wholesale_order_scope on wholesale_order for all to authenticated
  using (is_all_branch() or branch_id in (select my_branches()))
  with check (is_all_branch() or branch_id in (select my_branches()));

create policy wholesale_order_line_scope on wholesale_order_line for all to authenticated
  using (exists (select 1 from wholesale_order o where o.id = order_id
                  and (is_all_branch() or o.branch_id in (select my_branches()))))
  with check (exists (select 1 from wholesale_order o where o.id = order_id
                  and (is_all_branch() or o.branch_id in (select my_branches()))));

-- ── RPC: บันทึกการขายส่ง (atomic เหมือน sell_unit) ─────────────────────────────
-- p_lines = [{"unit_id": "...", "price": 55000}, ...]
create or replace function sell_wholesale(
  p_company_id uuid,
  p_lines      jsonb,
  p_note       text default null
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_branch    uuid;
  v_order     uuid;
  v_no        text;
  v_year      int := extract(year from now())::int + 543;
  v_credit    int;
  v_company   record;
  ln          jsonb;
  v_unit      uuid;
  v_price     numeric;
  v_cost      numeric;
  v_status    text;
  v_ubranch   uuid;
  v_total     numeric := 0;
  v_cost_tot  numeric := 0;
  v_count     int := 0;
begin
  if v_uid is null then
    raise exception 'ยังไม่ได้ล็อกอิน' using errcode = '42501';
  end if;
  if not exists (
    select 1 from app_user_role ur join role r on r.id = ur.role_id
    where ur.user_id = v_uid and r.code in ('admin', 'manager', 'sales')
  ) then
    raise exception 'ไม่มีสิทธิ์ขายรถ' using errcode = '42501';
  end if;
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'เลือกคันรถอย่างน้อย 1 คัน' using errcode = 'P0001';
  end if;

  select * into v_company from wholesale_company where id = p_company_id and is_active;
  if not found then
    raise exception 'ไม่พบบริษัทขายส่ง (หรือปิดใช้งานแล้ว)' using errcode = 'P0002';
  end if;
  v_credit := coalesce(v_company.credit_days, 0);

  -- ล็อกทุกคันก่อน แล้วค่อยตรวจ — กันขายซ้ำแม้เปิดพร้อมกัน (แบบเดียวกับ sell_unit)
  for ln in select * from jsonb_array_elements(p_lines)
  loop
    v_unit  := (ln ->> 'unit_id')::uuid;
    v_price := coalesce((ln ->> 'price')::numeric, 0);
    if v_price <= 0 then
      raise exception 'ราคาขายส่งต้องมากกว่า 0' using errcode = 'P0001';
    end if;

    select branch_id, cost, status into v_ubranch, v_cost, v_status
      from motorcycle_unit where id = v_unit for update;
    if not found then
      raise exception 'ไม่พบรถคันที่เลือก' using errcode = 'P0002';
    end if;
    if v_status <> 'available' then
      raise exception 'รถคันหนึ่งไม่พร้อมขาย (สถานะ %)', v_status using errcode = 'P0001';
    end if;
    if not (is_all_branch() or v_ubranch in (select my_branches())) then
      raise exception 'ไม่มีสิทธิ์ขายรถสาขานี้' using errcode = '42501';
    end if;

    -- ทุกคันในบิลเดียวต้องอยู่บริษัทเดียวกัน (เลขบิลและเงินค้างรับผูกกับบริษัท)
    if v_branch is null then
      v_branch := v_ubranch;
    elsif v_branch <> v_ubranch then
      raise exception 'บิลเดียวต้องเป็นรถของบริษัทเดียวกันทั้งหมด' using errcode = 'P0001';
    end if;

    v_total    := v_total + v_price;
    v_cost_tot := v_cost_tot + coalesce(v_cost, 0);
    v_count    := v_count + 1;
  end loop;

  if v_company.branch_id is not null and v_company.branch_id <> v_branch then
    raise exception 'บริษัทขายส่งนี้ไม่ได้ผูกกับบริษัทของรถที่เลือก' using errcode = 'P0001';
  end if;

  v_no := next_doc_no(v_branch, 'WHOLESALE', v_year);

  insert into wholesale_order (branch_id, company_id, order_no, sold_at, salesperson_id, total, cost_total, gross_profit, note)
  values (v_branch, p_company_id, v_no, current_date, v_uid, v_total, v_cost_tot, v_total - v_cost_tot, nullif(btrim(p_note), ''))
  returning id into v_order;

  for ln in select * from jsonb_array_elements(p_lines)
  loop
    v_unit  := (ln ->> 'unit_id')::uuid;
    v_price := coalesce((ln ->> 'price')::numeric, 0);
    select cost into v_cost from motorcycle_unit where id = v_unit;

    insert into wholesale_order_line (order_id, unit_id, price, cost)
    values (v_order, v_unit, v_price, coalesce(v_cost, 0));

    update motorcycle_unit set status = 'sold' where id = v_unit;
  end loop;

  -- ขายเชื่อ → ตั้งเงินค้างรับให้เห็นในหน้ารอรับเงินเหมือนไฟแนนซ์
  if v_credit > 0 then
    insert into receivable (branch_id, sale_id, kind, amount_due, due_at)
    values (v_branch, null, 'wholesale', v_total, current_date + v_credit);
  end if;

  return jsonb_build_object('order_id', v_order, 'order_no', v_no, 'units', v_count, 'total', v_total);
end $$;

revoke all on function sell_wholesale(uuid, jsonb, text) from anon, public;
grant execute on function sell_wholesale(uuid, jsonb, text) to authenticated;

comment on function sell_wholesale is 'บันทึกขายส่ง atomic: หัวบิล + รายคัน + ตัดสต๊อก (+เงินค้างรับถ้าขายเชื่อ) · กันขายซ้ำด้วย row lock + unique(unit_id) (FAM-1127)';
