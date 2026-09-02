-- 33 · แยกเอกสารขายเงินผ่อนเป็น 3 ใบ (FAM-1126 · fixlist ข้อ 11)
--
-- เดิม: ขายเงินผ่อน 1 ครั้ง ออกเอกสารได้ใบเดียวเป็นยอดเต็มทั้งก้อน
--       ยอดเงินดาวน์กับยอดจัดไฟแนนซ์ปนกันในใบเดียว ออกให้ลูกค้ากับไฟแนนซ์ไม่ถูกต้อง
--
-- ใหม่: document.part บอกว่าเอกสารใบนี้เป็นส่วนไหนของการขาย
--       full     = ยอดเต็ม (เงินสด / เอกสารเก่าทั้งหมด)
--       down     = เงินดาวน์ (ผู้ซื้อ = ลูกค้า)
--       financed = ยอดจัดไฟแนนซ์ (ผู้ซื้อ = บริษัทไฟแนนซ์)
--
-- เลขเอกสารยังใช้ชุดเดิมแยกตามชนิด (RECEIPT / TAXINV) — ใบกำกับสองใบดึงเลขจากชุด TAXINV
-- ต่อกันตามลำดับ ซึ่งตรงกับการเดินเล่มใบกำกับภาษีตามปกติ

alter table document
  add column if not exists part text not null default 'full';

comment on column document.part is 'ส่วนของการขาย: full | down | financed (FAM-1126)';

-- กันออกซ้ำ: หนึ่งการขายมีเอกสารแต่ละ (ชนิด × ส่วน) ได้ใบเดียว
-- เดิมไม่มี unique index เลย โค้ดกันซ้ำเองด้วย maybeSingle() ซึ่งกันไม่ได้จริงถ้ากดพร้อมกัน
create unique index if not exists document_sale_type_part_key
  on document (sale_id, doc_type, part)
  where sale_id is not null and voided_at is null;

-- ใบกำกับภาษีที่ออกให้บริษัทไฟแนนซ์ ต้องมีชื่อ/ที่อยู่/เลขผู้เสียภาษีของ "ผู้ซื้อ" ตามกฎหมาย
-- แต่ตาราง finance_company มีแค่ชื่อกับเงื่อนไขสินเชื่อ — เพิ่มช่องข้อมูลผู้เสียภาษี
alter table finance_company
  add column if not exists address text,
  add column if not exists tax_id  text,
  add column if not exists phone   text;

comment on column finance_company.tax_id is 'เลขผู้เสียภาษี — บังคับก่อนออกใบกำกับยอดจัดให้ไฟแนนซ์ (FAM-1126)';
