"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Chips } from "@/components/ui/Chips";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterBar } from "@/components/ui/FilterBar";
import { Modal } from "@/components/ui/Modal";
import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatBaht, formatThaiDate } from "@/lib/format";
import {
  filterWholesaleOrders,
  validateWholesaleOrder,
  wholesaleTotals,
  type WholesaleActionResult,
  type WholesaleCompany,
  type WholesaleLineInput,
  type WholesaleOrderRow,
  type WholesaleUnit,
} from "@/lib/wholesale/wholesale";

const inputCls = "rounded-[8px] border border-hairline bg-card px-3 py-2 text-base text-ink outline-none focus:border-ink";

export function WholesaleView({
  orders,
  companies,
  units,
  canSell,
  canManageCompanies,
  canSeeMoney,
  sellAction,
  companyAction,
  docAction,
  voidAction,
}: {
  orders: WholesaleOrderRow[];
  companies: WholesaleCompany[];
  units: WholesaleUnit[];
  canSell: boolean;
  canManageCompanies: boolean;
  canSeeMoney: boolean;
  sellAction: (formData: FormData) => Promise<WholesaleActionResult>;
  companyAction: (formData: FormData) => Promise<WholesaleActionResult>;
  /** ออกใบกำกับ / ยกเลิกบิล (FAM-1128) */
  docAction?: (formData: FormData) => Promise<WholesaleActionResult>;
  voidAction?: (formData: FormData) => Promise<WholesaleActionResult>;
}) {
  const [tab, setTab] = useState<"orders" | "companies">("orders");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [selling, setSelling] = useState(false);
  const [editingCompany, setEditingCompany] = useState<WholesaleCompany | null>(null);
  const [addingCompany, setAddingCompany] = useState(false);
  const [issuingDoc, setIssuingDoc] = useState<WholesaleOrderRow | null>(null);
  const [voiding, setVoiding] = useState<WholesaleOrderRow | null>(null);

  const rows = filterWholesaleOrders(orders, { search, fromDate });
  const activeCompanies = companies.filter((c) => c.isActive);

  const orderColumns: Column<WholesaleOrderRow>[] = [
    {
      key: "no",
      header: "เลขบิล / ร้านค้า",
      primary: true,
      render: (o) => (
        <span>
          <span className="font-mono text-xs">{o.orderNo}</span>
          <span className="ml-1.5 text-muted">· {o.companyName}</span>
          {o.voided && <span className="ml-1 text-[11px] text-accent">(ยกเลิก)</span>}
        </span>
      ),
    },
    { key: "units", header: "จำนวน", render: (o) => <span className="tabular text-ink-soft">{o.units} คัน</span> },
    { key: "total", header: "ยอดรวม", align: "right", render: (o) => <Money value={o.total} canSee={canSeeMoney} /> },
    { key: "gross", header: "กำไร", align: "right", render: (o) => <Money value={o.gross} canSee={canSeeMoney} /> },
    { key: "when", header: "วันที่", render: (o) => <span className="text-muted">{formatThaiDate(o.soldAt)}</span> },
    { key: "by", header: "พนักงาน", render: (o) => <span className="text-muted">{o.salespersonName}</span> },
    {
      key: "doc",
      header: "ใบกำกับ",
      render: (o) =>
        o.taxInvoiceNo ? (
          <span className="font-mono text-xs text-ink-soft">{o.taxInvoiceNo}</span>
        ) : o.voided ? (
          <span className="text-muted">—</span>
        ) : (
          <span className="text-xs text-muted">ยังไม่ออก</span>
        ),
    },
    {
      key: "act",
      header: "",
      align: "right",
      render: (o) =>
        o.voided ? (
          <span className="text-xs text-muted">ยกเลิกแล้ว</span>
        ) : (
          <span className="flex flex-wrap justify-end gap-1.5">
            {docAction && !o.taxInvoiceNo && (
              <button
                type="button"
                onClick={() => setIssuingDoc(o)}
                className="rounded-[20px] border border-hairline px-3 py-1.5 text-xs text-ink-soft transition-transform active:scale-[0.97] hover:text-ink"
              >
                ออกใบกำกับ
              </button>
            )}
            {voidAction && canManageCompanies && (
              <button
                type="button"
                onClick={() => setVoiding(o)}
                className="rounded-[20px] border border-hairline px-3 py-1.5 text-xs text-accent transition-transform active:scale-[0.97]"
              >
                ยกเลิก
              </button>
            )}
          </span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">ขายส่ง (B2B)</h1>
          <p className="mt-0.5 text-sm text-muted">ขายรถให้ร้านค้าด้วยกัน — บิลเดียวได้หลายคัน</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageCompanies && (
            <button
              type="button"
              onClick={() => setAddingCompany(true)}
              className="rounded-[24px] border border-hairline px-4 py-2 text-sm font-medium text-ink transition-transform active:scale-[0.98]"
            >
              + ร้านค้า
            </button>
          )}
          {canSell && (
            <button
              type="button"
              onClick={() => setSelling(true)}
              disabled={activeCompanies.length === 0 || units.length === 0}
              title={activeCompanies.length === 0 ? "เพิ่มร้านค้าก่อน" : units.length === 0 ? "ไม่มีรถพร้อมขายในสต๊อก" : undefined}
              className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card transition-transform active:scale-[0.98] disabled:opacity-50"
            >
              + เปิดบิลขายส่ง
            </button>
          )}
        </div>
      </div>

      <div className="mb-3">
        <Chips
          value={tab}
          onChange={setTab}
          options={[
            { value: "orders", label: `บิลขายส่ง (${orders.length})` },
            { value: "companies", label: `ร้านค้า (${companies.length})` },
          ]}
        />
      </div>

      {tab === "orders" ? (
        <>
          <div className="mb-4">
            <FilterBar summary={`กำลังดู: ${rows.length} บิล`}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="ค้นหาบิลขายส่ง"
                placeholder="ค้นเลขบิล / ร้านค้า / พนักงาน"
                className={`${inputCls} sm:w-56`}
              />
              <label className="flex items-center gap-1 text-sm text-muted">
                ตั้งแต่
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={`${inputCls} w-[150px]`} />
              </label>
            </FilterBar>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon="files"
              title={orders.length === 0 ? "ยังไม่มีบิลขายส่ง" : "ไม่พบตามตัวกรอง"}
              description={
                orders.length === 0
                  ? activeCompanies.length === 0
                    ? "เพิ่มร้านค้าที่ขายส่งให้ก่อน แล้วจึงเปิดบิลได้"
                    : "กด “เปิดบิลขายส่ง” เพื่อบันทึกการขายให้ร้านค้า"
                  : "ลองล้างตัวกรองหรือขยายช่วงวันที่"
              }
            />
          ) : (
            <DataTable columns={orderColumns} rows={rows} rowKey={(o) => o.id} />
          )}
        </>
      ) : (
        <CompanyList companies={companies} canManage={canManageCompanies} onEdit={setEditingCompany} />
      )}

      {selling && (
        <SellModal
          companies={activeCompanies}
          units={units}
          canSeeMoney={canSeeMoney}
          action={sellAction}
          onClose={() => setSelling(false)}
        />
      )}
      {issuingDoc && docAction && (
        <ConfirmOrderModal
          key={`doc-${issuingDoc.id}`}
          order={issuingDoc}
          title={`ออกใบกำกับภาษี — ${issuingDoc.orderNo}`}
          body={`ออกใบกำกับให้ ${issuingDoc.companyName} ยอดรวม ${formatBaht(issuingDoc.total)} · ผู้ซื้อบนเอกสารคือร้านค้า`}
          cta="ออกใบกำกับ"
          field="order_id"
          action={docAction}
          onClose={() => setIssuingDoc(null)}
        />
      )}
      {voiding && voidAction && (
        <ConfirmOrderModal
          key={`void-${voiding.id}`}
          order={voiding}
          title={`ยกเลิกบิล — ${voiding.orderNo}`}
          body={`ยกเลิกแล้วรถ ${voiding.units} คันจะกลับเข้าสต๊อก และเงินค้างรับของบิลนี้ที่ยังไม่ได้รับเงินจะถูกล้าง`}
          cta="ยกเลิกบิล"
          field="order_id"
          needReason
          action={voidAction}
          onClose={() => setVoiding(null)}
        />
      )}
      {(addingCompany || editingCompany) && (
        <CompanyModal
          company={editingCompany}
          action={companyAction}
          onClose={() => {
            setAddingCompany(false);
            setEditingCompany(null);
          }}
        />
      )}
    </div>
  );
}

function CompanyList({
  companies,
  canManage,
  onEdit,
}: {
  companies: WholesaleCompany[];
  canManage: boolean;
  onEdit: (c: WholesaleCompany) => void;
}) {
  if (companies.length === 0) {
    return <EmptyState icon="users" title="ยังไม่มีร้านค้าขายส่ง" description="กด “+ ร้านค้า” เพื่อเพิ่มร้านที่เราขายส่งให้" />;
  }
  return (
    <ul className="flex flex-col gap-2">
      {companies.map((c) => (
        <li key={c.id} className="flex items-center justify-between gap-3 rounded-[12px] bg-card p-3 shadow-[var(--sh-sm)]">
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">
              {c.name}
              {!c.isActive && <span className="ml-1.5 text-[11px] text-accent">(ปิดใช้)</span>}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
              <span>{c.creditDays > 0 ? `เครดิต ${c.creditDays} วัน` : "เงินสด"}</span>
              {c.contactName && <span>· ติดต่อ {c.contactName}</span>}
              {c.phone && <span>· {c.phone}</span>}
              {!c.taxId && <span className="text-accent">· ยังไม่มีเลขผู้เสียภาษี</span>}
            </p>
          </div>
          {canManage && (
            <button
              type="button"
              onClick={() => onEdit(c)}
              className="shrink-0 rounded-[20px] border border-hairline px-3.5 py-2 text-xs text-ink-soft transition-transform active:scale-[0.97] hover:text-ink"
            >
              แก้ไข
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function SellModal({
  companies,
  units,
  canSeeMoney,
  action,
  onClose,
}: {
  companies: WholesaleCompany[];
  units: WholesaleUnit[];
  canSeeMoney: boolean;
  action: (formData: FormData) => Promise<WholesaleActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [lines, setLines] = useState<WholesaleLineInput[]>([]);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = new Set(lines.map((l) => l.unitId));
  const q = search.trim().toLowerCase();
  const available = units.filter(
    (u) => !chosen.has(u.id) && (q === "" || `${u.model} ${u.color} ${u.engineNo} ${u.frameNo}`.toLowerCase().includes(q)),
  );
  const totals = useMemo(() => wholesaleTotals(lines, units), [lines, units]);
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const company = companies.find((c) => c.id === companyId);

  function add(unitId: string) {
    const u = unitById.get(unitId);
    setLines((prev) => [...prev, { unitId, price: u?.retail != null ? String(u.retail) : "" }]);
  }
  function remove(unitId: string) {
    setLines((prev) => prev.filter((l) => l.unitId !== unitId));
  }
  function setPrice(unitId: string, price: string) {
    setLines((prev) => prev.map((l) => (l.unitId === unitId ? { ...l, price } : l)));
  }

  async function submit() {
    if (busy) {
      return;
    }
    const parsed = validateWholesaleOrder({ companyId, lines }, units);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("company_id", companyId);
    fd.set("lines", JSON.stringify(lines));
    fd.set("note", note);
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
    <Modal open onClose={onClose} title="เปิดบิลขายส่ง" size="lg">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">ร้านค้าที่ขายส่งให้ *</span>
          <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className={`${inputCls} w-full`}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.creditDays > 0 ? ` · เครดิต ${c.creditDays} วัน` : " · เงินสด"}
              </option>
            ))}
          </select>
        </label>
        {company && company.creditDays > 0 && (
          <StatusBadge variant="info">ขายเชื่อ — ระบบจะตั้งเงินค้างรับให้อัตโนมัติ ครบกำหนดใน {company.creditDays} วัน</StatusBadge>
        )}

        <div>
          <p className="mb-1.5 text-sm text-muted">รถในบิล ({lines.length} คัน)</p>
          {lines.length === 0 ? (
            <p className="rounded-[10px] bg-paper px-3 py-2 text-xs text-muted">ยังไม่ได้เลือกคัน — เลือกจากรายการด้านล่าง</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {lines.map((l) => {
                const u = unitById.get(l.unitId);
                return (
                  <li key={l.unitId} className="flex flex-wrap items-center gap-2 rounded-[10px] bg-paper px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">
                      {u?.model} · {u?.color}
                      <span className="ml-1.5 font-mono text-xs text-muted">
                        เครื่อง {u?.engineNo || "—"} · ถัง {u?.frameNo || "—"}
                      </span>
                    </span>
                    <input
                      value={l.price}
                      onChange={(e) => setPrice(l.unitId, e.target.value)}
                      inputMode="numeric"
                      aria-label={`ราคาขายส่ง ${u?.model}`}
                      placeholder="ราคาขายส่ง"
                      className={`${inputCls} w-32 text-right`}
                    />
                    <button type="button" onClick={() => remove(l.unitId)} className="text-xs text-accent hover:underline">
                      เอาออก
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="ค้นหารถในสต๊อก"
            placeholder="ค้นรุ่น / สี / เลขเครื่อง / เลขถัง"
            className={`${inputCls} w-full`}
          />
          <ul className="mt-1.5 max-h-52 overflow-y-auto rounded-[10px] border border-hairline">
            {available.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted">ไม่มีรถที่ตรงคำค้น</li>
            ) : (
              available.slice(0, 40).map((u) => (
                <li key={u.id} className="border-b border-hairline-2 last:border-0">
                  <button
                    type="button"
                    onClick={() => add(u.id)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-paper-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {u.model} · {u.color}
                      <span className="ml-1.5 font-mono text-xs text-muted">
                        เครื่อง {u.engineNo || "—"} · ถัง {u.frameNo || "—"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted">{u.branchName}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">หมายเหตุ</span>
          <input value={note} onChange={(e) => setNote(e.target.value)} className={`${inputCls} w-full`} />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] bg-paper px-3 py-2 text-sm">
          <span className="text-muted">{totals.units} คัน</span>
          <span className="text-ink">
            ยอดรวม <b>{formatBaht(totals.total)}</b>
            {canSeeMoney && totals.gross != null && (
              <span className="ml-2 text-muted">
                กำไร <b className={totals.gross < 0 ? "text-accent" : "text-ink"}>{formatBaht(totals.gross)}</b>
              </span>
            )}
          </span>
        </div>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || lines.length === 0}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : "บันทึกขายส่ง"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CompanyModal({
  company,
  action,
  onClose,
}: {
  company: WholesaleCompany | null;
  action: (formData: FormData) => Promise<WholesaleActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(company?.name ?? "");
  const [taxId, setTaxId] = useState(company?.taxId ?? "");
  const [address, setAddress] = useState(company?.address ?? "");
  const [phone, setPhone] = useState(company?.phone ?? "");
  const [contactName, setContactName] = useState(company?.contactName ?? "");
  const [creditDays, setCreditDays] = useState(String(company?.creditDays ?? 0));
  const [isActive, setIsActive] = useState(company?.isActive ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    if (company) {
      fd.set("company_id", company.id);
    }
    fd.set("name", name);
    fd.set("tax_id", taxId);
    fd.set("address", address);
    fd.set("phone", phone);
    fd.set("contact_name", contactName);
    fd.set("credit_days", creditDays);
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
    <Modal open onClose={onClose} title={company ? `แก้ไขร้านค้า — ${company.name}` : "เพิ่มร้านค้าขายส่ง"} size="lg">
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">ชื่อร้านค้า *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputCls} w-full`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">เลขผู้เสียภาษี (13 หลัก)</span>
            <input value={taxId} onChange={(e) => setTaxId(e.target.value)} inputMode="numeric" placeholder="ใช้ตอนออกใบกำกับ" className={`${inputCls} w-full`} />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-muted">ที่อยู่</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={`${inputCls} w-full`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">ผู้ติดต่อ</span>
            <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={`${inputCls} w-full`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">โทรศัพท์</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className={`${inputCls} w-full`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">เครดิต (วัน)</span>
            <input value={creditDays} onChange={(e) => setCreditDays(e.target.value)} inputMode="numeric" className={`${inputCls} w-full`} />
            <span className="text-xs text-muted">0 = เงินสด · มากกว่า 0 = ตั้งเงินค้างรับอัตโนมัติ</span>
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          เปิดใช้งาน (ปิด = ไม่ให้เลือกตอนเปิดบิลใหม่)
        </label>

        {error && <StatusBadge variant="bad">{error}</StatusBadge>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft">
            ยกเลิก
          </button>
          <button type="button" onClick={submit} disabled={busy} className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card disabled:opacity-50">
            {busy ? "กำลังบันทึก…" : company ? "บันทึก" : "เพิ่มร้านค้า"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/** ยืนยันการกระทำกับบิลขายส่ง (ออกใบกำกับ / ยกเลิก) — ใช้ร่วมกันสองงาน */
function ConfirmOrderModal({
  order,
  title,
  body,
  cta,
  field,
  needReason = false,
  action,
  onClose,
}: {
  order: WholesaleOrderRow;
  title: string;
  body: string;
  cta: string;
  field: string;
  needReason?: boolean;
  action: (formData: FormData) => Promise<WholesaleActionResult>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set(field, order.id);
    if (needReason) {
      fd.set("reason", reason);
    }
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
    <Modal open onClose={onClose} title={title}>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-soft">{body}</p>
        {needReason && (
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted">เหตุผลที่ยกเลิก *</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} w-full`} />
          </label>
        )}
        {error && <StatusBadge variant="bad">{error}</StatusBadge>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-[24px] border border-hairline px-4 py-2 text-sm text-ink-soft">
            ปิด
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || (needReason && reason.trim() === "")}
            className="rounded-[24px] bg-ink px-4 py-2 text-sm font-medium text-card disabled:opacity-50"
          >
            {busy ? "กำลังบันทึก…" : cta}
          </button>
        </div>
      </div>
    </Modal>
  );
}
