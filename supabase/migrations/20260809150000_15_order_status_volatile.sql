-- 15: แก้ pub.order_status ให้เรียกได้จริง
--
-- migration 14 ประกาศฟังก์ชันนี้เป็น stable แต่ตัวมันเองเขียนลง public_lookup_log
-- (เพื่อจำกัดอัตราและเก็บร่องรอย) Postgres จึงปฏิเสธทุกครั้งที่เรียก:
--     0A000 · INSERT is not allowed in a non-volatile function
-- พบตอนยิงจริงผ่าน PostgREST หลัง apply — ใน SQL editor ไม่มีทางเจอเพราะไม่ได้เรียกฟังก์ชัน
--
-- volatile คือสิ่งที่ถูกต้องตั้งแต่แรก เพราะฟังก์ชันนี้มีผลข้างเคียงจริง
-- เนื้อในเหมือน migration 14 ทุกบรรทัด ต่างแค่คำเดียว

create or replace function pub.order_status(p_token text)
returns jsonb language plpgsql volatile security definer
set search_path = public
as $$
declare r record; v_ip text; v_h text; v_n int; v_status text;
begin
  v_ip := split_part(coalesce(current_setting('request.headers', true)::json ->> 'x-forwarded-for',''), ',', 1);
  v_h  := encode(extensions.digest(coalesce(nullif(v_ip,''),'-'), 'sha256'), 'hex');

  select count(*) into v_n from public.public_lookup_log
   where ip_hash = v_h and at > now() - interval '1 hour';
  if v_n > 20 then raise exception 'ขอข้อมูลถี่เกินไป กรุณารอสักครู่'; end if;
  insert into public.public_lookup_log(ip_hash) values (v_h);

  select s.id, s.pay_method, g.stage, g.due_at, g.plate_no, g.delivered_at,
         c.full_name, c.phone, b.name as shop, b.phone as shop_phone,
         mv.model_name, mv.model_th, mc.color_name, f.status as fin_status
    into r
    from public.sale s
    join public.customer c        on c.id = s.customer_id
    join public.branch b          on b.id = s.branch_id
    join public.motorcycle_unit u on u.id = s.unit_id
    join public.model_variant mv  on mv.id = u.variant_id
    left join public.model_color mc on mc.variant_id = u.variant_id and mc.color_code = u.color_code
    left join public.registration g on g.sale_id = s.id
    left join public.finance_case f on f.sale_id = s.id
   where s.public_token = upper(trim(p_token))
     and s.voided_at is null
     and (s.public_expires_at is null or s.public_expires_at > now());

  if not found then return jsonb_build_object('found', false); end if;

  update public.public_lookup_log set hit = true
   where id = (select max(id) from public.public_lookup_log where ip_hash = v_h);

  v_status := case
    when r.delivered_at is not null then 'ส่งมอบรถแล้ว'
    when r.fin_status = 'ปฏิเสธ'    then 'กรุณาติดต่อร้าน'
    when r.fin_status is not null and r.fin_status <> 'อนุมัติแล้ว'
                                    then 'กำลังดำเนินการเรื่องสินเชื่อ'
    else 'กำลังดำเนินการเรื่องทะเบียน' end;

  return jsonb_build_object(
    'found',    true,
    'status',   v_status,
    'model',    r.model_name,
    'model_th', coalesce(r.model_th,''),
    'color',    coalesce(r.color_name,''),
    'plate',    r.plate_no,
    'due_at',   r.due_at,
    'delivered_at', r.delivered_at,
    'customer', jsonb_build_object(
        'name',  split_part(r.full_name, ' ', 1),
        'phone', 'xxx-xxx-' || right(regexp_replace(coalesce(r.phone,''), '\D', '', 'g'), 4)),
    'shop',     jsonb_build_object('name', r.shop, 'phone', r.shop_phone));
end $$;

revoke all    on function pub.order_status(text) from public;
grant execute on function pub.order_status(text) to anon, authenticated;

-- ── เปิดสคีมา pub ให้ PostgREST เห็น ──────────────────────────────────
-- ปกติตั้งที่ Settings → API → Exposed schemas แต่ตั้งที่นี่ได้เหมือนกันและติดถาวร
-- ค่าที่ตั้งกับ role ชนะค่าในไฟล์ config ของ PostgREST
-- *** ถ้าวันหลังไปแก้ Exposed schemas ในหน้าเว็บแล้วไม่มีผล ให้กลับมาดูบรรทัดนี้ ***
alter role authenticator set pgrst.db_schemas = 'public, graphql_public, pub';
notify pgrst, 'reload config';
notify pgrst, 'reload schema';
