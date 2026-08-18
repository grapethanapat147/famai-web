-- 20 · sell_unit (FAM-1011/1023): บันทึกการขายแบบ atomic ใน transaction เดียว
--   1) สร้างลูกค้า walk-in จากชื่อ/เบอร์
--   2) ล็อกแถวรถ + เช็คสถานะ (กันขายซ้ำแม้เปิดพร้อมกัน) + unique index กันบิลซ้ำต่อคัน
--   3) insert sale — ต้นทุน/กำไรคิดฝั่งเซิร์ฟเวอร์ (ไม่เชื่อ client · ปลอดภัยกับ role ที่ไม่เห็น money)
--   4) set unit = sold
--   5) §9f: ทุกการขายสร้างงานทะเบียน · เงินผ่อน → เปิดเคสสินเชื่อ · งานติดตามจาก settings
-- security definer → bypass RLS จึงเช็คสิทธิ์เอง (role ขาย + สาขา)

-- ด่านโครงสร้าง: 1 คันมีบิลขายที่ยังไม่ยกเลิกได้ครั้งเดียว (กันขายซ้ำระดับ DB)
create unique index if not exists sale_unit_active_uniq on sale (unit_id) where voided_at is null;

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
  p_note           text
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_branch   uuid;
  v_cost     numeric;
  v_status   text;
  v_name     text := nullif(btrim(p_customer_name), '');
  v_net      numeric;
  v_fb       numeric := coalesce(p_freebie_cost, 0);
  v_is_cost  boolean := coalesce((select value #>> '{}' from app_setting where key = 'freebie_is_cost') = 'true', true);
  v_gross    numeric;
  v_customer uuid;
  v_sale     uuid;
  v_doc      text;
  v_year     int := extract(year from now())::int + 543;
  v_financed numeric;
  d          text;
begin
  if v_uid is null then
    raise exception 'ยังไม่ได้ล็อกอิน' using errcode = '42501';
  end if;
  if v_name is null then
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

  -- ลูกค้า walk-in
  insert into customer (branch_id, full_name, phone, stage, owner_id, source)
  values (v_branch, v_name, nullif(btrim(p_customer_phone), ''), 'ปิดการขาย', v_uid, 'ขายหน้าร้าน')
  returning id into v_customer;

  v_doc := next_doc_no(v_branch, 'TAXINV', v_year);

  insert into sale (branch_id, unit_id, customer_id, salesperson_id, sold_at,
    list_price, discount, net_price, cost, freebie_cost, gross_profit,
    pay_method, down_payment, term_months, finance_id, doc_no, note)
  values (v_branch, p_unit_id, v_customer, v_uid, current_date,
    coalesce(p_list_price, 0), coalesce(p_discount, 0), v_net, v_cost, v_fb, v_gross,
    p_pay_method, p_down_payment, p_term_months, p_finance_id, v_doc, nullif(btrim(p_note), ''))
  returning id into v_sale;

  update motorcycle_unit set status = 'sold' where id = p_unit_id;

  -- §9f: ทุกการขายสร้างงานทะเบียน
  insert into registration (sale_id, branch_id) values (v_sale, v_branch);

  -- เงินผ่อน → เปิดเคสสินเชื่อ
  if p_pay_method = 'finance' then
    v_financed := greatest(0, v_net - coalesce(p_down_payment, 0));
    insert into finance_case (branch_id, sale_id, customer_id, company_id, status, amount, submitted_at)
    values (v_branch, v_sale, v_customer, p_finance_id, 'ส่งเรื่อง', v_financed, current_date);
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

revoke all on function sell_unit(uuid, text, text, text, numeric, numeric, numeric, numeric, int, uuid, text) from anon, public;
grant execute on function sell_unit(uuid, text, text, text, numeric, numeric, numeric, numeric, int, uuid, text) to authenticated;

comment on function sell_unit is 'บันทึกการขาย atomic: ลูกค้า+บิลขาย+ทะเบียน(+สินเชื่อ)+งานติดตาม · กันขายซ้ำ (row lock + unique index) · คิดต้นทุน/กำไรฝั่งเซิร์ฟเวอร์';
