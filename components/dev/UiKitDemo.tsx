"use client";

import { useState } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Money } from "@/components/ui/Money";
import { StatusBadge, type StatusVariant } from "@/components/ui/StatusBadge";
import { DataSourceBadge } from "@/components/ui/DataSourceBadge";
import { Chips } from "@/components/ui/Chips";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { formatThaiDate } from "@/lib/format";

type Unit = {
  id: string;
  model: string;
  color: string;
  engine: string;
  received: string;
  ageDays: number;
  status: "available" | "reserved" | "sold";
  cost: number;
  retail: number | null;
};

const UNITS: Unit[] = [
  { id: "1", model: "FINN ล้อแม็ก", color: "ฟ้า", engine: "E34RE-057401", received: "2024-09-11", ageDays: 12, status: "available", cost: 40800, retail: 46900 },
  { id: "2", model: "NMAX สแตนดาร์ด", color: "แดง", engine: "E3X8E-112097", received: "2024-05-02", ageDays: 95, status: "available", cost: 78000, retail: null },
  { id: "3", model: "Grand Filano Hybrid", color: "เทา", engine: "E9L2E-004411", received: "2025-06-20", ageDays: 40, status: "reserved", cost: 62000, retail: 69900 },
  { id: "4", model: "XMAX 300", color: "ดำ", engine: "EA71E-900233", received: "2026-07-30", ageDays: 5, status: "sold", cost: 175000, retail: 189000 },
];

const STATUS_META: Record<Unit["status"], { variant: StatusVariant; label: string }> = {
  available: { variant: "good", label: "พร้อมขาย" },
  reserved: { variant: "info", label: "จองแล้ว" },
  sold: { variant: "off", label: "ขายแล้ว" },
};

const AGING_DAYS = 90; // จาก app_setting (FAM-1004) — hardcode ในโชว์เคสเท่านั้น

function ageVariant(age: number): StatusVariant {
  if (age <= AGING_DAYS / 3) return "good";
  if (age <= AGING_DAYS) return "warn";
  return "bad";
}

export function UiKitDemo() {
  const [status, setStatus] = useState<"all" | Unit["status"]>("all");
  const [showMoney, setShowMoney] = useState(true);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const rows = UNITS.filter((u) => status === "all" || u.status === status);
  const summary = `กำลังดู: ${status === "all" ? "ทุกสถานะ" : STATUS_META[status].label} · ${rows.length} คัน · สิทธิ์ต้นทุน: ${showMoney ? "เห็น" : "ซ่อน"}`;

  const columns: Column<Unit>[] = [
    { key: "model", header: "รุ่น / สี", primary: true, render: (u) => `${u.model} · ${u.color}` },
    { key: "engine", header: "เลขเครื่อง", render: (u) => <span className="font-mono text-xs">{u.engine}</span> },
    { key: "age", header: "อายุสต๊อก", render: (u) => <StatusBadge variant={ageVariant(u.ageDays)}>{u.ageDays} วัน</StatusBadge> },
    { key: "status", header: "สถานะ", render: (u) => <StatusBadge variant={STATUS_META[u.status].variant}>{STATUS_META[u.status].label}</StatusBadge> },
    { key: "cost", header: "ต้นทุน", align: "right", render: (u) => <Money value={u.cost} canSee={showMoney} /> },
    { key: "retail", header: "ราคาขาย", align: "right", render: (u) => <Money value={u.retail} /> },
  ];

  return (
    <div className="flex flex-col gap-8">
      <Section title="การ์ด KPI (StatCard)">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="สต๊อกคงเหลือ" value="43" hint="คัน" />
          <StatCard label="ยอดขายเดือนนี้" value={<Money value={1354302} canSee={showMoney} />} compare={{ current: 1354302, previous: 1180000 }} />
          <StatCard label="กำไรเฉลี่ย/คัน" value={<Money value={showMoney ? 6120 : null} canSee={showMoney} />} compare={{ current: 6120, previous: 6600 }} />
          <StatCard label="รถค้างเกินเกณฑ์" value="7" hint="เกิน 90 วัน" compare={{ current: 7, previous: 0 }} />
        </div>
      </Section>

      <Section title="ป้ายสถานะ 5 แบบ + ที่มาข้อมูล">
        <div className="flex flex-wrap items-center gap-4">
          <StatusBadge variant="good">ดี</StatusBadge>
          <StatusBadge variant="warn">เตือน</StatusBadge>
          <StatusBadge variant="bad">แย่</StatusBadge>
          <StatusBadge variant="info">ข้อมูล</StatusBadge>
          <StatusBadge variant="off">ปิดใช้งาน</StatusBadge>
          <DataSourceBadge source="real" />
          <DataSourceBadge source="mock" />
        </div>
      </Section>

      <Section title="ตัวกรอง + ตารางกดได้ → แผงรายละเอียด">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <FilterBar summary={summary}>
            <Chips
              options={[
                { value: "all", label: "ทั้งหมด" },
                { value: "available", label: "พร้อมขาย" },
                { value: "reserved", label: "จองแล้ว" },
                { value: "sold", label: "ขายแล้ว" },
              ]}
              value={status}
              onChange={setStatus}
            />
          </FilterBar>
          <button
            type="button"
            onClick={() => setShowMoney((v) => !v)}
            className="rounded-[24px] border border-hairline bg-card px-3 py-1.5 text-sm text-ink-soft"
          >
            {showMoney ? "ซ่อนต้นทุน (จำลองไม่มีสิทธิ์ money)" : "แสดงต้นทุน"}
          </button>
        </div>
        <DataTable columns={columns} rows={rows} rowKey={(u) => u.id} onRowClick={setSelected} />
      </Section>

      <Section title="หน้าต่างซ้อน (Modal)">
        <button type="button" onClick={() => setModalOpen(true)} className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card">
          เพิ่มลูกค้า
        </button>
      </Section>

      <Drawer open={selected !== null} onClose={() => setSelected(null)} title={selected ? `${selected.model} · ${selected.color}` : ""}>
        {selected && (
          <dl className="flex flex-col gap-3 text-sm">
            <Row label="เลขเครื่อง"><span className="font-mono">{selected.engine}</span></Row>
            <Row label="วันที่รับเข้า">{formatThaiDate(selected.received)}</Row>
            <Row label="อายุสต๊อก"><StatusBadge variant={ageVariant(selected.ageDays)}>{selected.ageDays} วัน</StatusBadge></Row>
            <Row label="สถานะ"><StatusBadge variant={STATUS_META[selected.status].variant}>{STATUS_META[selected.status].label}</StatusBadge></Row>
            <Row label="ต้นทุน"><Money value={selected.cost} canSee={showMoney} /></Row>
            <Row label="ราคาขาย"><Money value={selected.retail} /></Row>
          </dl>
        )}
      </Drawer>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="เพิ่มลูกค้า">
        <div className="flex flex-col gap-3">
          <input placeholder="ชื่อลูกค้า" className="rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base outline-none focus:border-ink" />
          <input placeholder="เบอร์โทร" inputMode="tel" className="rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base outline-none focus:border-ink" />
          <div className="mt-1 flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft">ยกเลิก</button>
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card">บันทึก</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 font-display text-lg font-semibold text-ink">{title}</h2>
      {children}
    </section>
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
