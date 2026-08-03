-- ส่วนที่ 2: ขาย ทะเบียน ไฟแนนซ์ เงินค้างรับ เอกสาร
-- finance_company ต้องมาก่อน sale เพราะ sale.finance_id อ้างถึง

create table finance_company (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,                 -- กรุงศรี / ธนชาต / ทิสโก้ / …
  flat_rate_pct numeric(6,4),                -- ดอกเบี้ยคงที่ต่อเดือน
  min_down_pct  numeric(5,2),                -- เงินดาวน์ขั้นต่ำ (%)
  commission    numeric(12,2) default 0,     -- ค่าคอมที่ร้านได้ต่อสัญญา
  note          text,
  is_active boolean not null default true    -- ปิดใช้งานแทนการลบเมื่อมีเคสอ้างถึงอยู่
);

create table sale (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references branch(id),
  unit_id       uuid not null references motorcycle_unit(id),
  customer_id   uuid not null references customer(id),
  salesperson_id uuid references app_user(id),
  sold_at       date not null,
  list_price    numeric(12,2) not null,
  discount      numeric(12,2) not null default 0,
  net_price     numeric(12,2) not null,
  cost          numeric(12,2) not null,      -- snapshot ต้นทุน ณ วันขาย
  freebie_cost  numeric(12,2) not null default 0,
  gross_profit  numeric(12,2) not null,
  pay_method    text not null,               -- cash | finance
  down_payment  numeric(12,2),
  term_months   int,
  note          text,
  finance_id    uuid references finance_company(id),   -- เอกสารระบุไว้แต่ลืมใส่คอลัมน์
  doc_no        text,                        -- เลขใบกำกับภาษีที่ออกให้
  voided_at     timestamptz, voided_reason text,
  created_at    timestamptz not null default now()
);

create table freebie (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branch(id),
  name text not null, cost numeric(12,2) not null,
  qty_on_hand int not null default 0,
  min_qty int not null default 0
);

create table sale_freebie (
  sale_id uuid references sale(id), freebie_id uuid references freebie(id),
  qty int not null default 1, cost_each numeric(12,2) not null,
  primary key (sale_id, freebie_id)
);

create table registration (
  id           uuid primary key default gen_random_uuid(),
  sale_id      uuid not null unique references sale(id),
  branch_id    uuid not null references branch(id),
  stage        text not null default 'ขายแล้ว',
       -- ขายแล้ว → ส่งไฟแนนซ์ → อนุมัติ → รอทะเบียน → ป้ายขาว → ส่งมอบแล้ว
  plate_no     text,
  book_no      text,
  submitted_at date, approved_at date, plate_received_at date, delivered_at date,
  due_at       date,
  note         text
);

create table registration_event (
  id bigserial primary key,
  registration_id uuid not null references registration(id),
  from_stage text, to_stage text not null,
  at timestamptz not null default now(), by_user uuid references app_user(id), note text
);

create table finance_case (
  id            uuid primary key default gen_random_uuid(),
  branch_id     uuid not null references branch(id),
  sale_id       uuid references sale(id),
  customer_id   uuid not null references customer(id),
  company_id    uuid not null references finance_company(id),
  status        text not null default 'ส่งเรื่อง',
       -- ส่งเรื่อง → ยื่นเอกสาร → รอผล → ติดตามต่อ → อนุมัติแล้ว | ปฏิเสธ | ยกเลิก
  amount        numeric(12,2),
  submitted_at  date, decided_at date, reject_reason text
);

create table finance_case_event (
  id bigserial primary key,
  case_id uuid not null references finance_case(id),
  from_status text, to_status text not null,
  at timestamptz not null default now(), by_user uuid references app_user(id), note text
);

create table receivable (                     -- เงินค้างรับ
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references branch(id),
  sale_id     uuid not null references sale(id),
  kind        text not null,                 -- finance | customer | อื่นๆ
  payer_finance_id uuid references finance_company(id),
  amount_due  numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  due_at      date,
  settled_at  date,
  balance     numeric(12,2) generated always as (amount_due - amount_paid) stored
);

create table receipt_payment (                -- ลงรับเงินจริง
  id           uuid primary key default gen_random_uuid(),
  receivable_id uuid not null references receivable(id),
  paid_at      date not null,
  amount       numeric(12,2) not null,
  method       text,                          -- เงินสด | โอน | เช็ค
  ref_no       text,
  by_user      uuid references app_user(id)
);

create table doc_counter (
  branch_id uuid not null references branch(id),
  doc_type  text not null,   -- RECEIPT | TAXINV | TAXINV_DOWN | QUOTE | PAYSLIP | SERVICE
  year_be   int  not null,
  last_no   bigint not null default 0,
  primary key (branch_id, doc_type, year_be)
);

create table quotation (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branch(id),
  doc_no text not null, quote_date date not null, valid_until date,
  customer_name text not null, customer_phone text, customer_address text,
  created_by uuid references app_user(id)
);

create table quotation_option (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references quotation(id),
  slot int not null,                          -- 1 = คันที่ 1, 2 = คันที่ 2
  variant_id uuid references model_variant(id),
  price numeric(12,2) not null,
  finance_id uuid references finance_company(id),
  down_payment numeric(12,2),
  terms jsonb                                 -- [{"months":12,"monthly":9720.57}, …]
);;
