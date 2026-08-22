"use client";

import { useState } from "react";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { parseCsv } from "@/lib/import/csv";
import { basicErrors, duplicateEngines, extractUnits, type ImportActionResult, type ImportUnit } from "@/lib/import/units";

type Checked = { unit: ImportUnit; errors: string[]; unknownBranch: boolean };

export function ImportView({
  variantNames,
  branchCodes,
  canImport,
  action,
  initialText = "",
}: {
  variantNames: Record<string, string>;
  branchCodes: string[];
  canImport: boolean;
  action: (formData: FormData) => Promise<ImportActionResult>;
  initialText?: string;
}) {
  const [text, setText] = useState(initialText);
  const [checked, setChecked] = useState<Checked[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);

  const branchSet = new Set(branchCodes);

  function check() {
    setResult(null);
    setError(null);
    const parsed = parseCsv(text);
    const units = extractUnits(parsed);
    const dups = duplicateEngines(units);
    const rows: Checked[] = units.map((unit) => {
      const errors = [...basicErrors(unit)];
      if (unit.variantCode && !(unit.variantCode in variantNames)) {
        errors.push(`ไม่รู้จักรหัสรุ่น ${unit.variantCode}`);
      }
      if (unit.engineNo && dups.has(unit.engineNo)) {
        errors.push("เลขเครื่องซ้ำในไฟล์");
      }
      return { unit, errors, unknownBranch: Boolean(unit.branchCode) && !branchSet.has(unit.branchCode) };
    });
    setChecked(rows);
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setText(String(reader.result ?? ""));
      setChecked(null);
    };
    reader.readAsText(f, "utf-8");
  }

  const okRows = checked?.filter((r) => r.errors.length === 0) ?? [];
  const badCount = (checked?.length ?? 0) - okRows.length;

  async function commit() {
    if (!canImport || okRows.length === 0 || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("units", JSON.stringify(okRows.map((r) => r.unit)));
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setResult({ inserted: res.inserted, skipped: res.skipped });
      setChecked(null);
      setText("");
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
        <h2 className="font-display font-semibold text-ink">นำเข้ารถจากไฟล์ยามาฮ่า</h2>
        <p className="mb-3 text-sm text-muted">
          แปลงไฟล์ .xls เป็น CSV (Excel → Save As CSV) แล้ววางข้อความ หรือเลือกไฟล์ — ระบบจับหัวคอลัมน์ไทยให้เอง
        </p>

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft">
            เลือกไฟล์ CSV
            <input type="file" accept=".csv,text/csv,text/plain" onChange={onFile} className="hidden" />
          </label>
          <span className="text-xs text-muted">หรือวางข้อมูลด้านล่าง</span>
        </div>

        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setChecked(null);
          }}
          rows={5}
          placeholder="วางข้อมูล CSV/TSV ที่นี่ (บรรทัดแรกเป็นหัวคอลัมน์)"
          className="w-full rounded-[8px] border border-hairline bg-card px-3 py-2 font-mono text-xs text-ink outline-none focus:border-ink"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => check()}
            disabled={text.trim() === ""}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            ตรวจไฟล์
          </button>
          {result && <StatusBadge variant="good">นำเข้าแล้ว {result.inserted} คัน · ข้าม {result.skipped}</StatusBadge>}
          {error && <StatusBadge variant="bad">{error}</StatusBadge>}
        </div>
      </div>

      {checked && (
        <div className="mt-4 rounded-[12px] bg-card p-4 shadow-[var(--sh-sm)]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display font-semibold text-ink">
              พรีวิว · <span className="text-pos">{okRows.length} พร้อมนำเข้า</span>
              {badCount > 0 && <span className="text-accent"> · {badCount} มีปัญหา</span>}
            </h3>
            {canImport && (
              <button
                type="button"
                onClick={commit}
                disabled={okRows.length === 0 || busy}
                className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
              >
                {busy ? "กำลังนำเข้า…" : `นำเข้า ${okRows.length} คัน`}
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-card">
                <tr className="border-b border-hairline text-left">
                  <th className="py-2 pr-3 font-medium text-muted">รุ่น / สี</th>
                  <th className="py-2 px-3 font-medium text-muted">เลขเครื่อง</th>
                  <th className="py-2 px-3 text-right font-medium text-muted">ต้นทุน</th>
                  <th className="py-2 px-3 font-medium text-muted">รับเข้า</th>
                  <th className="py-2 pl-3 font-medium text-muted">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {checked.map((r, i) => (
                  <tr key={i} className="border-b border-hairline-2 align-top">
                    <td className="py-1.5 pr-3">
                      {(variantNames[r.unit.variantCode] ?? r.unit.variantCode) || "—"} · <span className="text-ink-soft">{r.unit.colorName}</span>
                      {r.unknownBranch && <span className="ml-1 text-[11px] text-attn">(สาขา {r.unit.branchCode}?)</span>}
                    </td>
                    <td className="py-1.5 px-3 font-mono text-xs">{r.unit.engineNo || "—"}</td>
                    <td className="py-1.5 px-3 text-right"><Money value={r.unit.cost} /></td>
                    <td className="py-1.5 px-3 text-ink-soft">{r.unit.receivedAt || "—"}</td>
                    <td className="py-1.5 pl-3">
                      {r.errors.length === 0 ? (
                        <StatusBadge variant="good">พร้อม</StatusBadge>
                      ) : (
                        <span className="text-xs text-accent">{r.errors.join(" · ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
