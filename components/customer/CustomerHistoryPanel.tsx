import { Money } from "@/components/ui/Money";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatThaiDate } from "@/lib/format";
import { stageVariant, type RegStage } from "@/lib/deal/stage";

/**
 * ประวัติลูกค้า (การซื้อ + การบริการ) — ใช้ร่วมกันระหว่างหน้าดีลและหน้าศูนย์ซ่อม
 * FAM-1118 · fixlist ข้อ 17: เดิมประวัติอยู่แต่ในหน้าดีล คนรับรถต้องสลับหน้าไปเปิดเอง
 */

export type PurchaseHistoryItem = {
  key: string;
  vehicle: string;
  soldAt: string; // ISO
  stage: RegStage;
};

export type ServiceHistoryItem = {
  key: string;
  serviceType: string;
  checkedInAt: string; // ISO
  total: number;
};

export function CustomerHistoryPanel({
  purchases,
  services,
  includeCurrentPurchase = false,
}: {
  purchases: PurchaseHistoryItem[];
  services: ServiceHistoryItem[];
  /** หน้าดีลนับคันที่กำลังเปิดอยู่ด้วย (ไม่อยู่ในลิสต์) — หน้าซ่อมไม่นับ */
  includeCurrentPurchase?: boolean;
}) {
  const purchaseCount = purchases.length + (includeCurrentPurchase ? 1 : 0);

  return (
    <div className="flex flex-col gap-3 rounded-[12px] bg-paper p-3">
      <p className="font-medium text-ink">ประวัติลูกค้า</p>

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">การซื้อ · {purchaseCount} คัน</p>
        {purchases.length === 0 ? (
          <p className="text-xs text-muted">{includeCurrentPurchase ? "ลูกค้าใหม่ — ซื้อครั้งแรก" : "ยังไม่เคยซื้อรถกับร้าน"}</p>
        ) : (
          <ul className="flex flex-col">
            {purchases.map((p) => (
              <li key={p.key} className="flex items-center justify-between gap-3 border-b border-hairline-2 py-1.5 last:border-0">
                <span className="min-w-0 flex-1 truncate text-ink">{p.vehicle}</span>
                <span className="shrink-0 text-xs text-muted">{formatThaiDate(p.soldAt)}</span>
                <StatusBadge variant={stageVariant(p.stage)}>{p.stage}</StatusBadge>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">การบริการ · {services.length} ครั้ง</p>
        {services.length === 0 ? (
          <p className="text-xs text-muted">ยังไม่เคยเข้าศูนย์บริการ</p>
        ) : (
          <ul className="flex flex-col">
            {services.map((s) => (
              <li key={s.key} className="flex items-center justify-between gap-3 border-b border-hairline-2 py-1.5 last:border-0">
                <span className="min-w-0 flex-1 truncate text-ink">{s.serviceType}</span>
                <span className="shrink-0 text-xs text-muted">{formatThaiDate(s.checkedInAt)}</span>
                <Money value={s.total} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
