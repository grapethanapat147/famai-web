-- 32 · ฟอร์มขายใช้ของแถมจากตารางจริง + ตัดสต๊อก (FAM-1123 · fixlist ข้อ 05)
--
-- เดิม: ฟอร์มขายมีรายการของแถมพิมพ์ตายตัวในโค้ด (หมวก/พ.ร.บ./ผ้าคลุม/น้ำมันเครื่อง)
--       คนละชุดกับตาราง freebie ที่หน้าคลังใช้จัดการ
--       ผล: แจกของแถมไปแล้วสต๊อกไม่ถูกตัด · ไม่มีบันทึกว่าการขายไหนแถมอะไร (sale_freebie ว่างตลอด)
--
-- ใหม่: sell_unit รับ p_freebie_ids (uuid[]) แล้วทำ 3 อย่างในทรานแซกชันเดียวกับการขาย
--       1) คิดต้นทุนของแถมจาก freebie.cost ฝั่งเซิร์ฟเวอร์ (ไม่เชื่อยอดที่เบราว์เซอร์ส่งมา)
--       2) บันทึก sale_freebie ว่าการขายนี้แถมอะไรไปบ้าง ราคาทุนเท่าไหร่ ณ วันนั้น
--       3) ตัด freebie.qty_on_hand
--
-- ของไม่พอ → ขึ้น error บอกชื่อของชิ้นนั้น (ฟอร์มโชว์จำนวนคงเหลือไว้แล้ว ปกติจะไม่ชนด่านนี้)
-- ไม่ส่ง p_freebie_ids มา → ใช้ p_freebie_cost เหมือนเดิม (ของเก่ายังเรียกได้)

drop function if exists sell_unit(uuid, text, text, text, numeric, numeric, numeric, numeric, int, uuid, text, uuid);

create or replace function sell_unit(
  p_unit_id        uuid,
  p_customer_name  text,
  p_customer_phone text,
  p_pay_method     text,
  p_list_price     numeric,
  p_discount       numeric,
  p_freebie_cost   numeric,
  p_down_payment   numeric,
  p_term_months    int,
  p_finance_id     uuid,
  p_note           text,
  p_customer_id    uuid default null,
  p_freebie_ids    uuid[] default null
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid         uuid := auth.uid();
  v_branch      uuid;
  v_cost        numeric;
  v_status      text;
  v_name        text := nullif(btrim(p_customer_name), '');
  v_phone       text := nullif(btrim(p_customer_phone), '');
  v_net         numeric;
  v_fb          numeric := coalesce(p_freebie_cost, 0);
  v_is_cost     boolean := coalesce((select value #>> '{}' from app_setting where key = 'freebie_is_cost') = 'true', true);
  v_gross       numeric;
  v_customer    uuid;
  v_cust_branch uuid;
  v_sale        uuid;
  v_doc         text;
  v_year        int := extract(year from now())::int + 543;
  v_financed    numeric;
  v_reg_days    int;
  v_ar_days     int;
  v_svc_days    int;
  v_first_km    int;
  v_ids         uuid[] := coalesce(p_freebie_ids, array[]::uuid[]);
  fb            record;
  d             text;
begin
  if v_uid is null then
    raise exception 'ยังไม่ได้ล็อกอิน' using errcode = '42501';
  end if;
  if p_customer_id is null and v_name is null then
    raise exception 'ต้องระบุชื่อลูกค้า' using errcode = 'P0001';
  end if;
  if p_pay_method not in ('cash', 'finance') then
    raise exception 'วิธีชำระไม่ถูกต้อง' using errcode = 'P0001';
  end if;
  if p_pay_method = 'finance' and p_finance_id is null then
    raise exception 'เงินผ่อนต้องเลือกบริษัทไฟแนนซ์' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from app_user_role ur join role r on r.id = ur.role_id
    where ur.user_id = v_uid and r.code in ('admin', 'manager', 'sales')
  ) then
    raise exception 'ไม่มีสิทธิ์ขายรถ' using errcode = '42501';
  end if;

  select branch_id, cost, status into v_branch, v_cost, v_status
    from motorcycle_unit where id = p_unit_id for update;
  if not found then
    raise exception 'ไม่พบรถคันนี้' using errcode = 'P0002';
  end if;
  if v_status <> 'available' then
    raise exception 'รถคันนี้ไม่พร้อมขาย (สถานะ %)', v_status using errcode = 'P0001';
  end if;

  if not (is_all_branch() or v_branch in (select my_branches())) then
    raise exception 'ไม่มีสิทธิ์ขายรถสาขานี้' using errcode = '42501';
  end if;

  -- ของแถมจากตารางจริง: ล็อกแถว เช็คบริษัท+จำนวน แล้วคิดต้นทุนเอง (ไม่เชื่อ client)
  if array_length(v_ids, 1) is not null then
    v_fb := 0;
    for fb in
      select id, name, cost, qty_on_hand, branch_id
        from freebie where id = any(v_ids) order by id for update
    loop
      if fb.branch_id <> v_branch then
        raise exception 'ของแถม "%" ไม่ได้อยู่บริษัทเดียวกับรถ', fb.name using errcode = 'P0001';
      end if;
      if fb.qty_on_hand < 1 then
        raise exception 'ของแถม "%" หมดสต๊อก', fb.name using errcode = 'P0001';
      end if;
      v_fb := v_fb + fb.cost;
    end loop;
  end if;

  v_net := greatest(0, coalesce(p_list_price, 0) - coalesce(p_discount, 0));
  v_gross := v_net - v_cost - (case when v_is_cost then v_fb else 0 end);

  if p_customer_id is not null then
    select branch_id into v_cust_branch from customer where id = p_customer_id;
    if not found then
      raise exception 'ไม่พบลูกค้าที่เลือก' using errcode = 'P0002';
    end if;
    if not (is_all_branch() or v_cust_branch in (select my_branches())) then
      raise exception 'ไม่มีสิทธิ์ใช้ข้อมูลลูกค้ารายนี้' using errcode = '42501';
    end if;
    v_customer := p_customer_id;
    update customer
       set phone = coalesce(phone, v_phone),
           stage = 'ปิดการขาย'
     where id = v_customer;
  else
    insert into customer (branch_id, full_name, phone, stage, owner_id, source)
    values (v_branch, v_name, v_phone, 'ปิดการขาย', v_uid, 'ขายหน้าร้าน')
    returning id into v_customer;
  end if;

  v_doc := next_doc_no(v_branch, 'TAXINV', v_year);

  insert into sale (branch_id, unit_id, customer_id, salesperson_id, sold_at,
    list_price, discount, net_price, cost, freebie_cost, gross_profit,
    pay_method, down_payment, term_months, finance_id, doc_no, note)
  values (v_branch, p_unit_id, v_customer, v_uid, current_date,
    coalesce(p_list_price, 0), coalesce(p_discount, 0), v_net, v_cost, v_fb, v_gross,
    p_pay_method, p_down_payment, p_term_months, p_finance_id, v_doc, nullif(btrim(p_note), ''))
  returning id into v_sale;

  update motorcycle_unit set status = 'sold' where id = p_unit_id;

  -- ข้อ 05 — บันทึกว่าแถมอะไร + ตัดสต๊อกของแถม
  if array_length(v_ids, 1) is not null then
    insert into sale_freebie (sale_id, freebie_id, qty, cost_each)
    select v_sale, f.id, 1, f.cost from freebie f where f.id = any(v_ids);

    update freebie set qty_on_hand = qty_on_hand - 1 where id = any(v_ids);
  end if;

  v_reg_days := coalesce(nullif(regexp_replace(
    coalesce((select value #>> '{}' from app_setting where key = 'reg_days'), '30'), '\D', '', 'g'), '')::int, 30);
  insert into registration (sale_id, branch_id, due_at)
  values (v_sale, v_branch, current_date + v_reg_days);

  if p_pay_method = 'finance' then
    v_financed := greatest(0, v_net - coalesce(p_down_payment, 0));
    insert into finance_case (branch_id, sale_id, customer_id, company_id, status, amount, submitted_at)
    values (v_branch, v_sale, v_customer, p_finance_id, 'ส่งเรื่อง', v_financed, current_date);

    if v_financed > 0 then
      v_ar_days := coalesce(nullif(regexp_replace(
        coalesce((select value #>> '{}' from app_setting where key = 'ar_due_days'), '30'), '\D', '', 'g'), '')::int, 30);
      insert into receivable (branch_id, sale_id, kind, payer_finance_id, amount_due, due_at)
      values (v_branch, v_sale, 'finance', p_finance_id, v_financed, current_date + v_ar_days);
    end if;
  end if;

  select km into v_first_km from (
    select jsonb_array_elements_text(
      coalesce((select value from app_setting where key = 'service_km'), '[]'::jsonb))::int as km
  ) s
  order by km
  limit 1;
  if v_first_km is not null then
    v_svc_days := coalesce(nullif(regexp_replace(
      coalesce((select value #>> '{}' from app_setting where key = 'service_first_days'), '30'), '\D', '', 'g'), '')::int, 30);
    insert into service_reminder (customer_id, unit_id, target_km, due_date)
    values (v_customer, p_unit_id, v_first_km, current_date + v_svc_days);
  end if;

  for d in
    select jsonb_array_elements_text(coalesce((select value from app_setting where key = 'follow_up_cadence'), '[]'::jsonb))
  loop
    insert into follow_up_task (branch_id, customer_id, sale_id, kind, due_at)
    values (v_branch, v_customer, v_sale, d || 'd', current_date + d::int);
  end loop;

  return jsonb_build_object('sale_id', v_sale, 'doc_no', v_doc, 'customer_id', v_customer);
end $$;

revoke all on function sell_unit(uuid, text, text, text, numeric, numeric, numeric, numeric, int, uuid, text, uuid, uuid[]) from anon, public;
grant execute on function sell_unit(uuid, text, text, text, numeric, numeric, numeric, numeric, int, uuid, text, uuid, uuid[]) to authenticated;

comment on function sell_unit is 'บันทึกการขาย atomic: ลูกค้า+บิลขาย+ทะเบียน+เคสสินเชื่อ+เงินค้างรับ+เตือนเช็กระยะ+งานติดตาม+ของแถม(ตัดสต๊อก) · กันขายซ้ำ · คิดต้นทุน/กำไร/ต้นทุนของแถมฝั่งเซิร์ฟเวอร์';
