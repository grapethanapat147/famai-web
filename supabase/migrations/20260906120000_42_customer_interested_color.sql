-- FAM-1150 — ลีดเลือก "สีที่สนใจ" ได้ ไม่ใช่แค่รุ่น
--
-- ปัญหาเดิม: ดรอปดาวน์ "รุ่นที่สนใจ" ดึงมาแค่ model_name ทำให้ขึ้นชื่อซ้ำกันหลายบรรทัด
-- (FINN 4 บรรทัด · Grand Filano Hybrid 2 บรรทัด · NMAX 2 บรรทัด) เพราะหลาย "รุ่นย่อย"
-- ใช้ชื่อรุ่นเดียวกัน ต่างกันที่ code/สเปก — เซลล์เลือกไม่ถูกว่าอันไหนคืออันไหน
-- และไม่มีที่ให้บันทึกว่าลูกค้าสนใจ "สี" ไหน ทั้งที่เป็นข้อมูลที่ถามลูกค้าตั้งแต่ต้น

alter table customer add column if not exists interested_color_code text;

comment on column customer.interested_color_code is
  'สีที่ลูกค้าสนใจ (คู่กับ interested_variant_id) — ใช้ตอนเลือกคันจริงในหน้าขายรถ (FAM-1150)';

-- ต้องเป็นสีที่มีจริงของรุ่นนั้นเท่านั้น · แถวที่คอลัมน์ใดคอลัมน์หนึ่งเป็น null จะไม่ถูกบังคับ (MATCH SIMPLE)
-- จึงยังบันทึก "สนใจรุ่นแต่ยังไม่เลือกสี" ได้ตามปกติ
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customer_interested_color_fk') then
    alter table customer
      add constraint customer_interested_color_fk
      foreign key (interested_variant_id, interested_color_code)
      references model_color (variant_id, color_code);
  end if;
end $$;
