"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  activeSiteCount,
  RADIUS_MAX,
  RADIUS_MIN,
  SITE_KIND_LABEL,
  type SiteActionResult,
  type SiteKind,
  type SiteRow,
} from "@/lib/branch/sites";

export type SiteBranchOption = { id: string; name: string };

const inputCls = "w-full rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

export function SitesView({
  sites,
  branches,
  action,
}: {
  sites: SiteRow[];
  branches: SiteBranchOption[];
  action: (formData: FormData) => Promise<SiteActionResult>;
}) {
  const [search, setSearch] = useState("");
  const [branchId, setBranchId] = useState("all");
  const [editing, setEditing] = useState<SiteRow | null>(null);
  const [adding, setAdding] = useState(false);

  const q = search.trim().toLowerCase();
  const rows = sites.filter((s) => {
    if (branchId !== "all" && s.branchId !== branchId) {
      return false;
    }
    return q === "" || `${s.name} ${s.branchName}`.toLowerCase().includes(q);
  });

  // บริษัทที่ยังไม่มีจุดลงเวลา = ลงเวลาที่ไหนก็ได้ (ไม่มีอะไรให้เทียบ) — ต้องเตือน
  const branchesWithoutSite = useMemo(
    () => branches.filter((b) => activeSiteCount(sites, b.id) === 0),
    [branches, sites],
  );

  const columns: Column<SiteRow>[] = [
    {
      key: "name",
      header: "สาขา / บริษัท",
      primary: true,
      render: (s) => (
        <span>
          {s.name} <span className="text-muted">· {s.branchName}</span>
          {!s.isActive && <span className="ml-1 text-[11px] text-accent">(ปิดใช้)</span>}
        </span>
      ),
    },
    { key: "kind", header: "ประเภท", render: (s) => <span className="text-ink-soft">{SITE_KIND_LABEL[s.kind]}</span> },
    {
      key: "geo",
      header: "พิกัด / รัศมี",
      render: (s) => (
        <span className="text-xs text-ink-soft">
          <span className="font-mono">
            {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
          </span>
          <span className="ml-1.5 text-muted">· {s.radiusM} ม.</span>
        </span>
      ),
    },
    {
      key: "map",
      header: "",
      render: (s) => (
        <a
          href={`https://www.google.com/maps?q=${s.lat},${s.lng}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-accent hover:underline"
          title="เปิดใน Google Maps"
        >
          ดูแผนที่ ↗
        </a>
      ),
    },
    {
      key: "edit",
      header: "",
      align: "right",
      render: (s) => (
        <button
          type="button"
          onClick={() => setEditing(s)}
          className="rounded-[20px] border border-hairline px-3.5 py-2 text-xs text-ink-soft transition-transform active:scale-[0.97] hover:text-ink"
        >
          แก้ไข
        </button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">{sites.filter((s) => s.isActive).length} สาขาที่เปิดใช้งาน</p>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.98]"
        >
          + เพิ่มสาขา
        </button>
      </div>

      {branchesWithoutSite.length > 0 && (
        <div className="mb-4">
          <StatusBadge variant="warn">
            ยังไม่ได้ปักหมุด: {branchesWithoutSite.map((b) => b.name).join(", ")} — พนักงานบริษัทนี้ลงเวลาที่ไหนก็ได้
          </StatusBadge>
        </div>
      )}

      <div className="mb-4">
        <FilterBar summary={`กำลังดู: ${rows.length} สาขา`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาสาขา"
            placeholder="ค้นชื่อสาขา / บริษัท"
            className={`${inputCls} sm:w-56`}
          />
          {branches.length > 1 && (
            <select aria-label="กรองตามบริษัท" value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
              <option value="all">ทุกบริษัท</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        empty={
          <EmptyState
            icon="card"
            title={sites.length ? "ไม่พบสาขาตามเงื่อนไข" : "ยังไม่มีสาขา"}
            description={
              sites.length
                ? "ลองปรับคำค้นหรือตัวกรอง"
                : "เพิ่มสาขาพร้อมพิกัด เพื่อให้พนักงานลงเวลาได้เฉพาะเมื่ออยู่ในพื้นที่"
            }
            action={sites.length === 0 ? { label: "เพิ่มสาขา", onClick: () => setAdding(true) } : undefined}
          />
        }
      />

      {(adding || editing) && (
        <SiteModal
          key={editing?.id ?? "new"}
          site={editing}
          branches={branches}
          action={action}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-ink-soft">
      {label}
      {children}
      {hint && <span className="text-[11px] text-muted">{hint}</span>}
    </label>
  );
}

function SiteModal({
  site,
  branches,
  action,
  onClose,
}: {
  site: SiteRow | null;
  branches: SiteBranchOption[];
  action: (formData: FormData) => Promise<SiteActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [branchId, setBranchId] = useState(site?.branchId ?? branches[0]?.id ?? "");
  const [name, setName] = useState(site?.name ?? "");
  const [kind, setKind] = useState<SiteKind>(site?.kind ?? "main");
  const [lat, setLat] = useState(site ? String(site.lat) : "");
  const [lng, setLng] = useState(site ? String(site.lng) : "");
  const [radius, setRadius] = useState(String(site?.radiusM ?? 150));
  const [isActive, setIsActive] = useState(site?.isActive ?? true);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function useHere() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("อุปกรณ์นี้ไม่รองรับ GPS");
      return;
    }
    setLocating(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setLocating(false);
      },
      () => {
        setError("ขอตำแหน่งไม่สำเร็จ — อนุญาต GPS แล้วลองใหม่");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    if (site) {
      fd.set("site_id", site.id);
    }
    fd.set("branch_id", branchId);
    fd.set("name", name);
    fd.set("kind", kind);
    fd.set("lat", lat);
    fd.set("lng", lng);
    fd.set("radius", radius);
    fd.set("is_active", String(isActive));
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      router.refresh();
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open onClose={onClose} title={site ? `แก้ไขสาขา — ${site.name}` : "เพิ่มสาขา"} size="lg">
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="บริษัท *">
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className={inputCls}>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="ชื่อสาขา *" hint="ห้ามซ้ำภายในบริษัทเดียวกัน">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น สาขาปทุมธานี" className={inputCls} />
          </Field>
          <Field label="ประเภท">
            <select value={kind} onChange={(e) => setKind(e.target.value as SiteKind)} className={inputCls}>
              <option value="main">สาขาหลัก</option>
              <option value="sub">สาขาย่อย</option>
              <option value="other">จุดอื่นๆ</option>
            </select>
          </Field>
          <Field label={`รัศมีลงเวลา (${RADIUS_MIN}–${RADIUS_MAX} ม.)`} hint="พนักงานลงเวลาได้เมื่ออยู่ในรัศมีนี้">
            <input
              type="number"
              inputMode="numeric"
              min={RADIUS_MIN}
              max={RADIUS_MAX}
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="ละติจูด *">
            <input value={lat} onChange={(e) => setLat(e.target.value)} inputMode="decimal" placeholder="13.94031" className={`${inputCls} font-mono`} />
          </Field>
          <Field label="ลองจิจูด *">
            <input value={lng} onChange={(e) => setLng(e.target.value)} inputMode="decimal" placeholder="100.54220" className={`${inputCls} font-mono`} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={useHere}
            disabled={locating}
            className="rounded-[20px] border border-hairline px-3.5 py-2 text-xs text-ink-soft transition-transform active:scale-[0.97] hover:text-ink disabled:opacity-50"
          >
            📍 {locating ? "กำลังหาตำแหน่ง…" : "ใช้ตำแหน่งปัจจุบัน"}
          </button>
          {lat && lng && (
            <a
              href={`https://www.google.com/maps?q=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-accent hover:underline"
            >
              ตรวจบนแผนที่ ↗
            </a>
          )}
        </div>
        <p className="text-xs text-muted">
          หาพิกัดจาก Google Maps: คลิกขวาที่จุดของร้าน → กดตัวเลขพิกัดเพื่อคัดลอก แล้ววางลงช่องละติจูด/ลองจิจูด
        </p>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          เปิดใช้งาน (ปิด = ไม่ใช้จุดนี้ตรวจการลงเวลา)
        </label>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : site ? "บันทึก" : "เพิ่มสาขา"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
