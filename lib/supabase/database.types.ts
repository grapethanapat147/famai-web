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

type PriceHistory = {
  id: string;
  variant_id: string;
  effective_from: string;
  cost: number;
  vat: number;
  retail: number;
  source: string | null;
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
      price_history: Table<PriceHistory>;
      motorcycle_unit: Table<MotorcycleUnit>;
      customer: Table<Customer>;
      app_setting: Table<AppSetting>;
      sale: Table<Sale>;
      receivable: Table<Receivable>;
      finance_company: Table<FinanceCompany>;
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
