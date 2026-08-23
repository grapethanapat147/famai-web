import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { createServerSupabase } from "@/lib/supabase/server";
import { stockStats, agedUnits, type DashUnit } from "@/lib/dashboard/stats";
import { computeAgeDays } from "@/lib/stock/units";

/**
 * เครื่องมือของผู้ช่วยวิเคราะห์ (E12 FAM-1067)
 * ⚠️ ทุก executor ดึงข้อมูลผ่าน createServerSupabase() = เซสชัน user จริง → RLS แยกบริษัทบังคับที่ DB
 * และคืน "ค่ารวม" ที่ money-strip แล้ว (มูลค่า/ยอดเงิน = null ถ้า role ไม่มีสิทธิ์) — AI ไม่เห็นตัวเลขต่อคัน
 */
export const ASSIST_TOOLS: Anthropic.Tool[] = [
  {
    name: "stock_summary",
    description:
      "สรุปสต๊อกรถคงเหลือ: จำนวนคันคงเหลือ จำนวนคันที่ค้างเกินเกณฑ์ และมูลค่าสต๊อกรวม (มูลค่าจะมีค่าเฉพาะเมื่อผู้ใช้มีสิทธิ์เห็นข้อมูลเงิน ไม่งั้นเป็น null)",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "aged_units",
    description: "รายการรถที่ค้างสต๊อกนานสุด (รุ่น บริษัท จำนวนวันที่ค้าง) เรียงจากค้างนานสุด",
    input_schema: {
      type: "object",
      properties: { limit: { type: "number", description: "จำนวนรายการสูงสุด (ค่าเริ่มต้น 5)" } },
      additionalProperties: false,
    },
  },
  {
    name: "sales_this_month",
    description:
      "ยอดขายเดือนปัจจุบัน: จำนวนคันที่ขาย และยอดขายรวม (ยอดขายรวมมีค่าเฉพาะเมื่อผู้ใช้มีสิทธิ์เห็นข้อมูลเงิน ไม่งั้นเป็น null)",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
];

export type AssistCtx = { canSeeMoney: boolean; agingDays: number; today: string };

type UnitRow = { branch_id: string; variant_id: string; status: string; received_at: string; cost: number | null };

async function loadUnits(
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
  today: string,
): Promise<DashUnit[]> {
  const [unitsRes, branchesRes, variantsRes] = await Promise.all([
    supabase.from("motorcycle_unit").select("branch_id, variant_id, status, received_at, cost"),
    supabase.from("branch").select("id, code, name"),
    supabase.from("model_variant").select("id, model_name"),
  ]);
  const branchMap = new Map((branchesRes.data ?? []).map((b) => [b.id, b]));
  const variantMap = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  return ((unitsRes.data ?? []) as UnitRow[]).map((u) => {
    const b = branchMap.get(u.branch_id);
    return {
      branchCode: b?.code ?? "?",
      branchName: b?.name ?? "?",
      status: u.status,
      ageDays: computeAgeDays(u.received_at, today),
      cost: u.cost,
      model: variantMap.get(u.variant_id) ?? undefined,
    };
  });
}

/** เรียกเครื่องมือหนึ่งตัว → คืนผลลัพธ์ที่ปลอดภัย (money-stripped) เป็น object */
export async function runAssistTool(name: string, input: unknown, ctx: AssistCtx): Promise<unknown> {
  const supabase = await createServerSupabase();
  const args = (input ?? {}) as Record<string, unknown>;

  if (name === "stock_summary") {
    const units = await loadUnits(supabase, ctx.today);
    const s = stockStats(units, { agingDays: ctx.agingDays, buckets: [], canSeeMoney: ctx.canSeeMoney });
    return { inStockCount: s.inStockCount, agedCount: s.agedCount, agingDays: ctx.agingDays, stockValue: s.stockValue };
  }

  if (name === "aged_units") {
    const units = await loadUnits(supabase, ctx.today);
    const limit = typeof args.limit === "number" && args.limit > 0 ? Math.min(args.limit, 20) : 5;
    return {
      agingDays: ctx.agingDays,
      units: agedUnits(units, ctx.agingDays, limit).map((u) => ({
        model: u.model ?? "ไม่ระบุรุ่น",
        branch: u.branchName,
        days: u.ageDays,
      })),
    };
  }

  if (name === "sales_this_month") {
    const monthStart = `${ctx.today.slice(0, 8)}01`;
    const { data } = await supabase.from("sale").select("sold_at, net_price, voided_at");
    const rows = (data ?? []).filter((s) => s.voided_at == null && s.sold_at >= monthStart);
    return {
      count: rows.length,
      total: ctx.canSeeMoney ? rows.reduce((n, s) => n + Number(s.net_price ?? 0), 0) : null,
    };
  }

  return { error: `ไม่รู้จักเครื่องมือ: ${name}` };
}
