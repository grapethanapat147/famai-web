-- Famai Motor Group — schema ส่วนที่ 1: สาขา ผู้ใช้ รุ่นรถ คันรถ ลูกค้า
-- สร้างจาก docs/03-data-model.md พร้อมแก้บั๊กที่รันไม่ผ่าน

create table branch (
  id           uuid primary key default gen_random_uuid(),
  code         text not null unique,      -- 'FMG01' | 'FMM01' | 'FCG01' (ตรงกับไฟล์ยามาฮ่า)
  name         text not null,             -- 'Famai Motor Group'
  doc_prefix   text not null,             -- นำหน้าเลขเอกสาร เช่น 'FMG'
  tax_id       text,                      -- เลขประจำตัวผู้เสียภาษีของสาขานี้
  branch_no    text default '00000',      -- '00000' = สำนักงานใหญ่
  address      text,
  phone        text,
  is_active    boolean not null default true
);

create table app_user (
  id           uuid primary key references auth.users(id) on delete cascade,
  username     text not null unique,
  full_name    text not null,
  nickname     text,
  all_branch   boolean not null default false,   -- ผู้บริหาร/แอดมิน เห็นทุกสาขา
  is_active    boolean not null default true
);

create table role (
  id    uuid primary key default gen_random_uuid(),
  code  text not null unique,             -- admin | manager | sales | stock | acct | hr | tech
  name  text not null unique,             -- ผู้ดูแลระบบ / ผู้บริหาร / เซลล์ / สต๊อก / บัญชี / HR / ช่าง
  perms jsonb not null default '{}'       -- {"money":true,"approve":true,"admin":false,...}
);

create table app_user_role   (user_id uuid references app_user(id) on delete cascade, role_id   uuid references role(id)   on delete cascade, primary key (user_id, role_id));

create table app_user_branch (user_id uuid references app_user(id) on delete cascade, branch_id uuid references branch(id) on delete cascade, primary key (user_id, branch_id));

create table model_variant (                 -- 'แบบรถ' ในไฟล์ยามาฮ่า
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,          -- 'BTF200'
  model_name  text not null,                 -- 'NMAX'
  model_th    text,                          -- 'เอ็นแม็กซ์ สแตนดาร์ด'
  category    text,                          -- Sport | Automatic | Moped | Big Bike
  cc          numeric(6,2),                  -- 155.09
  model_year  int,                           -- 2569 (พ.ศ.)
  spec        text
);

create table model_color (
  variant_id  uuid not null references model_variant(id),
  color_code  text not null,                 -- '010A' … '010F' (คอลัมน์สีในตารางราคา)
  color_name  text not null,                 -- 'แดง'
  primary key (variant_id, color_code)
);

create table price_history (                 -- ราคามีอายุ ไม่ใช่ค่าเดียวตายตัว
  id            uuid primary key default gen_random_uuid(),
  variant_id    uuid not null references model_variant(id),
  effective_from date not null,              -- '2026-03-05'
  cost          numeric(12,2) not null,      -- มูลค่า (ก่อน VAT)
  vat           numeric(12,2) not null,
  retail        numeric(12,2) not null,      -- ราคาขายปลีกแนะนำ (รวม VAT)
  source        text,                        -- 'ตารางราคายามาฮ่า 5 มี.ค. 2569'
  unique (variant_id, effective_from)
);

create table motorcycle_unit (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references branch(id),
  variant_id    uuid not null references model_variant(id),
  color_code    text not null,
  sku           text not null,               -- 'BTF200010E' = variant.code + color_code
  engine_no     text not null unique,        -- คีย์ธรรมชาติ
  frame_no      text not null unique,        -- 17 ตัวอักษร
  unit_kind     text not null default 'รถใหม่',
  status        text not null default 'available',
       -- available | reserved | in_transfer | sold | returned
  received_at   date not null,               -- 'วันที่ใบรับ' — ใช้คำนวณอายุสต๊อก
  cost          numeric(12,2) not null,
  cost_vat      numeric(12,2) not null,
  retail        numeric(12,2),               -- null = รอกำหนดราคา
  is_clearance  boolean not null default false,
  price_note    text,
  priced_by     uuid references app_user(id),
  priced_at     timestamptz,
  photo_url     text,
  -- ที่มาจากไฟล์ยามาฮ่า (เก็บไว้ตรวจสอบย้อนหลัง)
  src_file      text,
  recv_no       text,
  po_no         text,
  po_date       date,
  supplier_tax_id text,
  supplier_inv_no text,
  imported_at   timestamptz,
  created_at    timestamptz not null default now()
);

create table unit_transfer (                 -- โอนย้ายรถระหว่างสาขา
  id            uuid primary key default gen_random_uuid(),
  unit_id       uuid not null references motorcycle_unit(id),
  from_branch   uuid not null references branch(id),
  to_branch     uuid not null references branch(id),
  requested_at  timestamptz not null default now(),
  received_at   timestamptz,
  status        text not null default 'in_transit',
  note          text
);

create table customer (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid references branch(id),
  full_name   text not null,
  nickname    text,
  phone       text,
  address     text,
  tax_id      text,                          -- ข้อมูลอ่อนไหว — จำกัดสิทธิ์
  source      text,
  stage       text not null default 'เข้ามาดูรถ',
  interested_variant_id uuid references model_variant(id),
  owner_id    uuid references app_user(id),
  consent_at  timestamptz,                   -- PDPA
  consent_scope text,
  created_at  timestamptz not null default now()
);

create table lead_stage_history (
  id          bigserial primary key,
  customer_id uuid not null references customer(id),
  from_stage  text, to_stage text not null,
  changed_by  uuid references app_user(id),
  changed_at  timestamptz not null default now(),
  note        text
);;
