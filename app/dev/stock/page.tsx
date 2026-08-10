import { StockView } from "@/components/stock/StockView";
import { computeAgeDays, type StockUnit } from "@/lib/stock/units";

/** พรีวิวหน้าสต๊อกด้วย sample data (FAM-1008) — ตรวจหน้าตาโดยไม่ต้องล็อกอิน; /stock จริงต่อ DB ผ่าน RLS */
export const metadata = { title: "สต๊อกรถ (preview) — Famai" };

const TODAY = "2026-08-11";

function unit(u: Omit<StockUnit, "ageDays">): StockUnit {
  return { ...u, ageDays: computeAgeDays(u.receivedAt, TODAY) };
}

const SAMPLE: StockUnit[] = [
  unit({ id: "1", modelCode: "B6FU00", modelName: "FINN ล้อแม็ก", colorCode: "010C", colorName: "ฟ้า", engineNo: "E34RE-057401", frameNo: "MLEUE364111399878", status: "available", receivedAt: "2026-07-30", branchCode: "FMG01", branchName: "Famai Motor Group", photoUrl: null, cost: 40800, retail: 46900 }),
  unit({ id: "2", modelCode: "BTF200", modelName: "NMAX สแตนดาร์ด", colorCode: "010E", colorName: "แดง", engineNo: "E3X8E-112097", frameNo: "MLERM551020022145", status: "available", receivedAt: "2024-09-11", branchCode: "FMG01", branchName: "Famai Motor Group", photoUrl: null, cost: 78000, retail: null }),
  unit({ id: "3", modelCode: "BJKC00", modelName: "Grand Filano Hybrid", colorCode: "010D", colorName: "เทา", engineNo: "E9L2E-004411", frameNo: "MLEBJ338800471120", status: "reserved", receivedAt: "2026-06-20", branchCode: "FMM01", branchName: "Famai Motor", photoUrl: null, cost: 62000, retail: 69900 }),
  unit({ id: "4", modelCode: "DR9200", modelName: "XMAX 300", colorCode: "010A", colorName: "ดำ/เทา", engineNo: "EA71E-900233", frameNo: "MLEDR922010900233", status: "sold", receivedAt: "2026-08-06", branchCode: "FMM01", branchName: "Famai Motor", photoUrl: null, cost: 175000, retail: 189000 }),
  unit({ id: "5", modelCode: "D18100", modelName: "PG-1", colorCode: "010B", colorName: "แดง", engineNo: "E5PGE-338101", frameNo: "MLED18100PG133810", status: "in_transfer", receivedAt: "2026-05-15", branchCode: "FCG01", branchName: "Famai Center Group", photoUrl: null, cost: 51000, retail: 55900 }),
];

export default function DevStockPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold text-ink">สต๊อกรถ (preview)</h1>
        <p className="mt-1 text-ink-soft">FAM-1008 · sample data — หน้าจริง /stock ต่อ DB ผ่าน RLS</p>
      </header>
      <StockView units={SAMPLE} canSeeMoney agingDays={90} />
    </main>
  );
}
