"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAccessPartsTab } from "@/lib/parts/tabs";
import type { PartsActionResult } from "@/lib/parts/stock";

const ISSUE_KINDS = new Set(["sale", "job"]);

function toInt(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? "").trim();
  if (s === "") {
    return null;
  }
  const n = Number(s);
  return Number.isInteger(n) ? n : null;
}

/**
 * เบิก/ขายอะไหล่ (ตัดสต๊อกออก) — docs/04 §9h แท็บ "เบิก/ขายอะไหล่"
 * ด่านสิทธิ์อยู่ในฟังก์ชันนี้ (บัญชี/เซลล์เรียกตรงไม่ได้) · ตัดสต๊อกแบบ compare-and-swap กันติดลบ/แข่งกัน
 */
export async function issuePart(formData: FormData): Promise<PartsActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canAccessPartsTab(user.roleCodes, "issue")) {
    return { ok: false, error: "ไม่มีสิทธิ์เบิก/ขายอะไหล่" };
  }

  const partId = String(formData.get("part_id") ?? "").trim();
  const qty = toInt(formData.get("qty"));
  const kind = String(formData.get("kind") ?? "sale").trim();

  if (!partId) {
    return { ok: false, error: "เลือกอะไหล่ก่อน" };
  }
  if (qty == null || qty <= 0) {
    return { ok: false, error: "จำนวนต้องมากกว่า 0" };
  }
  if (!ISSUE_KINDS.has(kind)) {
    return { ok: false, error: "ประเภทการเบิกไม่ถูกต้อง" };
  }

  const supabase = await createServerSupabase();

  const { data: part, error: readError } = await supabase
    .from("part")
    .select("id, branch_id, qty_on_hand, price")
    .eq("id", partId)
    .maybeSingle();
  if (readError || !part) {
    return { ok: false, error: "ไม่พบอะไหล่ (หรือไม่มีสิทธิ์สาขานี้)" };
  }
  if (part.qty_on_hand < qty) {
    return { ok: false, error: `สต๊อกไม่พอ — เหลือ ${part.qty_on_hand}` };
  }

  // compare-and-swap: ตัดได้ต่อเมื่อค่าคงเดิม (กัน lost-update/ขายเกิน โดยไม่ต้องมี RPC)
  const { data: updated, error: casError } = await supabase
    .from("part")
    .update({ qty_on_hand: part.qty_on_hand - qty })
    .eq("id", partId)
    .eq("qty_on_hand", part.qty_on_hand)
    .select("id");
  if (casError || !updated || updated.length === 0) {
    return { ok: false, error: "สต๊อกเพิ่งเปลี่ยน กรุณาลองใหม่" };
  }

  const { error: moveError } = await supabase.from("part_movement").insert({
    part_id: partId,
    branch_id: part.branch_id,
    kind,
    qty: -qty,
    unit_price: part.price,
    by_user: user.id,
  });
  if (moveError) {
    // คืนสต๊อก best-effort ถ้าบันทึก movement ไม่ได้
    await supabase
      .from("part")
      .update({ qty_on_hand: part.qty_on_hand })
      .eq("id", partId)
      .eq("qty_on_hand", part.qty_on_hand - qty);
    return { ok: false, error: "บันทึกการเบิกไม่สำเร็จ กรุณาลองใหม่" };
  }

  revalidatePath("/parts");
  return { ok: true };
}

/**
 * แก้ไขของแถม (R1: "แก้ราคาของแถม") — docs/04 §9h แท็บ "ของแถม"
 * ต้นทุนแก้ได้เฉพาะผู้มีสิทธิ์ money · จำนวน/จุดสั่งซื้อแก้ได้ทุกคนที่เข้าแท็บนี้
 */
export async function updateFreebie(formData: FormData): Promise<PartsActionResult> {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: "ยังไม่ได้ล็อกอิน" };
  }
  if (!canAccessPartsTab(user.roleCodes, "gifts")) {
    return { ok: false, error: "ไม่มีสิทธิ์แก้ไขของแถม" };
  }

  const freebieId = String(formData.get("freebie_id") ?? "").trim();
  if (!freebieId) {
    return { ok: false, error: "ไม่พบของแถม" };
  }

  const patch: { cost?: number; qty_on_hand?: number; min_qty?: number } = {};

  const costRaw = String(formData.get("cost") ?? "").trim();
  if (costRaw !== "") {
    if (!user.perms.money) {
      return { ok: false, error: "ไม่มีสิทธิ์แก้ราคาต้นทุน" };
    }
    const cost = Number(costRaw);
    if (!Number.isFinite(cost) || cost < 0) {
      return { ok: false, error: "ราคาต้นทุนไม่ถูกต้อง" };
    }
    patch.cost = cost;
  }

  const qty = toInt(formData.get("qty_on_hand"));
  if (qty != null) {
    if (qty < 0) {
      return { ok: false, error: "จำนวนคงเหลือไม่ถูกต้อง" };
    }
    patch.qty_on_hand = qty;
  }

  const min = toInt(formData.get("min_qty"));
  if (min != null) {
    if (min < 0) {
      return { ok: false, error: "จุดสั่งซื้อไม่ถูกต้อง" };
    }
    patch.min_qty = min;
  }

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: "ไม่มีข้อมูลที่จะแก้" };
  }

  const supabase = await createServerSupabase();
  const { data: updated, error } = await supabase.from("freebie").update(patch).eq("id", freebieId).select("id");
  if (error || !updated || updated.length === 0) {
    return { ok: false, error: "บันทึกไม่สำเร็จ (หรือไม่มีสิทธิ์สาขานี้)" };
  }

  revalidatePath("/parts");
  return { ok: true };
}
