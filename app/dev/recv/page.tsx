"use client";

import { RecvForm } from "@/components/recv/RecvForm";
import type { RecvActionResult, RecvBranch, RecvVariant } from "@/lib/recv/recv";

/** พรีวิวหน้ารับรถเข้าสต๊อก (FAM-1085) — sample data · /recv จริง insert motorcycle_unit ตาม RLS */

const VARIANTS: RecvVariant[] = [
  { id: "v1", code: "B6FU00", modelName: "FINN", modelTh: "FINN ล้อแม็ก", colors: [{ code: "10", name: "ฟ้า" }, { code: "20", name: "ดำ" }] },
  { id: "v2", code: "BTF200", modelName: "NMAX", modelTh: "NMAX สแตนดาร์ด", colors: [{ code: "01", name: "แดง" }, { code: "02", name: "เทา" }] },
  { id: "v3", code: "DR9200", modelName: "XMAX 300", modelTh: "XMAX 300", colors: [{ code: "99", name: "ดำ/เทา" }] },
];

const BRANCHES: RecvBranch[] = [
  { id: "b1", code: "FMG01", name: "Famai Motor Group" },
  { id: "b2", code: "FMM01", name: "Famai Motor" },
  { id: "b3", code: "FMC01", name: "Famai Center" },
];

async function mockRecv(formData: FormData): Promise<RecvActionResult> {
  const engine = String(formData.get("engine_no") ?? "").trim();
  if (!engine) {
    return { ok: false, error: "กรอกเลขเครื่อง" };
  }
  if (engine === "DUP") {
    return { ok: false, error: `เลขเครื่อง ${engine} มีอยู่ในระบบแล้ว` };
  }
  return { ok: true, engineNo: engine };
}

export default function DevRecvPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">รับรถเข้าสต๊อก (preview)</h1>
        <p className="mt-1 text-ink-soft">FAM-1085 · sample data — เลือกรุ่น/สี/สาขา + เลขเครื่อง/ตัวถัง → ยืนยัน → บันทึก (mock) · พิมพ์ DUP ที่เลขเครื่องเพื่อลองเคสซ้ำ</p>
      </header>
      <RecvForm variants={VARIANTS} branches={BRANCHES} defaultBranchId="b1" vatPct={7} canSeeMoney action={mockRecv} />
    </main>
  );
}
