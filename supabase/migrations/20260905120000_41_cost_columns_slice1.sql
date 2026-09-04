-- FAM-1147 — ปิดคอลัมน์ต้นทุนชุดแรกที่ระดับฐานข้อมูล (ต่อจาก FAM-1145)
--
-- ชุดแรกนี้เลือกเฉพาะคอลัมน์ที่ปิดได้โดย "ไม่ต้องรื้อหน้าจอที่บทบาทไม่มีสิทธิ์เงินเปิดใช้"
-- คอลัมน์ต้นทุนที่เหลือ (motorcycle_unit.cost · sale.gross_profit · part.cost · receivable ฯลฯ)
-- ถูกดึงอยู่ใน query ของหน้าที่เซลล์/สต๊อก/ช่างเปิด แล้วค่อยตัดทิ้งฝั่งเซิร์ฟเวอร์
-- ถอนสิทธิ์ตรง ๆ จะทำให้ query พังทั้งหน้า ต้องรื้อวิธีดึงข้อมูลก่อน — แยกเป็นตั๋วต่างหาก
--
-- 1) price_history.cost — RLS ของตารางนี้คือ `for select using (true)`
--    ทุกคนที่ล็อกอินอ่านราคาทุนของทุกรุ่นได้ตรง ๆ ผ่าน PostgREST
--    ในแอปมีหน้าเดียวที่อ่าน คือหน้ารุ่นรถ (เปิดให้ admin/manager ซึ่งมีสิทธิ์เงินทั้งคู่)
-- 2) motorcycle_unit.cost_vat — ในแอป "เขียนอย่างเดียว ไม่เคยอ่าน" (รับรถ + นำเข้าไฟล์)
--    ถอนสิทธิ์อ่านได้เลยโดยไม่ต้องแก้โค้ดสักบรรทัด

-- `vat` คือภาษีของราคาทุน รู้ค่านี้ก็ถอดกลับเป็นทุนได้ (ทุน = vat ÷ 0.07) จึงต้องปิดคู่กัน
-- ในแอปเขียนอย่างเดียวเหมือนกัน ไม่มีหน้าไหน select
revoke select (cost, vat) on public.price_history from authenticated;
revoke select (cost_vat) on public.motorcycle_unit from authenticated;

-- ทางเดียวที่จะอ่านราคาทุนของรุ่นได้ — เปิดให้เฉพาะผู้มีสิทธิ์เห็นตัวเงิน
-- price_history เป็นข้อมูลอ้างอิงกลาง (ไม่มี branch_id) จึงไม่ต้องกรองตามบริษัท
create or replace function price_history_cost()
returns table (variant_id uuid, effective_from date, cost numeric)
language sql stable security definer
set search_path = public
as $$
  select p.variant_id, p.effective_from, p.cost
    from price_history p
   where has_money()
$$;

comment on function price_history_cost() is
  'ราคาทุนตามประวัติราคาของแต่ละรุ่น — เปิดให้เฉพาะผู้มีสิทธิ์เห็นตัวเงิน (FAM-1147)';

revoke all on function price_history_cost() from public;
grant execute on function price_history_cost() to authenticated;

-- หมายเหตุ: ฐานข้อมูลรู้แค่ "สิทธิ์ตามบทบาท" ไม่รู้จัก "โหมดลูกค้า" (เป็น cookie ฝั่งแอป)
-- หน้าจอจึงยังต้องเรียก stripMoneyFields ตามเดิม — สองชั้นนี้ทำคนละหน้าที่ ห้ามถอดอันใดอันหนึ่งออก
