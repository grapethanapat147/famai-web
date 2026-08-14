"use client";

import { ImportView } from "@/components/import/ImportView";
import type { ImportActionResult } from "@/lib/import/units";

/** พรีวิวหน้านำเข้าข้อมูล (imp) — sample data · /imp จริง insert ผ่าน RLS */

const VARIANT_NAMES: Record<string, string> = { B6FU00: "FINN", BTF200: "NMAX", DR9200: "XMAX 300" };
const BRANCH_CODES = ["FMG01", "FMM01"];

// ตัวอย่างจากไฟล์ยามาฮ่า (3 คัน: 2 ดี, 1 รหัสรุ่นไม่รู้จัก)
const SAMPLE = `_file,DOC_BRANCH_CODE,รุ่นรถ,แบบรถ,รหัสผลิตภัณฑ์,รหัสสี,สี,หมายเลขเครื่อง,หมายเลขตัวถัง,ประเภทรถ,ต้นทุนต่อหน่วย,ภาษีของต้นทุนต่อหน่วย,วันที่ใบรับ,ชื่อเจ้าหนี้,เลขที่ใบกำกับภาษี,TAXID
110967fg.xls,FMG01,FINN,B6FU00,B6FU00010C,500,ฟ้า,E34RE-057401,MLEUE364111399878,รถใหม่,40800,2856,2024-09-11,บ.ยามาฮ่า,1946710,105507000645
110967fg.xls,FMG01,NMAX,BTF200,BTF200011A,011,ดำ,E3X8E-112097,MLEUG374100112097,รถใหม่,78000,5460,2024-09-11,บ.ยามาฮ่า,1946711,105507000645
110967fg.xls,FMG01,ไม่ทราบ,ZZZ999,ZZZ999,000,ขาว,E9Z9E-000001,MLEUZ999000000001,รถใหม่,50000,3500,2024-09-11,บ.ยามาฮ่า,1946712,105507000645`;

async function mockImport(formData: FormData): Promise<ImportActionResult> {
  const units = JSON.parse(String(formData.get("units") ?? "[]"));
  return { ok: true, inserted: Array.isArray(units) ? units.length : 0, skipped: 0 };
}

export default function DevImportPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">นำเข้าข้อมูล (preview)</h1>
        <p className="mt-1 text-ink-soft">sample data — กด &ldquo;ตรวจไฟล์&rdquo; เพื่อดูพรีวิว (แถวที่ 3 รหัสรุ่นไม่รู้จัก = ปัญหา)</p>
      </header>
      <ImportView variantNames={VARIANT_NAMES} branchCodes={BRANCH_CODES} canImport action={mockImport} initialText={SAMPLE} />
    </main>
  );
}
