import { formatBaht, formatThaiDate } from "@/lib/format";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";
import type { Deal } from "@/lib/deal/deals";

/** เลขที่อ้างอิงจาก saleId (UUID) → สั้น อ่านง่าย บนเอกสาร */
function saleRef(saleId: string): string {
  return `SL-${saleId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/**
 * แม่แบบพิมพ์ใบขาย/ส่งมอบรถ (FAM-1074) — ใช้สไตล์ .print-doc/.qdoc-* ร่วมกับใบเสนอราคา
 * ซ่อนบนจอด้วย .print-doc · แสดงเดี่ยวตอน window.print() (globals.css :has(.print-doc))
 */
export function PrintableSaleDoc({ seller, deal }: { seller: QuoteSeller; deal: Deal }) {
  const sellerLines = [
    seller.address,
    seller.phone ? `โทร. ${seller.phone}` : null,
    seller.taxId ? `เลขผู้เสียภาษี ${seller.taxId}` : null,
  ]
    .filter((x): x is string => Boolean(x))
    .join("  ·  ");
  const isFinance = deal.payMethod === "finance";

  return (
    <section className="print-doc" aria-hidden>
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
          <div className="qdoc-title">ใบขาย / ส่งมอบรถ</div>
          <div className="qdoc-meta">
            เลขที่ <b>{saleRef(deal.saleId)}</b>
            <br />
            วันที่ <b>{formatThaiDate(deal.soldAt)}</b>
          </div>
        </div>
      </div>

      <p className="qdoc-customer">
        ผู้ซื้อ <b>{deal.customerName || "ลูกค้า"}</b>
      </p>

      <table className="qdoc-table qdoc-table--kv">
        <tbody>
          <tr className="qdoc-subhead">
            <td colSpan={2}>รายละเอียดรถ</td>
          </tr>
          <tr>
            <td>รุ่น / สี</td>
            <td>{deal.vehicle}</td>
          </tr>
          <tr>
            <td>เลขเครื่อง</td>
            <td>{deal.engineNo || "—"}</td>
          </tr>
          <tr>
            <td>ทะเบียน</td>
            <td>{deal.plateNo || "—"}</td>
          </tr>

          <tr className="qdoc-subhead">
            <td colSpan={2}>การชำระเงิน</td>
          </tr>
          <tr>
            <td>วิธีชำระ</td>
            <td>{isFinance ? "ผ่อนชำระ (ไฟแนนซ์)" : "เงินสด"}</td>
          </tr>
          {isFinance && deal.finance && (
            <>
              <tr>
                <td>บริษัทไฟแนนซ์</td>
                <td>{deal.finance.companyName}</td>
              </tr>
              {deal.finance.amount != null && (
                <tr>
                  <td>ยอดจัด</td>
                  <td>{formatBaht(deal.finance.amount)}</td>
                </tr>
              )}
            </>
          )}
          <tr className="qdoc-row-strong">
            <td>ราคาขายสุทธิ</td>
            <td>{formatBaht(deal.netPrice)}</td>
          </tr>
        </tbody>
      </table>

      <div className="qdoc-foot">
        <div className="qdoc-sign">
          ผู้ขาย
          <div className="qdoc-sign-line">{seller.sellerName || "พนักงานขาย"}</div>
        </div>
        <div className="qdoc-sign">
          ผู้ซื้อ
          <div className="qdoc-sign-line">&nbsp;</div>
        </div>
      </div>

      <p className="qdoc-note">
        * เอกสารสรุปการขาย/ส่งมอบรถ ไม่ใช่ใบกำกับภาษี
        <br />* โปรดตรวจสอบเลขเครื่อง/เลขตัวถังและสภาพรถให้ครบถ้วนก่อนรับมอบ
      </p>
    </section>
  );
}
