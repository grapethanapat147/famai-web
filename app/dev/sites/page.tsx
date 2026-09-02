"use client";

import { useState } from "react";
import { SitesView, type SiteBranchOption } from "@/components/sites/SitesView";
import { validateSite, type LegacyGeoBranch, type SiteActionResult, type SiteRow } from "@/lib/branch/sites";

/** พรีวิวหน้าสาขา/จุดลงเวลา (sites) — sample data · ใช้ validateSite ตัวจริงเพื่อให้ error ตรงกับของจริง */

const BRANCHES: SiteBranchOption[] = [
  { id: "b1", name: "Famai Motor Group (ปทุมธานี)" },
  { id: "b2", name: "Famai Motor Group (รังสิต)" },
  { id: "b3", name: "Famai Motor Group (ลำลูกกา)" },
];

const SITES: SiteRow[] = [
  { id: "s1", branchId: "b1", branchName: BRANCHES[0].name, name: "หน้าร้านปทุมธานี", kind: "main", lat: 13.940315, lng: 100.5422, radiusM: 150, isActive: true },
  { id: "s2", branchId: "b1", branchName: BRANCHES[0].name, name: "โกดังอะไหล่", kind: "sub", lat: 13.9445, lng: 100.5488, radiusM: 100, isActive: true },
  { id: "s3", branchId: "b2", branchName: BRANCHES[1].name, name: "หน้าร้านรังสิต", kind: "main", lat: 13.9884, lng: 100.6172, radiusM: 200, isActive: true },
  { id: "s4", branchId: "b2", branchName: BRANCHES[1].name, name: "จุดเก่า (ปิดใช้)", kind: "other", lat: 13.9801, lng: 100.6099, radiusM: 80, isActive: false },
];

const LEGACY: LegacyGeoBranch[] = [{ id: "b3", name: BRANCHES[2].name, lat: 13.9812, lng: 100.7712, radiusM: 150 }];

export default function DevSitesPage() {
  const [sites, setSites] = useState(SITES);
  const [legacy, setLegacy] = useState(LEGACY);

  const mockImport: (formData: FormData) => Promise<SiteActionResult> = async (formData) => {
    const id = String(formData.get("branch_id") ?? "");
    const b = legacy.find((x) => x.id === id);
    if (!b) {
      return { ok: false, error: "บริษัทนี้ไม่มีพิกัดเก่าให้ย้าย" };
    }
    setSites((prev) => [...prev, { id: `imported-${b.id}`, branchId: b.id, branchName: b.name, name: b.name, kind: "main", lat: b.lat, lng: b.lng, radiusM: b.radiusM, isActive: true }]);
    setLegacy((prev) => prev.filter((x) => x.id !== id));
    return { ok: true, message: `ย้ายพิกัดของ ${b.name} มาเป็นจุดลงเวลาแล้ว` };
  };

  const mockSave: (formData: FormData) => Promise<SiteActionResult> = async (formData) => {
    const parsed = validateSite({
      branchId: String(formData.get("branch_id") ?? ""),
      name: String(formData.get("name") ?? ""),
      kind: String(formData.get("kind") ?? ""),
      lat: String(formData.get("lat") ?? ""),
      lng: String(formData.get("lng") ?? ""),
      radius: String(formData.get("radius") ?? ""),
    });
    if (!parsed.ok) {
      return parsed;
    }
    const id = String(formData.get("site_id") ?? "");
    const branchName = BRANCHES.find((b) => b.id === parsed.value.branchId)?.name ?? "";
    const isActive = String(formData.get("is_active") ?? "true") !== "false";
    const next: SiteRow = { id: id || `new-${sites.length + 1}`, branchName, isActive, ...parsed.value };
    setSites((prev) => (id ? prev.map((s) => (s.id === id ? next : s)) : [...prev, next]));
    return { ok: true, message: id ? "บันทึกจุดลงเวลาแล้ว" : "เพิ่มจุดลงเวลาแล้ว" };
  };

  return <SitesView sites={sites} branches={BRANCHES} legacyGeo={legacy} action={mockSave} importAction={mockImport} />;
}
