-- R1: บริษัท (นิติบุคคล) เป็นแม่ของสาขา — รองรับทั้ง "1 บริษัท" และ "หลายบริษัท"
-- เลขเอกสารยังแยกตามสาขา (next_doc_no เดิมใช้ได้ ไม่พัง)
-- โอนข้ามบริษัท = ต้องเปิดบิลขาย (ทำในโค้ด/ticket ขาย) · ในบริษัทเดียวกัน = ย้ายสาขาได้
--
-- ⚠️ ต้อง review + apply ผ่าน Supabase (SQL Editor / `supabase db push`) โดยเจ้าของ
--    ถ้าเป็น "หลายบริษัท" ให้แก้ส่วน seed ด้านล่าง: เพิ่ม company หลายแถว + reassign branch.company_id

create table if not exists company (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,
  name         text not null,
  tax_id       text,                              -- เลขผู้เสียภาษีของนิติบุคคล (เติมก่อนออกใบกำกับภาษีจริง)
  address      text,
  phone        text,
  is_wholesale boolean not null default false,    -- R1 B2B: บริษัทขายส่ง
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table branch add column if not exists company_id uuid references company(id);

-- ── seed เริ่มต้น: 1 บริษัท ครอบ 3 สาขาเดิม ─────────────────────────────
--    (ถ้าจริง ๆ เป็นหลายบริษัท ให้แทนบล็อกนี้ด้วยหลาย insert + update ตาม branch)
insert into company (code, name)
values ('FAMAI', 'Famai Motor Group')
on conflict (code) do nothing;

update branch
   set company_id = (select id from company where code = 'FAMAI')
 where company_id is null;

-- ── RLS: อ่านได้ทุกคนที่ล็อกอิน แก้ได้เฉพาะแอดมิน (แนวเดียวกับตารางอ้างอิงอื่น) ──
alter table company enable row level security;

create policy company_read  on company for select to authenticated using (true);
create policy company_admin on company for all    to authenticated using (is_admin()) with check (is_admin());

comment on table company is 'นิติบุคคล (บริษัท) เป็นแม่ของ branch — R1; เอกสาร/ใบกำกับภาษีใช้ tax_id ระดับบริษัท';
