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
  geo_lat: number | null; // FAM-1101 geofence ลงเวลา
  geo_lng: number | null;
  geo_radius_m: number | null;
  require_selfie: boolean; // FAM-1101 P2 บังคับถ่ายเซลฟี่ตอนลงเวลา
};

/** จุดลงเวลา/สาขาย่อยของบริษัท (migration 12) — FAM-1113 เปิดใช้งานผ่าน UI */
type BranchSite = {
  id: string;
  branch_id: string;
  name: string;
  kind: string; // main | sub | other
  lat: number;
  lng: number;
  radius_m: number;
  pin_acc_m: number | null;
  holds_stock: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
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
  photo_url: string | null; // migration 10 — URL รูปปก (สำเนาของ model_photo sort=0)
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
  note: string | null; // FAM-1094 หมายเหตุตอนรับรถ
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

type Attachment = {
  id: string;
  owner_table: string; // expense | motorcycle_unit | registration | …
  owner_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  kind: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

type AuditLog = {
  id: number;
  at: string;
  actor: string | null;
  table_name: string;
  row_id: string;
  action: string; // INSERT | UPDATE | DELETE | VIEW_PII
  before: Json | null;
  after: Json | null;
};

type LeadStageHistory = {
  id: number;
  customer_id: string;
  from_stage: string | null;
  to_stage: string;
  changed_by: string | null;
  changed_at: string;
  note: string | null;
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
  public_token: string; // migration 14 — รหัสให้ลูกค้าเช็กสถานะเองที่ /status
  created_at: string;
};

type DocumentRow = {
  id: string;
  branch_id: string;
  doc_type: string; // RECEIPT | TAXINV | …
  part: string; // full | down | financed (migration 33)
  doc_no: string;
  doc_date: string;
  sale_id: string | null;
  service_job_id: string | null;
  wholesale_order_id: string | null; // เอกสารของบิลขายส่ง (migration 35)
  customer_id: string | null;
  amount_base: number | null;
  amount_vat: number | null;
  amount_total: number | null;
  seller_snapshot: Json;
  buyer_snapshot: Json;
  printed_count: number;
  voided_at: string | null;
  voided_reason: string | null;
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

type FinanceCaseEvent = {
  id: number;
  case_id: string;
  from_status: string | null;
  to_status: string;
  at: string;
  by_user: string | null;
  note: string | null;
};

type RegistrationEvent = {
  id: number;
  registration_id: string;
  from_stage: string | null;
  to_stage: string;
  at: string;
  by_user: string | null;
  note: string | null;
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

type CompanyEvent = {
  id: string;
  branch_id: string | null;
  event_date: string;
  event_type: string; // อีเวนท์ | ประชุม | รับเชิญ | อื่นๆ
  title: string;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

type ServiceReminder = {
  id: string;
  customer_id: string;
  unit_id: string | null;
  target_km: number;
  due_date: string | null;
  status: string;
  notified_at: string | null;
};

type FollowUpTask = {
  id: string;
  branch_id: string;
  customer_id: string;
  sale_id: string | null;
  kind: string;
  due_at: string;
  done_at: string | null;
  done_by: string | null;
  assigned_to: string | null;
  note: string | null;
};

type Payslip = {
  id: string;
  period_id: string;
  employee_id: string;
  employee_name: string;
  position: string | null;
  base: number;
  ot_minutes: number;
  ot_amount: number;
  commission_base: number;
  commission: number;
  ssn: number;
  net: number;
  created_at: string;
};

type PayrollPeriod = {
  id: string;
  branch_id: string | null;
  period_start: string;
  period_end: string;
  status: string;
};

type Registration = {
  id: string;
  sale_id: string;
  branch_id: string;
  stage: string; // ขายแล้ว | ส่งไฟแนนซ์ | อนุมัติ | รอทะเบียน | ป้ายขาว | ส่งมอบแล้ว
  plate_no: string | null;
  book_no: string | null;
  dlt_request_no: string | null;
  dlt_submitted_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  plate_received_at: string | null;
  delivered_at: string | null;
  delivery_place: string | null;
  delivered_by: string | null;
  due_at: string | null;
  note: string | null;
};

type RegistrationStep = {
  registration_id: string;
  stage: string;
  sub_status: string | null;
  note: string | null;
  updated_at: string;
  updated_by: string | null;
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

type Employee = {
  id: string;
  user_id: string | null;
  branch_id: string;
  emp_code: string | null;
  position: string | null;
  hired_at: string | null;
  resigned_at: string | null;
  base_salary: number | null;
  ssn_no: string | null;
  bank_code: string | null;
  bank_account: string | null;
};

type Attendance = {
  id: number;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null; // ปกติ | สาย | ลา | ขาด
  late_minutes: number | null;
  work_minutes: number | null;
  ot_minutes: number;
  check_in_lat: number | null; // FAM-1101 พิกัดตอนลงเวลา
  check_in_lng: number | null;
  check_in_distance_m: number | null;
  check_in_selfie: string | null; // FAM-1101 P2 path เซลฟี่
  check_in_site_id: string | null; // migration 12 — จุดลงเวลาที่ใกล้สุด (FAM-1113)
  check_in_site_name: string | null; // ชื่อจุด ณ วันลงเวลา (แช่ไว้ ประวัติไม่เปลี่ยนตามการแก้ชื่อ)
};

type LeaveRequest = {
  id: string;
  employee_id: string;
  leave_type: string; // ลาป่วย | ลากิจ | ลาพักร้อน
  date_from: string;
  date_to: string;
  status: string; // รออนุมัติ | อนุมัติ | ปฏิเสธ
  approved_by: string | null;
  approved_at: string | null;
  reason: string | null;
};

type ExpenseCategory = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  branch_id: string;
  category_id: string;
  spent_at: string;
  amount: number;
  vendor: string | null;
  tax_invoice_no: string | null;
  has_receipt: boolean;
  note: string | null;
  created_by: string | null;
  approved_by: string | null; // migration 19 — การเงินกดอนุมัติ
  approved_at: string | null;
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
  unit_cost: number | null; // ต้นทุน ณ เวลาที่เคลื่อนไหว (migration 38)
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

type WholesaleCompanyRow = {
  id: string;
  branch_id: string | null;
  name: string;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  contact_name: string | null;
  credit_days: number;
  note: string | null;
  is_active: boolean;
  created_at: string;
};

type WholesaleOrderRowDb = {
  id: string;
  branch_id: string;
  company_id: string;
  order_no: string;
  sold_at: string;
  salesperson_id: string | null;
  total: number;
  cost_total: number;
  gross_profit: number;
  note: string | null;
  voided_at: string | null;
  voided_reason: string | null;
  created_at: string;
};

type WholesaleOrderLineRow = {
  id: number;
  order_id: string;
  unit_id: string;
  price: number;
  cost: number;
};

type FinanceCompany = {
  id: string;
  name: string;
  flat_rate_pct: number | null;
  rate_tiers: Json | null; // เรตรายช่วงงวด เช่น {"12":1.29,"36":1.45} — คีย์ที่ไม่มีใช้ flat_rate_pct
  min_down_pct: number | null;
  commission: number | null;
  note: string | null;
  address: string | null; // migration 33 — ข้อมูลผู้ซื้อบนใบกำกับยอดจัด
  tax_id: string | null;
  phone: string | null;
  is_active: boolean;
};

type Receivable = {
  id: string;
  branch_id: string;
  sale_id: string | null; // null ได้เมื่อเป็นเงินค้างรับจากบิลขายส่ง (migration 34/35)
  wholesale_order_id: string | null;
  kind: string; // finance | customer | wholesale | อื่นๆ
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
      branch_site: Table<BranchSite>;
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
      attachment: Table<Attachment>;
      audit_log: Table<AuditLog>;
      lead_stage_history: Table<LeadStageHistory>;
      sale: Table<Sale>;
      receivable: Table<Receivable>;
      receipt_payment: Table<ReceiptPayment>;
      finance_company: Table<FinanceCompany>;
      wholesale_company: Table<WholesaleCompanyRow>;
      wholesale_order: Table<WholesaleOrderRowDb>;
      wholesale_order_line: Table<WholesaleOrderLineRow>;
      finance_case: Table<FinanceCase>;
      finance_case_event: Table<FinanceCaseEvent>;
      registration_event: Table<RegistrationEvent>;
      registration: Table<Registration>;
      registration_step: Table<RegistrationStep>;
      document: Table<DocumentRow>;
      quotation: Table<Quotation>;
      quotation_option: Table<QuotationOption>;
      company_event: Table<CompanyEvent>;
      service_reminder: Table<ServiceReminder>;
      follow_up_task: Table<FollowUpTask>;
      payroll_period: Table<PayrollPeriod>;
      payslip: Table<Payslip>;
      part: Table<Part>;
      part_movement: Table<PartMovement>;
      freebie: Table<Freebie>;
      expense: Table<Expense>;
      expense_category: Table<ExpenseCategory>;
      employee: Table<Employee>;
      attendance: Table<Attendance>;
      leave_request: Table<LeaveRequest>;
      service_job: Table<ServiceJob>;
      service_job_line: Table<ServiceJobLine>;
    };
    Views: Empty;
    Functions: {
      my_branches: { Args: Empty; Returns: string[] };
      is_all_branch: { Args: Empty; Returns: boolean };
      is_admin: { Args: Empty; Returns: boolean };
      has_money: { Args: Empty; Returns: boolean };
      /** FAM-1147 — price_history.cost ถูกถอนสิทธิ์อ่านตรงแล้ว */
      price_history_cost: {
        Args: Empty;
        Returns: { variant_id: string; effective_from: string; cost: number | null }[];
      };
      /** FAM-1145 — คอลัมน์อ่อนไหวของ employee ถูกถอนสิทธิ์อ่านตรงแล้ว ต้องมาทางนี้เท่านั้น */
      employee_pay_info: {
        Args: Empty;
        Returns: { id: string; base_salary: number | null; ssn_no: string | null; bank_code: string | null; bank_account: string | null }[];
      };
      is_manager: { Args: Empty; Returns: boolean };
      next_doc_no: { Args: { p_branch: string; p_type: string; p_year: number }; Returns: string };
      add_model: {
        Args: {
          p_code: string;
          p_model_name: string;
          p_model_th: string;
          p_category: string;
          p_cc: number | null;
          p_year: number | null;
          p_colors: Json;
          p_cost: number;
          p_vat: number;
          p_retail: number;
        };
        Returns: string;
      };
      sell_unit: {
        Args: {
          p_unit_id: string;
          p_customer_name: string;
          p_customer_phone: string;
          p_pay_method: string;
          p_list_price: number;
          p_discount: number;
          p_freebie_cost: number;
          p_down_payment: number | null;
          p_term_months: number | null;
          p_finance_id: string | null;
          p_note: string | null;
          p_customer_id?: string | null;
          p_freebie_ids?: string[] | null;
        };
        Returns: Json;
      };
      punch_in: {
        Args: {
          p_lat?: number | null;
          p_lng?: number | null;
          p_distance_m?: number | null;
          p_site_id?: string | null;
          p_site_name?: string | null;
          p_selfie_path?: string | null;
          p_work_start?: string;
        };
        Returns: Json;
      };
      punch_out: {
        Args: { p_work_end?: string; p_ot_step?: number };
        Returns: Json;
      };
      next_service_reminder: {
        Args: { p_job_id: string };
        Returns: string | null;
      };
      void_wholesale_order: {
        Args: { p_order_id: string; p_reason: string };
        Returns: Json;
      };
      sell_wholesale: {
        Args: { p_company_id: string; p_lines: Json; p_note?: string | null };
        Returns: Json;
      };
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
