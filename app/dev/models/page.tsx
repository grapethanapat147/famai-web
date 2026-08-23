"use client";

import { ModelsView } from "@/components/models/ModelsView";
import type { ModelPhotoResult } from "@/lib/models/image";
import type { AddModelResult, ModelRow } from "@/lib/models/rows";

/** พรีวิวหน้ารุ่นรถและสี (FAM-1009) — sample data · /models จริงต่อ DB ผ่าน RLS */

const ROWS: ModelRow[] = [
  {
    id: "1",
    code: "B6FU00",
    modelName: "FINN ล้อแม็ก",
    modelTh: "ฟินน์ ล้อแม็ก",
    category: "Moped",
    cc: 115,
    year: 2569,
    colors: [
      { code: "BL", name: "ฟ้า" },
      { code: "RD", name: "แดง" },
      { code: "BK", name: "ดำ" },
    ],
    cost: 40800,
    retail: 46900,
    stockCount: 8,
    photoPath: null,
  },
  {
    id: "2",
    code: "BTF200",
    modelName: "NMAX สแตนดาร์ด",
    modelTh: "เอ็นแม็กซ์ สแตนดาร์ด",
    category: "Automatic",
    cc: 155,
    year: 2569,
    colors: [
      { code: "GY", name: "เทา" },
      { code: "RD", name: "แดง" },
    ],
    cost: 78000,
    retail: 92000,
    stockCount: 3,
    photoPath: null,
  },
  {
    id: "3",
    code: "DR9200",
    modelName: "XMAX 300",
    modelTh: null,
    category: "Big Bike",
    cc: 292,
    year: 2569,
    colors: [{ code: "BK", name: "ดำ/เทา" }],
    cost: 175000,
    retail: 189000,
    stockCount: 0,
    photoPath: null,
  },
];

async function mockAddModel(formData: FormData): Promise<AddModelResult> {
  const code = String(formData.get("code") ?? "").trim();
  if (ROWS.some((r) => r.code === code)) {
    return { ok: false, error: "รหัสรุ่นนี้มีอยู่แล้ว (ตัวอย่าง)" };
  }
  return { ok: true };
}

async function mockSavePhoto(): Promise<ModelPhotoResult> {
  return { ok: true };
}

async function mockEditModel(formData: FormData): Promise<AddModelResult> {
  if (!String(formData.get("model_name") ?? "").trim()) {
    return { ok: false, error: "กรอกชื่อรุ่น" };
  }
  return { ok: true };
}

export default function DevModelsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">รุ่นรถและสี (preview)</h1>
        <p className="mt-1 text-ink-soft">FAM-1009/1024 · sample data — กด &ldquo;เพิ่มรุ่น&rdquo; หรือกดรูปเพื่ออัปโหลด (ของจริงต้อง Storage+auth)</p>
      </header>
      <ModelsView
        rows={ROWS}
        canSeeMoney
        canAdd
        photoBaseUrl=""
        action={mockAddModel}
        editAction={mockEditModel}
        canManagePhoto
        savePhotoAction={mockSavePhoto}
      />
    </main>
  );
}
