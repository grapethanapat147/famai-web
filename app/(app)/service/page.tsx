import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { getActiveBranches, getCompaniesCached } from "@/lib/reference/cache";
import { isRegStage } from "@/lib/deal/stage";
import type { PurchaseHistoryItem } from "@/components/customer/CustomerHistoryPanel";
import { canManageService, type ServiceJob, type ServiceLine } from "@/lib/service/jobs";
import { isServiceStatus, type ServiceStatus } from "@/lib/service/status";
import { ServiceView, type ServiceCreateOptions, type ServiceLineOptions } from "@/components/service/ServiceView";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";
import { addServiceLine, advanceStatus, createServiceJob, removeServiceLine } from "./actions";

export const metadata = { title: "ศูนย์ซ่อม — Famai Motor Group" };

export default async function ServicePage() {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser();

  // RLS คัดให้เห็นเฉพาะบริษัทที่เข้าถึงได้ (เว้น allBranch)
  // จำกัด 200 งานล่าสุด (FAM-1108) — งานซ่อมโตเร็วสุดของร้าน งานเก่าที่ปิดแล้วไม่ต้องแบกทุกครั้ง
  const { data: jobRows } = await supabase
    .from("service_job")
    .select(
      "id, job_no, customer_id, unit_id, engine_no, frame_no, odometer_km, service_type, symptom, status, checked_in_at, technician_id, labor_cost, parts_cost, total",
    )
    .order("checked_in_at", { ascending: false })
    .limit(200);
  const jobs = jobRows ?? [];
  const jobIds = jobs.map((j) => j.id);

  const customerIds = [...new Set(jobs.map((j) => j.customer_id).filter((id): id is string => Boolean(id)))];

  const [linesRes, customersRes, techsRes, unitsRes, variantsRes, colorsRes, partsRes, branches, orgCompanies, salesRes, regsRes] = await Promise.all([
    jobIds.length
      ? supabase.from("service_job_line").select("id, job_id, kind, description, qty, unit_price, amount").in("job_id", jobIds)
      : Promise.resolve({ data: [] }),
    supabase.from("customer").select("id, full_name"),
    supabase.from("app_user").select("id, full_name"),
    supabase.from("motorcycle_unit").select("id, variant_id, color_code, engine_no, frame_no"),
    supabase.from("model_variant").select("id, model_name"),
    supabase.from("model_color").select("variant_id, color_code, color_name"),
    supabase.from("part").select("id, name, price, qty_on_hand").order("name"),
    getActiveBranches(),
    getCompaniesCached(),
    // ประวัติการซื้อของลูกค้าที่มีใบงานอยู่ — เปิดดูจากหน้าซ่อมได้เลย (fixlist ข้อ 17)
    customerIds.length
      ? supabase.from("sale").select("id, customer_id, unit_id, sold_at").in("customer_id", customerIds).is("voided_at", null)
      : Promise.resolve({ data: [] }),
    customerIds.length ? supabase.from("registration").select("sale_id, stage") : Promise.resolve({ data: [] }),
  ]);

  const customerName = new Map((customersRes.data ?? []).map((c) => [c.id, c.full_name]));
  const techName = new Map((techsRes.data ?? []).map((t) => [t.id, t.full_name]));
  const variantName = new Map((variantsRes.data ?? []).map((v) => [v.id, v.model_name]));
  const colorName = new Map((colorsRes.data ?? []).map((c) => [`${c.variant_id}:${c.color_code}`, c.color_name]));
  const unitMap = new Map((unitsRes.data ?? []).map((u) => [u.id, u]));

  const linesByJob = new Map<string, ServiceLine[]>();
  for (const ln of linesRes.data ?? []) {
    const list = linesByJob.get(ln.job_id) ?? [];
    list.push({
      id: String(ln.id),
      kind: ln.kind === "part" ? "part" : "labor",
      description: ln.description ?? "",
      qty: Number(ln.qty),
      unitPrice: Number(ln.unit_price),
      amount: Number(ln.amount),
    });
    linesByJob.set(ln.job_id, list);
  }

  const viewJobs: ServiceJob[] = jobs.map((j) => {
    const unit = j.unit_id ? unitMap.get(j.unit_id) : undefined;
    const model = unit ? variantName.get(unit.variant_id) : undefined;
    const color = unit ? colorName.get(`${unit.variant_id}:${unit.color_code}`) : undefined;
    const vehicle = model ? `${model}${color ? ` · ${color}` : ""}` : j.engine_no || j.frame_no || "รถนอก";
    const status: ServiceStatus = isServiceStatus(j.status) ? j.status : "รับเข้า";
    return {
      id: j.id,
      jobNo: j.job_no,
      customerName: (j.customer_id && customerName.get(j.customer_id)) || "ลูกค้าทั่วไป",
      vehicle,
      engineNo: j.engine_no || unit?.engine_no || "",
      frameNo: j.frame_no || unit?.frame_no || "",
      customerId: j.customer_id ?? null,
      odometerKm: j.odometer_km,
      serviceType: j.service_type || "อื่นๆ",
      symptom: j.symptom || "",
      status,
      technicianName: (j.technician_id && techName.get(j.technician_id)) || null,
      checkedInAt: j.checked_in_at,
      laborCost: Number(j.labor_cost),
      partsCost: Number(j.parts_cost),
      total: Number(j.total),
      lines: linesByJob.get(j.id) ?? [],
    };
  });

  const stageBySale = new Map((regsRes.data ?? []).map((r) => [r.sale_id, r.stage]));
  const purchases: Record<string, PurchaseHistoryItem[]> = {};
  for (const s of salesRes.data ?? []) {
    const unit = unitMap.get(s.unit_id);
    const model = unit ? variantName.get(unit.variant_id) : undefined;
    const color = unit ? colorName.get(`${unit.variant_id}:${unit.color_code}`) : undefined;
    const rawStage = stageBySale.get(s.id) ?? "";
    const list = purchases[s.customer_id] ?? [];
    list.push({
      key: s.id,
      vehicle: model ? `${model}${color ? ` · ${color}` : ""}` : "—",
      soldAt: s.sold_at,
      stage: isRegStage(rawStage) ? rawStage : "ขายแล้ว",
    });
    purchases[s.customer_id] = list;
  }
  for (const list of Object.values(purchases)) {
    list.sort((a, b) => (a.soldAt < b.soldAt ? 1 : a.soldAt > b.soldAt ? -1 : 0));
  }

  const createOptions: ServiceCreateOptions = {
    customers: (customersRes.data ?? []).map((c) => ({ id: c.id, name: c.full_name })),
    technicians: (techsRes.data ?? []).map((t) => ({ id: t.id, name: t.full_name })),
    units: (unitsRes.data ?? []).map((u) => {
      const model = variantName.get(u.variant_id);
      const color = colorName.get(`${u.variant_id}:${u.color_code}`);
      return {
        id: u.id,
        label: `${model ?? "รถ"}${color ? ` · ${color}` : ""} · ${u.engine_no}`,
        engineNo: u.engine_no,
        frameNo: u.frame_no ?? "",
      };
    }),
  };

  const lineOptions: ServiceLineOptions = {
    parts: (partsRes.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      qtyOnHand: Number(p.qty_on_hand),
    })),
  };

  const userBranch = branches.find((b) => user?.branchIds.includes(b.id)) ?? branches[0] ?? null;
  const org = userBranch?.company_id
    ? orgCompanies.find((c) => c.id === userBranch.company_id) ?? null
    : null;
  const seller: QuoteSeller = {
    shopName: org?.name ?? "Famai Motor Group",
    branchName: userBranch?.name ?? "สำนักงานใหญ่",
    address: userBranch?.address ?? org?.address ?? null,
    phone: userBranch?.phone ?? org?.phone ?? null,
    taxId: userBranch?.tax_id ?? org?.tax_id ?? null,
    sellerName: user?.fullName ?? "",
  };

  return (
    <ServiceView
      jobs={viewJobs}
      purchases={purchases}
      seller={seller}
      canManage={canManageService(user?.roleCodes ?? [])}
      action={advanceStatus}
      createOptions={createOptions}
      createAction={createServiceJob}
      lineOptions={lineOptions}
      lineAction={addServiceLine}
      removeLineAction={removeServiceLine}
    />
  );
}
