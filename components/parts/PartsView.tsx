"use client";

import { useState, type ReactNode } from "react";
import { Chips } from "@/components/ui/Chips";
import { FilterBar } from "@/components/ui/FilterBar";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Money } from "@/components/ui/Money";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Drawer } from "@/components/ui/Drawer";
import { PARTS_TABS, type PartsTab } from "@/lib/parts/tabs";
import {
  filterParts,
  isLowStock,
  lowStockCount,
  type FreebieRow,
  type PartRow,
  type PartsActionResult,
} from "@/lib/parts/stock";

const inputCls =
  "w-full rounded-[8px] border border-hairline bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-ink tabular";
const selectClass =
  "rounded-[8px] border border-hairline bg-card px-3 py-2 text-sm text-ink outline-none focus:border-ink";

type PartsAction = (formData: FormData) => Promise<PartsActionResult>;

export function PartsView({
  allowedTabs,
  parts,
  freebies,
  canSeeMoney,
  canManageParts = false,
  issuePartAction,
  updateFreebieAction,
  addPartAction,
  updatePartAction,
  receivePartAction,
}: {
  allowedTabs: PartsTab[];
  parts: PartRow[];
  freebies: FreebieRow[];
  canSeeMoney: boolean;
  canManageParts?: boolean;
  issuePartAction: PartsAction;
  updateFreebieAction: PartsAction;
  addPartAction?: PartsAction;
  updatePartAction?: PartsAction;
  receivePartAction?: PartsAction;
}) {
  const [tab, setTab] = useState<PartsTab>(allowedTabs[0] ?? "stock");

  const lowParts = lowStockCount(parts);
  const lowGifts = lowStockCount(freebies);
  const badge = lowParts + lowGifts;

  const tabOptions = PARTS_TABS.filter((t) => allowedTabs.includes(t.key)).map((t) => ({
    value: t.key,
    label: t.label,
  }));

  // แถบพาดหัวคลังตามแท็บ (สต๊อก = อะไหล่ · ของแถม = freebies) · เบิก/ขายเป็นฟอร์ม ไม่ต้องมีพาดหัว
  const showHero = tab === "stock" || tab === "gifts";
  const inv: Array<PartRow | FreebieRow> = tab === "gifts" ? freebies : parts;
  const invValue = canSeeMoney ? inv.reduce((s, x) => s + x.qtyOnHand * (x.cost ?? 0), 0) : null;
  const invLow = tab === "gifts" ? lowGifts : lowParts;
  const invLabel = tab === "gifts" ? "ของแถม" : "อะไหล่";

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {/* กฎ §9h ข้อ 2: เหลือแท็บเดียวก็ไม่ต้องวาดแถบแท็บ */}
        {allowedTabs.length > 1 ? (
          <Chips value={tab} onChange={setTab} options={tabOptions} />
        ) : (
          <h2 className="font-display font-semibold text-ink">{tabOptions[0]?.label}</h2>
        )}
        {badge > 0 && !showHero && (
          <StatusBadge variant="bad">ต่ำกว่าจุดสั่งซื้อ {badge} รายการ</StatusBadge>
        )}
      </div>

      {showHero && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label={`มูลค่าสต๊อก${invLabel}`} value={<Money value={invValue} canSee={canSeeMoney} />} />
          <StatCard label="จำนวนรายการ" value={String(inv.length)} hint="รายการ" />
          <StatCard
            label="ต่ำกว่าจุดสั่งซื้อ"
            value={String(invLow)}
            hint="รายการ"
            tone={invLow > 0 ? "accent" : "default"}
          />
        </div>
      )}

      {tab === "stock" && allowedTabs.includes("stock") && (
        <StockPane
          parts={parts}
          canSeeMoney={canSeeMoney}
          lowCount={lowParts}
          canManage={canManageParts}
          addAction={addPartAction}
          updateAction={updatePartAction}
          receiveAction={receivePartAction}
        />
      )}
      {tab === "issue" && allowedTabs.includes("issue") && (
        <IssuePane parts={parts} action={issuePartAction} />
      )}
      {tab === "gifts" && allowedTabs.includes("gifts") && (
        <GiftsPane freebies={freebies} canSeeMoney={canSeeMoney} action={updateFreebieAction} />
      )}
    </div>
  );
}

/* ── แท็บสต๊อกอะไหล่ (อ่านอย่างเดียว + ไฮไลต์ของต่ำ) ─────────────────────── */
function StockPane({
  parts,
  canSeeMoney,
  lowCount,
  canManage,
  addAction,
  updateAction,
  receiveAction,
}: {
  parts: PartRow[];
  canSeeMoney: boolean;
  lowCount: number;
  canManage: boolean;
  addAction?: PartsAction;
  updateAction?: PartsAction;
  receiveAction?: PartsAction;
}) {
  const [search, setSearch] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<PartRow | null>(null);
  const rows = filterParts(parts, { search, onlyLow });

  const isFiltered = search.trim() !== "" || onlyLow;
  function resetFilters() {
    setSearch("");
    setOnlyLow(false);
  }

  const columns: Column<PartRow>[] = [
    {
      key: "name",
      header: "รหัส / ชื่อ",
      primary: true,
      render: (p) => (
        <span>
          <span className="font-mono text-xs text-muted">{p.code}</span> · {p.name}
        </span>
      ),
    },
    {
      key: "qty",
      header: "คงเหลือ",
      align: "right",
      render: (p) => (
        <span className={isLowStock(p) ? "font-semibold text-accent" : "text-ink"}>
          {p.qtyOnHand}
          {p.minQty > 0 && <span className="text-muted"> / {p.minQty}</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "สถานะ",
      render: (p) =>
        isLowStock(p) ? (
          <StatusBadge variant="warn">ต่ำกว่าจุดสั่งซื้อ</StatusBadge>
        ) : (
          <StatusBadge variant="good">พอ</StatusBadge>
        ),
    },
    ...(canSeeMoney
      ? [{ key: "cost", header: "ต้นทุน", align: "right" as const, render: (p: PartRow) => <Money value={p.cost ?? null} /> }]
      : []),
    { key: "price", header: "ราคาขาย", align: "right", render: (p) => <Money value={p.price} /> },
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterBar summary={`กำลังดู: ${rows.length} รายการ · ต่ำกว่าจุดสั่งซื้อ ${lowCount}`}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหารหัส / ชื่ออะไหล่"
            placeholder="ค้นรหัส / ชื่ออะไหล่"
            className={`${selectClass} w-full sm:w-56`}
          />
          <Chips
            value={onlyLow ? "low" : "all"}
            onChange={(v) => setOnlyLow(v === "low")}
            options={[
              { value: "all", label: "ทั้งหมด" },
              { value: "low", label: "เฉพาะที่ต่ำ" },
            ]}
          />
        </FilterBar>
        {canManage && addAction && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.99]"
          >
            + เพิ่มอะไหล่
          </button>
        )}
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(p) => p.id}
        onRowClick={canManage ? setSelected : undefined}
        empty={
          parts.length > 0 ? (
            <EmptyState
              icon="cog"
              title="ไม่พบอะไหล่ตามเงื่อนไข"
              description="ลองปรับคำค้น หรือปิดตัวกรอง 'ใกล้หมด'"
              action={isFiltered ? { label: "ล้างตัวกรอง", onClick: resetFilters } : undefined}
            />
          ) : (
            <EmptyState
              icon="cog"
              title="ยังไม่มีอะไหล่ในหมวดนี้"
              description="เพิ่มอะไหล่ หรือนำเข้าข้อมูลเพื่อเริ่มจัดการสต๊อกอะไหล่"
            />
          )
        }
      />

      {canManage && addAction && <AddPartModal open={adding} canSeeMoney={canSeeMoney} action={addAction} onClose={() => setAdding(false)} />}
      {canManage && (
        <PartManageDrawer
          part={selected}
          canSeeMoney={canSeeMoney}
          receiveAction={receiveAction}
          updateAction={updateAction}
          onClose={() => setSelected(null)}
          onDone={() => setSelected(null)}
        />
      )}
    </>
  );
}

function AddPartModal({
  open,
  canSeeMoney,
  action,
  onClose,
}: {
  open: boolean;
  canSeeMoney: boolean;
  action: PartsAction;
  onClose: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState("");
  const [min, setMin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = code.trim() !== "" && name.trim() !== "" && price.trim() !== "";

  function reset() {
    setCode("");
    setName("");
    setPrice("");
    setCost("");
    setQty("");
    setMin("");
    setError(null);
  }

  async function submit() {
    if (!canSubmit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("code", code.trim());
    fd.set("name", name.trim());
    fd.set("price", price);
    if (canSeeMoney) {
      fd.set("cost", cost);
    }
    fd.set("qty_on_hand", qty);
    fd.set("min_qty", min);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      reset();
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มอะไหล่">
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="รหัส *">
            <input value={code} onChange={(e) => setCode(e.target.value)} className={inputCls} />
          </Field>
          <Field label="ชื่ออะไหล่ *">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ราคาขาย *">
            <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
          {canSeeMoney && (
            <Field label="ต้นทุน">
              <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" className={inputCls} />
            </Field>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="จำนวนเริ่มต้น">
            <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
          <Field label="จุดสั่งซื้อ">
            <input value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
        </div>
        {error && <StatusBadge variant="bad">{error}</StatusBadge>}
        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit || busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "เพิ่ม"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PartManageDrawer({
  part,
  canSeeMoney,
  receiveAction,
  updateAction,
  onClose,
  onDone,
}: {
  part: PartRow | null;
  canSeeMoney: boolean;
  receiveAction?: PartsAction;
  updateAction?: PartsAction;
  onClose: () => void;
  onDone: () => void;
}) {
  const [recvQty, setRecvQty] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [min, setMin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  if (part && part.id !== current) {
    setCurrent(part.id);
    setRecvQty("");
    setPrice(String(part.price));
    setCost(part.cost != null ? String(part.cost) : "");
    setMin(String(part.minQty));
    setError(null);
  }

  async function run(action: PartsAction | undefined, fd: FormData) {
    if (!part || !action || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    fd.set("part_id", part.id);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      onDone();
    } else {
      setError(res.error);
    }
  }

  const recvNum = Number(recvQty);
  const canReceive = Number.isFinite(recvNum) && recvNum > 0;

  return (
    <Drawer open={part !== null} onClose={onClose} title={part ? `${part.code} · ${part.name}` : ""}>
      {part && (
        <div className="flex flex-col gap-4 text-sm">
          <div className="flex items-center justify-between rounded-[10px] bg-paper px-3 py-2">
            <span className="text-muted">คงเหลือ</span>
            <span className="tabular font-semibold text-ink">{part.qtyOnHand}{part.minQty > 0 ? ` / ${part.minQty}` : ""}</span>
          </div>

          {receiveAction && (
            <div>
              <p className="mb-1 font-medium text-ink">รับเข้า</p>
              <div className="flex gap-2">
                <input
                  value={recvQty}
                  onChange={(e) => setRecvQty(e.target.value)}
                  inputMode="numeric"
                  placeholder="จำนวน"
                  className={inputCls}
                />
                <button
                  type="button"
                  disabled={!canReceive || busy}
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("qty", recvQty);
                    run(receiveAction, fd);
                  }}
                  className="shrink-0 rounded-[24px] bg-accent px-5 text-sm font-medium text-card disabled:opacity-50"
                >
                  รับเข้า
                </button>
              </div>
            </div>
          )}

          {updateAction && (
            <div className="border-t border-hairline-2 pt-3">
              <p className="mb-2 font-medium text-ink">แก้ข้อมูลหลัก</p>
              <div className="flex flex-col gap-2">
                <Field label="ราคาขาย">
                  <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="numeric" className={inputCls} />
                </Field>
                {canSeeMoney && (
                  <Field label="ต้นทุน">
                    <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" className={inputCls} />
                  </Field>
                )}
                <Field label="จุดสั่งซื้อ">
                  <input value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" className={inputCls} />
                </Field>
              </div>
            </div>
          )}

          {error && <StatusBadge variant="bad">{error}</StatusBadge>}

          <div className="flex justify-end gap-2">
            {updateAction && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const fd = new FormData();
                  fd.set("price", price);
                  if (canSeeMoney) {
                    fd.set("cost", cost);
                  }
                  fd.set("min_qty", min);
                  run(updateAction, fd);
                }}
                className="rounded-[24px] bg-ink px-5 py-2 text-sm font-medium text-card disabled:opacity-50"
              >
                บันทึกข้อมูล
              </button>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

/* ── แท็บเบิก/ขายอะไหล่ (ตัดสต๊อก) ──────────────────────────────────────── */
function IssuePane({ parts, action }: { parts: PartRow[]; action: (fd: FormData) => Promise<PartsActionResult> }) {
  const [partId, setPartId] = useState("");
  const [qty, setQty] = useState(1);
  const [kind, setKind] = useState<"sale" | "job">("sale");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const part = parts.find((p) => p.id === partId) ?? null;
  const notEnough = part ? qty > part.qtyOnHand : false;
  const canSubmit = Boolean(part) && qty > 0 && !notEnough;

  async function submit() {
    if (!canSubmit || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("part_id", partId);
    fd.set("qty", String(qty));
    fd.set("kind", kind);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setPartId("");
      setQty(1);
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4">
      <Field label="เลือกอะไหล่">
        <select
          value={partId}
          onChange={(e) => {
            setPartId(e.target.value);
            setSaved(false);
            setError(null);
          }}
          className={inputCls}
        >
          <option value="">— เลือกอะไหล่ —</option>
          {parts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} (เหลือ {p.qtyOnHand})
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="จำนวน">
          <input
            type="number"
            min={1}
            value={qty || ""}
            onChange={(e) => setQty(Number(e.target.value) || 0)}
            className={inputCls}
          />
        </Field>
        <Field label="ประเภท">
          <select value={kind} onChange={(e) => setKind(e.target.value as "sale" | "job")} className={inputCls}>
            <option value="sale">ขายอะไหล่</option>
            <option value="job">เบิกเข้างานซ่อม</option>
          </select>
        </Field>
      </div>

      {notEnough && <StatusBadge variant="bad">สต๊อกไม่พอ — เหลือ {part?.qtyOnHand}</StatusBadge>}
      {error && <StatusBadge variant="bad">{error}</StatusBadge>}
      {saved && <StatusBadge variant="good">บันทึกการเบิกแล้ว — ตัดสต๊อกเรียบร้อย</StatusBadge>}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || busy}
        className="mt-1 rounded-[24px] bg-accent py-3 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
      >
        {busy ? "กำลังบันทึก…" : "บันทึกการเบิก/ขาย"}
      </button>
    </div>
  );
}

/* ── แท็บของแถม (แก้ราคา/จำนวน — R1) ────────────────────────────────────── */
function GiftsPane({
  freebies,
  canSeeMoney,
  action,
}: {
  freebies: FreebieRow[];
  canSeeMoney: boolean;
  action: (fd: FormData) => Promise<PartsActionResult>;
}) {
  const [editing, setEditing] = useState<FreebieRow | null>(null);

  if (freebies.length === 0) {
    return (
      <EmptyState icon="tag" title="ยังไม่มีของแถม" description="เพิ่มของแถมเพื่อผูกกับการขายและโปรโมชั่น" />
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {freebies.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-card p-3 shadow-[var(--sh-sm)]">
            <div className="min-w-0">
              <p className="truncate font-medium text-ink">{f.name}</p>
              <p className="text-xs text-muted">
                คงเหลือ {f.qtyOnHand}
                {f.minQty > 0 ? ` / จุดสั่งซื้อ ${f.minQty}` : ""}
                {isLowStock(f) ? " · ต่ำ" : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {canSeeMoney && <Money value={f.cost ?? null} />}
              <button
                type="button"
                onClick={() => setEditing(f)}
                className="rounded-full border border-hairline px-3 py-1.5 text-sm text-ink-soft hover:text-ink"
              >
                แก้ไข
              </button>
            </div>
          </li>
        ))}
      </ul>

      <EditFreebieModal
        freebie={editing}
        canSeeMoney={canSeeMoney}
        onClose={() => setEditing(null)}
        action={action}
      />
    </>
  );
}

function EditFreebieModal({
  freebie,
  canSeeMoney,
  onClose,
  action,
}: {
  freebie: FreebieRow | null;
  canSeeMoney: boolean;
  onClose: () => void;
  action: (fd: FormData) => Promise<PartsActionResult>;
}) {
  const [cost, setCost] = useState("");
  const [qty, setQty] = useState("");
  const [min, setMin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null);

  // ตั้งค่าเริ่มต้นเมื่อเปิด modal ของแถวใหม่ (ไม่ใช้ effect — เทียบ id ระหว่าง render)
  if (freebie && freebie.id !== current) {
    setCurrent(freebie.id);
    setCost(freebie.cost != null ? String(freebie.cost) : "");
    setQty(String(freebie.qtyOnHand));
    setMin(String(freebie.minQty));
    setError(null);
  }

  async function submit() {
    if (!freebie || busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("freebie_id", freebie.id);
    if (canSeeMoney) {
      fd.set("cost", cost);
    }
    fd.set("qty_on_hand", qty);
    fd.set("min_qty", min);
    const res = await action(fd);
    setBusy(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.error);
    }
  }

  return (
    <Modal open={freebie !== null} onClose={onClose} title={freebie ? `แก้ไข: ${freebie.name}` : ""}>
      <div className="flex flex-col gap-3">
        {canSeeMoney && (
          <Field label="ราคาต้นทุน (บาท)">
            <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="คงเหลือ">
            <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
          <Field label="จุดสั่งซื้อ">
            <input value={min} onChange={(e) => setMin(e.target.value)} inputMode="numeric" className={inputCls} />
          </Field>
        </div>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="mt-1 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="rounded-[24px] bg-accent px-5 py-2 text-sm font-medium text-card transition-transform active:scale-[0.99] disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึก"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm text-ink-soft">
      {label}
      {children}
    </label>
  );
}
