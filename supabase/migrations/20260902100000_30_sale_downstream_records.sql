-- 30 · ขายรถแล้วต้องสร้างข้อมูลปลายทางให้ครบ (FAM-1115 · fixlist ข้อ 01/02/03)
--
-- เดิม sell_unit สร้าง: ลูกค้า + บิลขาย + งานทะเบียน (+เคสไฟแนนซ์) + งานติดตาม
-- แต่ไม่เคยสร้าง 3 อย่างนี้ ทำให้หน้าจอที่รออ่านมันว่างตลอดกาล:
--   01) receivable            → หน้ารอรับเงิน + การ์ดยอดค้าง ว่างเสมอ ไม่รู้ไฟแนนซ์ค้างจ่ายเท่าไหร่
--   02) service_reminder      → cron เตือนเช็กระยะอ่านเจอแต่ตารางเปล่า ไม่เคยเตือนสักครั้ง
--   03) registration.due_at   → cron เตือนทะเบียนใกล้ครบกำหนดไม่เคยทำงาน ลูกค้าปล่อยทะเบียนขาดได้
--
-- ค่าที่ใช้ตั้งกำหนดมาจาก app_setting ทั้งหมด (ไม่ฝังตัวเลขในโค้ด)

-- ค่าตั้งใหม่ 2 ตัว (ไม่ทับของเดิมถ้ามีแล้ว)
insert into app_setting (key, value) values
  ('ar_due_days', '30'::jsonb),
  ('service_first_days', '30'::jsonb)
on conflict (key) do nothing;

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
  p_customer_id    uuid default null
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
  d             text;
begin
  if v_uid is null then
    raise exception 'ยังไม่ได้ล็อกอิน' using errcode = '42501';
  end if;
  -- ชื่อบังคับเฉพาะตอนสร้างลูกค้าใหม่ (เลือกลูกค้าเดิมใช้ชื่อจากระเบียนเดิม)
  if p_customer_id is null and v_name is null then
    raise exception 'ต้องระบุชื่อลูกค้า' using errcode = 'P0001';
  end if;
  if p_pay_method not in ('cash', 'finance') then
    raise exception 'วิธีชำระไม่ถูกต้อง' using errcode = 'P0001';
  end if;
  if p_pay_method = 'finance' and p_finance_id is null then
    raise exception 'เงินผ่อนต้องเลือกบริษัทไฟแนนซ์' using errcode = 'P0001';
  end if;

  -- ต้องมี role ขาย (admin/manager/sales)
  if not exists (
    select 1 from app_user_role ur join role r on r.id = ur.role_id
    where ur.user_id = v_uid and r.code in ('admin', 'manager', 'sales')
  ) then
    raise exception 'ไม่มีสิทธิ์ขายรถ' using errcode = '42501';
  end if;

  -- ล็อกคัน + เช็คสถานะ (กันขายซ้ำแม้เปิดพร้อมกัน)
  select branch_id, cost, status into v_branch, v_cost, v_status
    from motorcycle_unit where id = p_unit_id for update;
  if not found then
    raise exception 'ไม่พบรถคันนี้' using errcode = 'P0002';
  end if;
  if v_status <> 'available' then
    raise exception 'รถคันนี้ไม่พร้อมขาย (สถานะ %)', v_status using errcode = 'P0001';
  end if;

  -- สิทธิ์สาขา (security definer ข้าม RLS จึงเช็คเอง)
  if not (is_all_branch() or v_branch in (select my_branches())) then
    raise exception 'ไม่มีสิทธิ์ขายรถสาขานี้' using errcode = '42501';
  end if;

  -- คิดเงินฝั่งเซิร์ฟเวอร์จากต้นทุนจริงของรถ
  v_net := greatest(0, coalesce(p_list_price, 0) - coalesce(p_discount, 0));
  v_gross := v_net - v_cost - (case when v_is_cost then v_fb else 0 end);

  if p_customer_id is not null then
    -- ลูกค้าเดิม — ตรวจว่ามีจริงและอยู่ในบริษัทที่ผู้ใช้เข้าถึงได้ (security definer ข้าม RLS)
    select branch_id into v_cust_branch from customer where id = p_customer_id;
    if not found then
      raise exception 'ไม่พบลูกค้าที่เลือก' using errcode = 'P0002';
    end if;
    if not (is_all_branch() or v_cust_branch in (select my_branches())) then
      raise exception 'ไม่มีสิทธิ์ใช้ข้อมูลลูกค้ารายนี้' using errcode = '42501';
    end if;
    v_customer := p_customer_id;
    -- เติมเบอร์ให้เฉพาะกรณีระเบียนเดิมยังว่าง (coalesce = ไม่ทับข้อมูลเดิม) + อัปเดตขั้นเป็นปิดการขาย
    update customer
       set phone = coalesce(phone, v_phone),
           stage = 'ปิดการขาย'
     where id = v_customer;
  else
    -- ลูกค้าใหม่ (walk-in)
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

  -- §9f: ทุกการขายสร้างงานทะเบียน · ข้อ 03 — ตั้งวันครบกำหนดจาก settings reg_days
  v_reg_days := coalesce(nullif(regexp_replace(
    coalesce((select value #>> '{}' from app_setting where key = 'reg_days'), '30'), '\D', '', 'g'), '')::int, 30);
  insert into registration (sale_id, branch_id, due_at)
  values (v_sale, v_branch, current_date + v_reg_days);

  -- เงินผ่อน → เปิดเคสสินเชื่อ + ข้อ 01 ตั้งเงินค้างรับจากไฟแนนซ์
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

  -- ข้อ 02 — เตือนเช็กระยะครั้งแรก (ระยะแรกใน settings service_km) ไม่มีค่าตั้ง = ไม่สร้าง
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

  -- งานติดตามจาก settings follow_up_cadence (best-effort)
  for d in
    select jsonb_array_elements_text(coalesce((select value from app_setting where key = 'follow_up_cadence'), '[]'::jsonb))
  loop
    insert into follow_up_task (branch_id, customer_id, sale_id, kind, due_at)
    values (v_branch, v_customer, v_sale, d || 'd', current_date + d::int);
  end loop;

  return jsonb_build_object('sale_id', v_sale, 'doc_no', v_doc, 'customer_id', v_customer);
end $$;

revoke all on function sell_unit(uuid, text, text, text, numeric, numeric, numeric, numeric, int, uuid, text, uuid) from anon, public;
grant execute on function sell_unit(uuid, text, text, text, numeric, numeric, numeric, numeric, int, uuid, text, uuid) to authenticated;

comment on function sell_unit is 'บันทึกการขาย atomic: ลูกค้า(ใหม่/เดิม)+บิลขาย+ทะเบียน(มีวันครบกำหนด)+เคสสินเชื่อ+เงินค้างรับ+เตือนเช็กระยะ+งานติดตาม · กันขายซ้ำ (row lock + unique index) · คิดต้นทุน/กำไรฝั่งเซิร์ฟเวอร์';

-- ===== ข้อ 02 (ครึ่งหลัง) · ปิดใบงานซ่อมแล้วตั้งรอบเช็กระยะถัดไป =====
-- ปิดงานที่ระยะ 500 → ตั้งรอบถัดไปที่ 1,000 โดยดูจาก service_km · ถึงระยะสุดท้ายแล้วหยุด
create or replace function next_service_reminder(p_job_id uuid)
returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_customer uuid;
  v_unit     uuid;
  v_branch   uuid;
  v_odo      int;
  v_next_km  int;
  v_svc_days int;
  v_new      uuid;
begin
  if v_uid is null then
    raise exception 'ยังไม่ได้ล็อกอิน' using errcode = '42501';
  end if;

  select customer_id, unit_id, branch_id, odometer_km
    into v_customer, v_unit, v_branch, v_odo
    from service_job where id = p_job_id;
  if not found then
    raise exception 'ไม่พบใบงานซ่อม' using errcode = 'P0002';
  end if;
  if not (is_all_branch() or v_branch in (select my_branches())) then
    raise exception 'ไม่มีสิทธิ์ใบงานสาขานี้' using errcode = '42501';
  end if;
  if v_customer is null then
    return null; -- รถนอก ไม่มีลูกค้าในระบบ = ไม่ต้องตั้งเตือน
  end if;

  -- ปิดรอบที่ถึงกำหนดแล้วของคันนี้
  update service_reminder
     set status = 'เช็กแล้ว'
   where customer_id = v_customer
     and (unit_id = v_unit or (unit_id is null and v_unit is null))
     and status <> 'เช็กแล้ว';

  -- ระยะถัดไป = ค่าแรกใน service_km ที่มากกว่าเลขไมล์ปัจจุบัน
  select km into v_next_km from (
    select jsonb_array_elements_text(
      coalesce((select value from app_setting where key = 'service_km'), '[]'::jsonb))::int as km
  ) s
  where km > coalesce(v_odo, 0)
  order by km
  limit 1;

  if v_next_km is null then
    return null; -- เลยระยะสุดท้ายแล้ว
  end if;

  v_svc_days := coalesce(nullif(regexp_replace(
    coalesce((select value #>> '{}' from app_setting where key = 'service_first_days'), '30'), '\D', '', 'g'), '')::int, 30);

  insert into service_reminder (customer_id, unit_id, target_km, due_date)
  values (v_customer, v_unit, v_next_km, current_date + v_svc_days)
  returning id into v_new;

  return v_new;
end $$;

revoke all on function next_service_reminder(uuid) from anon, public;
grant execute on function next_service_reminder(uuid) to authenticated;

comment on function next_service_reminder is 'ปิดใบงานซ่อมแล้วตั้งรอบเช็กระยะถัดไปจาก settings service_km (FAM-1115)';
