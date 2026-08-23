import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getBranchesCached } from "@/lib/reference/cache";
import {
  canManagePlate,
  plateAgeDays,
  platePhase,
  plateWaitingSince,
  PLATE_STAGES,
  type PlateRow,
} from "@/lib/registration/plate";
import { RegistrationView } from "@/components/registration/RegistrationView";
import { recordDltSubmission, recordPlateReceived } from "./actions";

export const metadata = { title: "งานทะเบียน — Famai Motor Group" };

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

export default async function RegistrationPage() {
  const user = await getCurrentUser();
  if (!user || !canManagePlate(user.roleCodes)) {
    return (
      <p className="mx-auto max-w-md rounded-[12px] border border-dashed border-hairline p-8 text-center text-muted">
        งานทะเบียนเข้าได้เฉพาะผู้ดูแล / ผู้บริหาร / ฝ่ายบัญชี
      </p>
    );
  }

  const supabase = await createServerSupabase();
  const { data: regs } = await supabase
    .from("registration")
    .select("id, sale_id, branch_id, stage, plate_no, book_no, dlt_request_no, dlt_submitted_at, approved_at")
    .in("stage", [...PLATE_STAGES]);

  const rows = regs ?? [];
  const saleIds = rows.map((r) => r.sale_id);

  const [salesRes, unitsRes, variantsRes, colorsRes, customersRes, branches] = await Promise.all([
    saleIds.length
      ? supabase.from("sale").select("id, unit_id, customer_id, sold_at, voided_at").in("id", saleIds)
      : Promise.resolve({ data: [] as Array<{ id: string; unit_id: string | null; customer_id: string | null; sold_at: string; voided_at: string | null }> }),
    supabase.from("motorcycle_unit").select("id, variant_id, color_code, frame_no"),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    supabase.from("customer").select("id, full_name"),
    getBranchesCached(),
  ]);

  const saleMap = new Map((salesRes.data ?? []).map((s) => [s.id, s]));
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]));
  const variantName = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const colorName = new Map((colorsRes.data ?? []).map((c) => [`${c.variant_id}:${c.color_code}`, c.color_name]));
  const customerName = new Map((customersRes.data ?? []).map((c) => [c.id, c.full_name]));
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const today = todayISO();

  const queue: PlateRow[] = rows
    .map((r) => {
      const sale = saleMap.get(r.sale_id);
      if (!sale || sale.voided_at) {
        return null; // ดีลที่ถูกยกเลิกไม่ต้องอยู่ในคิว
      }
      const unit = sale.unit_id ? unitMap.get(sale.unit_id) : undefined;
      const model = unit ? variantName.get(unit.variant_id) : undefined;
      const color = unit ? colorName.get(`${unit.variant_id}:${unit.color_code}`) : undefined;
      const phase = platePhase({ stage: r.stage, plateNo: r.plate_no, dltRequestNo: r.dlt_request_no });
      const since = plateWaitingSince({ dltSubmittedAt: r.dlt_submitted_at, approvedAt: r.approved_at, soldAt: sale.sold_at });
      return {
        regId: r.id,
        saleId: r.sale_id,
        vehicle: model ? `${model}${color ? ` · ${color}` : ""}` : "—",
        frameNo: unit?.frame_no ?? "",
        customerName: (sale.customer_id && customerName.get(sale.customer_id)) || "ลูกค้าทั่วไป",
        branch: branchName.get(r.branch_id) ?? "—",
        stage: r.stage,
        phase,
        ageDays: plateAgeDays(since, today),
        dltRequestNo: r.dlt_request_no,
        dltSubmittedAt: r.dlt_submitted_at,
        plateNo: r.plate_no,
        bookNo: r.book_no,
      };
    })
    .filter((x): x is PlateRow => x !== null)
    .sort((a, b) => b.ageDays - a.ageDays); // ค้างนานสุดอยู่บน

  return (
    <RegistrationView
      queue={queue}
      recordSubmissionAction={recordDltSubmission}
      recordPlateAction={recordPlateReceived}
    />
  );
}
