"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { FilterBar } from "@/components/ui/FilterBar";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Drawer } from "@/components/ui/Drawer";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import {
  STATUS_META,
  STATUS_FILTER_ORDER,
  agingVariant,
  filterUnits,
  modelOptions,
  type StockUnit,
} from "@/lib/stock/units";

const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

export function StockView({
  units,
  canSeeMoney,
  agingDays,
  initialUnitId,
}: {
  units: StockUnit[];
  canSeeMoney: boolean;
  agingDays: number;
  initialUnitId?: string;
}) {
  const [branch, setBranch] = useState("all");
  const [model, setModel] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  // deep-link จาก /stock?unit=<id> (เช่น การ์ด "รถค้างนานสุด" ใน Dashboard) → เปิดแผงคันนั้นเลย
  const [selected, setSelected] = useState<StockUnit | null>(
    () => (initialUnitId ? (units.find((u) => u.id === initialUnitId) ?? null) : null),
  );

  // ปิดแผง + ล้าง ?unit ออกจาก URL (replaceState = cosmetic ล้วน ไม่ re-fetch/reload ตาราง)
  function closeDrawer() {
    setSelected(null);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      if (url.searchParams.has("unit")) {
        url.searchParams.delete("unit");
        window.history.replaceState(null, "", url.pathname + url.search);
      }
    }
  }

  const branches = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of units) map.set(u.branchCode, u.branchName);
    return [...map].map(([code, name]) => ({ code, name }));
  }, [units]);

  const models = useMemo(() => modelOptions(units), [units]);

  const rows = useMemo(
    () => filterUnits(units, { branch, model, status, search }),
    [units, branch, model, status, search],
  );

  const isFiltered = branch !== "all" || model !== "all" || status !== "all" || search.trim() !== "";
  function resetFilters() {
    setBranch("all");
    setModel("all");
    setStatus("all");
    setSearch("");
  }

  const parts = [`${rows.length} คัน`];
  if (branch !== "all") parts.push(branches.find((b) => b.code === branch)?.name ?? branch);
  if (model !== "all") {
    const m = models.find((x) => x.code === model);
    parts.push(m ? `${m.name} · ${m.code}` : model);
  }
  if (status !== "all") parts.push(STATUS_META[status as keyof typeof STATUS_META]?.label ?? status);
  const summary = `กำลังดู: ${parts.join(" · ")}`;

  const columns: Column<StockUnit>[] = [
    {
      key: "model",
      header: "รุ่น / สี",
      primary: true,
      render: (u) => (
        <span className="inline-flex items-center gap-2">
          {u.photoUrl && (
            <Image src={u.photoUrl} alt="" width={28} height={28} className="h-7 w-7 rounded-[6px] object-cover" unoptimized />
          )}
          <span>
            {u.modelName} <span className="font-mono text-[11px] text-muted">{u.modelCode}</span> · {u.colorName}
          </span>
        </span>
      ),
    },
    { key: "engine", header: "เลขเครื่อง", render: (u) => <span className="font-mono text-xs">{u.engineNo}</span> },
    {
      key: "age",
      header: "อายุสต๊อก",
      render: (u) => <StatusBadge variant={agingVariant(u.ageDays, agingDays)}>{u.ageDays} วัน</StatusBadge>,
    },
    {
      key: "status",
      header: "สถานะ",
      render: (u) => <StatusBadge variant={STATUS_META[u.status].variant}>{STATUS_META[u.status].label}</StatusBadge>,
    },
    ...(canSeeMoney
      ? [{ key: "cost", header: "ต้นทุน", align: "right" as const, render: (u: StockUnit) => <Money value={u.cost ?? null} /> }]
      : []),
    { key: "retail", header: "ราคาขาย", align: "right", render: (u) => <Money value={u.retail} /> },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4">
        <FilterBar summary={summary}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหาเลขเครื่อง / รุ่น"
            placeholder="ค้นเลขเครื่อง / รุ่น"
            className={`${selectClass} w-full sm:w-56`}
          />
          {branches.length > 1 && (
            <select aria-label="กรองตามบริษัท" value={branch} onChange={(e) => setBranch(e.target.value)} className={selectClass}>
              <option value="all">ทุกบริษัท</option>
              {branches.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
          <select aria-label="กรองตามรุ่น" value={model} onChange={(e) => setModel(e.target.value)} className={selectClass}>
            <option value="all">ทุกรุ่น</option>
            {models.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name} · {m.code}
              </option>
            ))}
          </select>
          <Chips
            value={status}
            onChange={setStatus}
            options={[
              { value: "all", label: "ทุกสถานะ" },
              ...STATUS_FILTER_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label })),
            ]}
          />
        </FilterBar>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(u) => u.id}
        onRowClick={setSelected}
        empty={
          units.length > 0 ? (
            <EmptyState
              icon="bike"
              title="ไม่พบรถตามเงื่อนไข"
              description="ลองปรับตัวกรองหรือคำค้นใหม่"
              action={isFiltered ? { label: "ล้างตัวกรอง", onClick: resetFilters } : undefined}
            />
          ) : (
            <EmptyState
              icon="bike"
              title="ยังไม่มีรถในสต๊อก"
              description="เริ่มต้นด้วยการรับรถเข้าสต๊อก หรือนำเข้าจากไฟล์ยามาฮ่า"
              action={{ label: "รับรถเข้าสต๊อก", href: "/recv" }}
            />
          )
        }
      />

      <Drawer
        open={selected !== null}
        onClose={closeDrawer}
        title={selected ? `${selected.modelName} · ${selected.colorName}` : ""}
      >
        {selected && (
          <div className="flex flex-col gap-3 text-sm">
            {selected.photoUrl && (
              <Image
                src={selected.photoUrl}
                alt=""
                width={388}
                height={218}
                unoptimized
                className="w-full rounded-[12px] object-cover"
              />
            )}
            <Row label="รหัสรุ่น">{selected.modelCode}</Row>
            <Row label="บริษัท">{selected.branchName}</Row>
            <Row label="เลขเครื่อง"><span className="font-mono">{selected.engineNo}</span></Row>
            <Row label="เลขตัวถัง"><span className="font-mono">{selected.frameNo}</span></Row>
            <Row label="วันที่รับเข้า">{formatThaiDate(selected.receivedAt)}</Row>
            <Row label="อายุสต๊อก">
              <StatusBadge variant={agingVariant(selected.ageDays, agingDays)}>{selected.ageDays} วัน</StatusBadge>
            </Row>
            <Row label="สถานะ">
              <StatusBadge variant={STATUS_META[selected.status].variant}>{STATUS_META[selected.status].label}</StatusBadge>
            </Row>
            {canSeeMoney && <Row label="ต้นทุน"><Money value={selected.cost ?? null} /></Row>}
            <Row label="ราคาขาย"><Money value={selected.retail} /></Row>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline-2 pb-2 last:border-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
