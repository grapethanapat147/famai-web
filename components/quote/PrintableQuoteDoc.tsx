import { formatBaht, formatThaiDate } from "@/lib/format";
import { monthlyFor, type PrintColumn } from "@/lib/quote/print";

/** ข้อมูลผู้ขาย/บริษัท บนหัวกระดาษ (R1 ขายรถ: ชื่อร้าน + เบอร์ + ผู้เสนอราคา) */
export type QuoteSeller = {
  shopName: string;
  branchName: string;
  address: string | null;
  phone: string | null;
  taxId: string | null;
  sellerName: string;
};

/**
 * แม่แบบพิมพ์ใบเสนอราคา (FAM-1029) — เอกสารเดี่ยวแยกจาก chrome ของแอป
 * ซ่อนบนจอด้วย .print-doc · เปิดพรีวิวด้วย preview · ตอน window.print() แสดงเฉพาะเอกสารนี้
 */
export function PrintableQuoteDoc({
  seller,
  docNo,
  quoteDate,
  validUntil,
  customerName,
  customerPhone,
  columns,
  financeTerms,
  preview,
}: {
  seller: QuoteSeller;
  docNo: string | null;
  quoteDate: string;
  validUntil: string | null;
  customerName: string;
  customerPhone: string;
  columns: PrintColumn[];
  financeTerms: number[];
  preview: boolean;
}) {
  const sellerLines = [seller.address, seller.phone ? `โทร. ${seller.phone}` : null, seller.taxId ? `เลขผู้เสียภาษี ${seller.taxId}` : null]
    .filter((x): x is string => Boolean(x))
    .join("  ·  ");

  return (
    <section className={preview ? "print-doc print-doc--preview" : "print-doc"} aria-hidden={!preview}>
      <div className="qdoc-head">
        <div>
          <div className="qdoc-brand">
            {seller.shopName} <span className="qdoc-brand-accent">Yamaha</span>
          </div>
          <div className="qdoc-seller-line">
            บริษัท{seller.branchName}
            {sellerLines ? (
              <>
                <br />
                {sellerLines}
              </>
            ) : null}
          </div>
        </div>
        <div>
          <div className="qdoc-title">ใบเสนอราคา</div>
          <div className="qdoc-meta">
            เลขที่ <b>{docNo ?? "(ร่าง)"}</b>
            <br />
            วันที่ <b>{formatThaiDate(quoteDate)}</b>
            <br />
            ยืนราคาถึง <b>{validUntil ? formatThaiDate(validUntil) : "—"}</b>
          </div>
        </div>
      </div>

      <p className="qdoc-customer">
        เรียน <b>{customerName || "ลูกค้า"}</b>
        {customerPhone ? ` · โทร. ${customerPhone}` : ""}
        <br />
        บริษัทฯ ขอเสนอราคารถจักรยานยนต์ Yamaha พร้อมเงื่อนไขการผ่อนชำระ ดังนี้
      </p>

      <table className="qdoc-table">
        <thead>
          <tr>
            <th>รายการ</th>
            {columns.map((c, i) => (
              <th key={i}>{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>ราคา</td>
            {columns.map((c, i) => (
              <td key={i}>{formatBaht(c.price)}</td>
            ))}
          </tr>
          <tr>
            <td>เงินดาวน์</td>
            {columns.map((c, i) => (
              <td key={i}>{formatBaht(c.down)}</td>
            ))}
          </tr>
          <tr className="qdoc-row-strong">
            <td>ยอดจัด</td>
            {columns.map((c, i) => (
              <td key={i}>{formatBaht(c.financed)}</td>
            ))}
          </tr>
          <tr>
            <td>ไฟแนนซ์</td>
            {columns.map((c, i) => (
              <td key={i}>{c.financeLabel}</td>
            ))}
          </tr>
          <tr className="qdoc-subhead">
            <td colSpan={columns.length + 1}>ค่างวด/เดือน (บาท)</td>
          </tr>
          {financeTerms.map((m) => (
            <tr key={m}>
              <td>{m} งวด</td>
              {columns.map((c, i) => {
                const monthly = monthlyFor(c, m);
                return <td key={i}>{monthly == null ? "—" : formatBaht(monthly)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="qdoc-foot">
        <div className="qdoc-sign">
          ผู้เสนอราคา
          <div className="qdoc-sign-line">{seller.sellerName || "พนักงานขาย"}</div>
        </div>
        <div className="qdoc-sign">
          ผู้อนุมัติ / ลูกค้า
          <div className="qdoc-sign-line">&nbsp;</div>
        </div>
      </div>

      <p className="qdoc-note">
        * ราคาและค่างวดเป็นการประเมินเบื้องต้น อาจเปลี่ยนแปลงตามเงื่อนไขบริษัทไฟแนนซ์และการอนุมัติสินเชื่อ
        <br />* ค่างวดคำนวณจากดอกเบี้ยคงที่ (flat rate) ยังไม่รวมค่าธรรมเนียม/ประกันภัย
      </p>
    </section>
  );
}
