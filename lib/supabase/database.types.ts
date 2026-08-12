/**
 * Curated Database types — เขียนมือจาก supabase/migrations (ground truth)
 * ครอบคลุม subset ที่ใช้ใน Phase 1 เท่านั้น ไม่ใช่ทุกตาราง (48 ตาราง)
 *
 * เมื่อมี Supabase access token แล้ว regenerate ฉบับเต็มด้วย:
 *   npm run gen:types   (ดู package.json — ต้องมี SUPABASE_ACCESS_TOKEN)
 * แล้วค่อยแทนที่ไฟล์นี้ + ลบชนิดที่เขียนมือออก
 *
 * Insert/Update ตั้งเป็น Partial<Row> ชั่วคราว — ticket ที่เขียนข้อมูลจริง (เช่น FAM-1011)
 * จะรัดชนิด Insert ของตารางนั้นให้แน่นขึ้นเอง
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** role.perms — 4 สิทธิ์จริงในฐานข้อมูล (ดู migration 08). หมายเหตุ: ไม่มี editBack ใน DB */
export type RolePerms = {
  money: boolean;
  allBranch: boolean;
  approve: boolean;
  admin: boolean;
};

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

type Branch = {
  id: string;
  code: string;
  name: string;
  doc_prefix: string;
  tax_id: string | null;
  branch_no: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  company_id: string | null; // R1: บริษัทแม่ (migration 16)
};

type Company = {
  id: string;
  code: string;
  name: string;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  is_wholesale: boolean;
  is_active: boolean;
  created_at: string;
};

type AppUser = {
  id: string;
  username: string;
  full_name: string;
  nickname: string | null;
  all_branch: boolean;
  is_active: boolean;
};

type Role = {
  id: string;
  code: string;
  name: string;
  perms: RolePerms;
};

type ModelVariant = {
  id: string;
  code: string;
  model_name: string;
  model_th: string | null;
  category: string | null;
  cc: number | null;
  model_year: number | null;
  spec: string | null;
};

type ModelColor = {
  variant_id: string;
  color_code: string;
  color_name: string;
};

type ModelPhoto = {
  id: string;
  variant_id: string;
  path_card: string;
  path_full: string;
  bytes: number | null;
  sort: number;
  alt: string | null;
  created_at: string;
};

type PriceHistory = {
  id: string;
  variant_id: string;
  effective_from: string;
  cost: number;
  vat: number;
  retail: number;
  source: string | null;
};

type UnitTransfer = {
  id: string;
  unit_id: string;
  from_branch: string;
  to_branch: string;
  requested_at: string;
  received_at: string | null;
  status: string; // in_transit | received | cancelled
  note: string | null;
};

type MotorcycleUnit = {
  id: string;
  branch_id: string;
  variant_id: string;
  color_code: string;
  sku: string;
  engine_no: string;
  frame_no: string;
  unit_kind: string;
  status: string; // available | reserved | in_transfer | sold | returned
  received_at: string;
  cost: number;
  cost_vat: number;
  retail: number | null;
  is_clearance: boolean;
  price_note: string | null;
  priced_by: string | null;
  priced_at: string | null;
  photo_url: string | null;
  src_file: string | null;
  recv_no: string | null;
  po_no: string | null;
  po_date: string | null;
  supplier_tax_id: string | null;
  supplier_inv_no: string | null;
  imported_at: string | null;
  created_at: string;
};

type Customer = {
  id: string;
  branch_id: string | null;
  full_name: string;
  nickname: string | null;
  phone: string | null;
  address: string | null;
  tax_id: string | null;
  source: string | null;
  stage: string;
  interested_variant_id: string | null;
  owner_id: string | null;
  consent_at: string | null;
  consent_scope: string | null;
  created_at: string;
};

type AppSetting = {
  key: string;
  value: Json;
};

type Sale = {
  id: string;
  branch_id: string;
  unit_id: string;
  customer_id: string;
  salesperson_id: string | null;
  sold_at: string;
  list_price: number;
  discount: number;
  net_price: number;
  cost: number;
  freebie_cost: number;
  gross_profit: number;
  pay_method: string; // cash | finance
  down_payment: number | null;
  term_months: number | null;
  note: string | null;
  finance_id: string | null;
  doc_no: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  created_at: string;
};

type Quotation = {
  id: string;
  branch_id: string;
  doc_no: string;
  quote_date: string;
  valid_until: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string | null;
  created_by: string | null;
};

type QuotationOption = {
  id: string;
  quotation_id: string;
  slot: number;
  variant_id: string | null;
  price: number;
  finance_id: string | null;
  down_payment: number | null;
  terms: Json; // [{ months, monthly }]
};

type FinanceCase = {
  id: string;
  branch_id: string;
  sale_id: string | null;
  customer_id: string;
  company_id: string;
  status: string; // ส่งเรื่อง | ยื่นเอกสาร | รอผล | ติดตามต่อ | อนุมัติแล้ว | ปฏิเสธ | ยกเลิก
  amount: number | null;
  submitted_at: string | null;
  decided_at: string | null;
  reject_reason: string | null;
};

type Registration = {
  id: string;
  sale_id: string;
  branch_id: string;
  stage: string; // ขายแล้ว | ส่งไฟแนนซ์ | อนุมัติ | รอทะเบียน | ป้ายขาว | ส่งมอบแล้ว
  plate_no: string | null;
  book_no: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  plate_received_at: string | null;
  delivered_at: string | null;
  due_at: string | null;
  note: string | null;
};

type ServiceJob = {
  id: string;
  branch_id: string;
  job_no: string;
  customer_id: string | null;
  unit_id: string | null;
  engine_no: string | null;
  frame_no: string | null;
  customer_kind: string | null;
  odometer_km: number | null;
  service_type: string | null;
  symptom: string | null;
  checked_in_at: string;
  started_at: string | null;
  finished_at: string | null;
  status: string; // รับเข้า | กำลังซ่อม | รออะไหล่ | เสร็จ | ส่งมอบแล้ว
  labor_cost: number;
  parts_cost: number;
  total: number;
  technician_id: string | null;
};

type ServiceJobLine = {
  id: number;
  job_id: string;
  kind: string; // labor | part
  part_id: string | null;
  description: string | null;
  qty: number;
  unit_price: number;
  amount: number;
};

type Part = {
  id: string;
  branch_id: string;
  code: string;
  name: string;
  cost: number;
  price: number;
  qty_on_hand: number;
  min_qty: number;
};

type PartMovement = {
  id: number;
  part_id: string;
  branch_id: string;
  kind: string; // receive | sale | job | adjust | transfer
  qty: number; // + เข้า / − ออก
  job_id: string | null;
  sale_id: string | null;
  unit_price: number | null;
  at: string;
  by_user: string | null;
  note: string | null;
};

type Freebie = {
  id: string;
  branch_id: string;
  name: string;
  cost: number;
  qty_on_hand: number;
  min_qty: number;
};

type FinanceCompany = {
  id: string;
  name: string;
  flat_rate_pct: number | null;
  min_down_pct: number | null;
  commission: number | null;
  note: string | null;
  is_active: boolean;
};

type Receivable = {
  id: string;
  branch_id: string;
  sale_id: string;
  kind: string; // finance | customer | อื่นๆ
  payer_finance_id: string | null;
  amount_due: number;
  amount_paid: number;
  due_at: string | null;
  settled_at: string | null;
  balance: number; // generated = amount_due - amount_paid
};

type ReceiptPayment = {
  id: string;
  receivable_id: string;
  paid_at: string;
  amount: number;
  method: string | null; // เงินสด | โอน | เช็ค
  ref_no: string | null;
  by_user: string | null;
};

type Empty = Record<PropertyKey, never>;

export type Database = {
  public: {
    Tables: {
      branch: Table<Branch>;
      company: Table<Company>;
      app_user: Table<AppUser>;
      role: Table<Role>;
      app_user_role: Table<{ user_id: string; role_id: string }>;
      app_user_branch: Table<{ user_id: string; branch_id: string }>;
      model_variant: Table<ModelVariant>;
      model_color: Table<ModelColor>;
      model_photo: Table<ModelPhoto>;
      price_history: Table<PriceHistory>;
      motorcycle_unit: Table<MotorcycleUnit>;
      unit_transfer: Table<UnitTransfer>;
      customer: Table<Customer>;
      app_setting: Table<AppSetting>;
      sale: Table<Sale>;
      receivable: Table<Receivable>;
      receipt_payment: Table<ReceiptPayment>;
      finance_company: Table<FinanceCompany>;
      finance_case: Table<FinanceCase>;
      registration: Table<Registration>;
      quotation: Table<Quotation>;
      quotation_option: Table<QuotationOption>;
      part: Table<Part>;
      part_movement: Table<PartMovement>;
      freebie: Table<Freebie>;
      service_job: Table<ServiceJob>;
      service_job_line: Table<ServiceJobLine>;
    };
    Views: Empty;
    Functions: {
      my_branches: { Args: Empty; Returns: string[] };
      is_all_branch: { Args: Empty; Returns: boolean };
      is_admin: { Args: Empty; Returns: boolean };
      is_manager: { Args: Empty; Returns: boolean };
      next_doc_no: { Args: { p_branch: string; p_type: string; p_year: number }; Returns: string };
      meters_between: {
        Args: { la1: number; ln1: number; la2: number; ln2: number };
        Returns: number;
      };
    };
    Enums: Empty;
    CompositeTypes: Empty;
  };
  pub: {
    // สคีมาสาธารณะ — คอลัมน์ที่อนุญาตเท่านั้น (curated; รายละเอียดใน docs/07-public-api.md, FAM-E11)
    Tables: Empty;
    Views: {
      // ตรงกับ view จริงใน migration 14 (verified live): คอลัมน์ที่อนุญาตให้ anon อ่านเท่านั้น
      model: {
        Row: {
          code: string;
          model: string; // = model_variant.model_name
          model_th: string;
          cat: string; // = category
          cc: number | null;
          year: number | null; // = model_year
          retail: number | null;
          photo: string | null; // = photo_url
          colors: Json; // [{ code, name }]
          photos: Json; // [{ card, full }] | null
          availability: string; // 'order' | 'low' | 'ready'
        };
        Relationships: [];
      };
    };
    Functions: {
      order_status: { Args: { p_token: string }; Returns: Json };
    };
    Enums: Empty;
    CompositeTypes: Empty;
  };
};
