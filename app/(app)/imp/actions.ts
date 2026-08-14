"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canManageImport, type ImportActionResult, type ImportUnit } from "@/lib/import/units";

function toKind(raw: string): string {
  return raw.includes("ใหม่") || raw === "" ? "ใหม่" : "มือสอง";
}

/**
 * นำเข้ารถเป็นชุดจากไฟล์ยามาฮ่า — ด่านสิทธิ์ + resolve รหัส→id + ข้ามเลขเครื่องซ้ำ + insert ชุดเดียว
 * RLS บังคับสาขา (insert เฉพาะสาขาที่ผู้ใช้เข้าถึง)
 */
export async function importUnits(formData: FormData): Promise<ImportActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canManageImport(user.roleCodes)) {
    return { ok: false, error: "ไม่มีสิทธิ์นำเข้าข้อมูล" };
  }

  let units: ImportUnit[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("units") ?? "[]"));
    if (Array.isArray(parsed)) {
      units = parsed;
    }
  } catch {
    units = [];
  }
  if (units.length === 0) {
    return { ok: false, error: "ไม่มีข้อมูลให้นำเข้า" };
  }

  const supabase = await createServerSupabase();

  const [variantsRes, branchesRes] = await Promise.all([
    supabase.from("model_variant").select("id, code"),
    supabase.from("branch").select("id, code"),
  ]);
  const variantByCode = new Map((variantsRes.data ?? []).map((v) => [v.code, v.id]));
  const branchByCode = new Map((branchesRes.data ?? []).map((b) => [b.code, b.id]));
  const fallbackBranch = user.branchIds[0] ?? null;

  // ข้ามเลขเครื่องที่มีอยู่แล้วในระบบ
  const engines = units.map((u) => u.engineNo).filter(Boolean);
  const { data: existing } = engines.length
    ? await supabase.from("motorcycle_unit").select("engine_no").in("engine_no", engines)
    : { data: [] };
  const existingEngines = new Set((existing ?? []).map((e) => e.engine_no));

  type UnitInsert = {
    branch_id: string;
    variant_id: string;
    color_code: string;
    sku: string;
    engine_no: string;
    frame_no: string;
    unit_kind: string;
    status: string;
    received_at: string;
    cost: number;
    cost_vat: number;
    supplier_inv_no: string | null;
    supplier_tax_id: string | null;
    src_file: string | null;
    imported_at: string;
  };

  const nowIso = new Date().toISOString();
  const seen = new Set<string>();
  const insertRows: UnitInsert[] = [];

  for (const u of units) {
    const variantId = variantByCode.get(u.variantCode);
    const branchId = branchByCode.get(u.branchCode) ?? fallbackBranch;
    if (!variantId || !branchId || !u.engineNo || !u.frameNo || u.cost <= 0) {
      continue; // ข้อมูลไม่ครบ/รหัสไม่รู้จัก → ข้าม
    }
    if (existingEngines.has(u.engineNo) || seen.has(u.engineNo)) {
      continue; // ซ้ำ
    }
    seen.add(u.engineNo);
    insertRows.push({
      branch_id: branchId,
      variant_id: variantId,
      color_code: u.colorCode || "-",
      sku: u.sku || u.engineNo,
      engine_no: u.engineNo,
      frame_no: u.frameNo,
      unit_kind: toKind(u.unitKind),
      status: "available",
      received_at: u.receivedAt || nowIso.slice(0, 10),
      cost: u.cost,
      cost_vat: u.costVat,
      supplier_inv_no: u.supplierInvNo || null,
      supplier_tax_id: u.supplierTaxId || null,
      src_file: u.srcFile || null,
      imported_at: nowIso,
    });
  }

  const skipped = units.length - insertRows.length;
  if (insertRows.length === 0) {
    return { ok: false, error: `ไม่มีรายการที่นำเข้าได้ (ข้าม ${skipped} รายการ — ซ้ำ/รหัสไม่รู้จัก/ข้อมูลไม่ครบ)` };
  }

  const { error } = await supabase.from("motorcycle_unit").insert(insertRows);
  if (error) {
    return { ok: false, error: "นำเข้าไม่สำเร็จ (สิทธิ์ไม่พอ หรือข้อมูลผิด)" };
  }

  revalidatePath("/imp");
  revalidatePath("/stock");
  return { ok: true, inserted: insertRows.length, skipped };
}
