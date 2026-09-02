-- 35 · ใบกำกับภาษีของบิลขายส่ง + ยกเลิกบิล (FAM-1128 · ต่อจาก fixlist ข้อ 12)
--
-- document เดิมผูกได้กับ sale หรือ service_job เท่านั้น — บิลขายส่งไม่ใช่ทั้งสองอย่าง

alter table document
  add column if not exists wholesale_order_id uuid references wholesale_order(id);

-- migration 34 สร้างเงินค้างรับของขายส่งโดยไม่มีทางโยงกลับไปหาบิล (sale_id เป็น null เฉย ๆ)
-- ทำให้ยกเลิกบิลแล้วหาเงินค้างรับของบิลนั้นไม่เจอ · เติมคอลัมน์ + ให้ sell_wholesale เขียนด้วย
alter table receivable
  add column if not exists wholesale_order_id uuid references wholesale_order(id);

comment on column receivable.wholesale_order_id is 'เงินค้างรับจากบิลขายส่ง (FAM-1128)';

create index if not exists receivable_wholesale_idx on receivable (wholesale_order_id);

comment on column document.wholesale_order_id is 'เอกสารของบิลขายส่ง (FAM-1128) — ใช้แทน sale_id';

-- หนึ่งบิลขายส่งมีเอกสารแต่ละชนิดได้ใบเดียว (ที่ยังไม่ยกเลิก)
create unique index if not exists document_wholesale_type_key
  on document (wholesale_order_id, doc_type)
  where wholesale_order_id is not null and voided_at is null;

-- ── ยกเลิกบิลขายส่ง: คืนรถเข้าสต๊อก + ล้างเงินค้างรับ ในทรานแซกชันเดียว ─────────
create or replace function void_wholesale_order(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_order  record;
  v_units  int;
begin
  if v_uid is null then
    raise exception 'ยังไม่ได้ล็อกอิน' using errcode = '42501';
  end if;
  if not is_manager() then
    raise exception 'ยกเลิกบิลขายส่งได้เฉพาะผู้ดูแล / ผู้บริหาร' using errcode = '42501';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'ต้องระบุเหตุผลที่ยกเลิก' using errcode = 'P0001';
  end if;

  select * into v_order from wholesale_order where id = p_order_id for update;
  if not found then
    raise exception 'ไม่พบบิลขายส่ง' using errcode = 'P0002';
  end if;
  if v_order.voided_at is not null then
    raise exception 'บิลนี้ถูกยกเลิกไปแล้ว' using errcode = 'P0001';
  end if;
  if not (is_all_branch() or v_order.branch_id in (select my_branches())) then
    raise exception 'ไม่มีสิทธิ์บิลของบริษัทนี้' using errcode = '42501';
  end if;

  -- ออกเอกสารไปแล้วต้องยกเลิกเอกสารก่อน — ไม่งั้นจะมีใบกำกับของบิลที่ไม่มีอยู่จริง
  if exists (select 1 from document where wholesale_order_id = p_order_id and voided_at is null) then
    raise exception 'บิลนี้ออกเอกสารไปแล้ว — ยกเลิกเอกสารก่อนจึงยกเลิกบิลได้' using errcode = 'P0001';
  end if;

  -- คืนรถเข้าสต๊อก (เฉพาะคันที่ยังเป็น sold จากบิลนี้ — ถ้าถูกขายต่อไปแล้วอย่าไปแตะ)
  update motorcycle_unit u
     set status = 'available'
   where u.id in (select unit_id from wholesale_order_line where order_id = p_order_id)
     and u.status = 'sold';
  get diagnostics v_units = row_count;

  -- ล้างเงินค้างรับของบิลนี้ที่ยังไม่มีการรับเงิน (รับเงินไปแล้วต้องตัดสินใจเอง)
  delete from receivable r
   where r.wholesale_order_id = p_order_id
     and r.amount_paid = 0;

  update wholesale_order
     set voided_at = now(), voided_reason = btrim(p_reason)
   where id = p_order_id;

  return jsonb_build_object('order_no', v_order.order_no, 'units_restored', v_units);
end $$;

revoke all on function void_wholesale_order(uuid, text) from anon, public;
grant execute on function void_wholesale_order(uuid, text) to authenticated;

comment on function void_wholesale_order is 'ยกเลิกบิลขายส่ง: คืนรถเข้าสต๊อก + ล้างเงินค้างรับที่ยังไม่ได้รับเงิน (FAM-1128)';

-- sell_wholesale เดิมเขียนเงินค้างรับโดยไม่ผูกกับบิล — แก้ให้ผูก
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

  if v_credit > 0 then
    insert into receivable (branch_id, sale_id, wholesale_order_id, kind, amount_due, due_at)
    values (v_branch, null, v_order, 'wholesale', v_total, current_date + v_credit);
  end if;

  return jsonb_build_object('order_id', v_order, 'order_no', v_no, 'units', v_count, 'total', v_total);
end $$;

revoke all on function sell_wholesale(uuid, jsonb, text) from anon, public;
grant execute on function sell_wholesale(uuid, jsonb, text) to authenticated;
