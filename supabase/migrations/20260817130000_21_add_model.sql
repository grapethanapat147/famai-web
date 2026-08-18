-- 21 · add_model (FAM-1025): เพิ่มรุ่นรถแบบ atomic (variant + colors + price ในทรานแซกชันเดียว)
-- แทน 3 insert + cleanup best-effort ในโค้ด → ถ้าพลาดกลางคัน rollback ทั้งหมด (ไม่มีรุ่นค้างครึ่งใบ)
-- security definer → เช็คสิทธิ์ admin เอง (ตารางอ้างอิงแก้ได้เฉพาะ is_admin)

create or replace function add_model(
  p_code       text,
  p_model_name text,
  p_model_th   text,
  p_category   text,
  p_cc         numeric,
  p_year       int,
  p_colors     jsonb,
  p_cost       numeric,
  p_vat        numeric,
  p_retail     numeric
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
  c    jsonb;
  n    int := 0;
begin
  if not is_admin() then
    raise exception 'ไม่มีสิทธิ์เพิ่มรุ่น (ต้องเป็นแอดมิน)' using errcode = '42501';
  end if;
  if nullif(btrim(p_code), '') is null or nullif(btrim(p_model_name), '') is null then
    raise exception 'กรอกรหัสรุ่นและชื่อรุ่น' using errcode = 'P0001';
  end if;
  if p_retail is null or p_retail <= 0 then
    raise exception 'ราคาขายไม่ถูกต้อง' using errcode = 'P0001';
  end if;

  insert into model_variant (code, model_name, model_th, category, cc, model_year)
  values (btrim(p_code), btrim(p_model_name), nullif(btrim(p_model_th), ''), nullif(btrim(p_category), ''), p_cc, p_year)
  returning id into v_id;

  for c in select jsonb_array_elements(coalesce(p_colors, '[]'::jsonb))
  loop
    if nullif(btrim(c ->> 'code'), '') is not null then
      insert into model_color (variant_id, color_code, color_name)
      values (v_id, btrim(c ->> 'code'), btrim(coalesce(c ->> 'name', '')));
      n := n + 1;
    end if;
  end loop;
  if n = 0 then
    raise exception 'ต้องมีอย่างน้อย 1 สี' using errcode = 'P0001';
  end if;

  insert into price_history (variant_id, effective_from, cost, vat, retail, source)
  values (v_id, current_date, coalesce(p_cost, 0), coalesce(p_vat, 0), p_retail, 'เพิ่มด้วยมือ (หน้ารุ่นรถและสี)');

  return v_id;
end $$;

revoke all on function add_model(text, text, text, text, numeric, int, jsonb, numeric, numeric, numeric) from anon, public;
grant execute on function add_model(text, text, text, text, numeric, int, jsonb, numeric, numeric, numeric) to authenticated;

comment on function add_model is 'เพิ่มรุ่นรถ atomic: model_variant + model_color[] + price_history · gate is_admin · rollback ถ้าพลาด';
