"use client";

import { SettingsView } from "@/components/settings/SettingsView";
import { ThemeSettings } from "@/components/theme/ThemeSettings";
import { CompanyInfoView } from "@/components/settings/CompanyInfoView";
import { SETTING_DEFAULTS } from "@/lib/settings/resolve";
import { DEFAULT_ACCENT } from "@/lib/theme/derive";
import type { SettingsActionResult } from "@/lib/settings/fields";
import type { ThemeActionResult } from "@/lib/theme/config";
import type { OrgInfoActionResult } from "@/lib/org/info";

/** พรีวิวหน้าตั้งค่าระบบ (settings) — ค่า default · /settings จริงต่อ DB ผ่าน RLS (admin เขียนได้) */

async function mockSave(formData: FormData): Promise<SettingsActionResult> {
  const vat = String(formData.get("vat_pct"));
  if (vat === "") {
    return { ok: false, error: "ภาษีมูลค่าเพิ่ม: กรอกตัวเลข" };
  }
  return { ok: true };
}

async function mockTheme(): Promise<ThemeActionResult> {
  return { ok: true };
}

async function mockOrg(formData: FormData): Promise<OrgInfoActionResult> {
  const tax = String(formData.get("company_tax_id") ?? "").trim();
  if (tax !== "" && !/^\d{13}$/.test(tax)) {
    return { ok: false, error: "เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก" };
  }
  return { ok: true };
}

const DEV_COMPANY = { id: "co1", code: "FAMAI", name: "Famai Motor Group", taxId: "", address: "", phone: "" };
const DEV_BRANCHES = [
  { id: "b1", code: "FMG01", name: "Famai Motor Group", taxId: "", address: "สำนักงานใหญ่", phone: "" },
  { id: "b2", code: "FMM01", name: "Famai Motor", taxId: "", address: "สาขา 1", phone: "" },
  { id: "b3", code: "FCG01", name: "Famai Center Group", taxId: "", address: "สาขา 2", phone: "" },
];

export default function DevSettingsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">ตั้งค่าระบบ (preview)</h1>
        <p className="mt-1 text-ink-soft">ค่า default — แก้ค่าแล้วกดบันทึก (mock) · int-list กรอกผิดจะเตือนสด</p>
      </header>
      <SettingsView settings={SETTING_DEFAULTS} canEdit action={mockSave} />
      <div className="mt-4">
        <CompanyInfoView company={DEV_COMPANY} branches={DEV_BRANCHES} canEdit action={mockOrg} />
      </div>
      <div className="mt-4">
        <ThemeSettings currentAccent={DEFAULT_ACCENT} currentFontPair="noto-inter" currentCustomFont="" canEdit action={mockTheme} />
      </div>
    </main>
  );
}
