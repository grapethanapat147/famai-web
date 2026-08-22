import { formatBaht, formatThaiDate } from "@/lib/format";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";
import { vatBreakdown, type Deal } from "@/lib/deal/deals";

/**
 * แม่แบบพิมพ์ใบกำกับภาษี (FAM-1077) — ใช้สไตล์ .print-doc/.qdoc-* ร่วมกับเอกสารอื่น
 * เลขที่ใบกำกับภาษีออกตอนบันทึกการขายแล้ว (sale.doc_no ← next_doc_no 'TAXINV')
 * ราคาสุทธิรวม VAT อยู่แล้ว → แยกมูลค่าก่อนภาษี + VAT ด้วย vatBreakdown
 */
export function PrintableTaxInvoice({ seller, deal, vatPct }: { seller: QuoteSeller; deal: Deal; vatPct: number }) {
  const sellerLines = [
    seller.address,
    seller.phone ? `โทร. ${seller.phone}` : null,
    seller.taxId ? `เลขประจำตัวผู้เสียภาษี ${seller.taxId}` : null,
  ]
    .filter((x): x is string => Boolean(x))
    .join("  ·  ");
  const { valueBeforeVat, vat } = vatBreakdown(deal.netPrice, vatPct);

  return (
    <section className="print-doc" aria-hidden>
      <div className="qdoc-head">
        <div>
          <div className="qdoc-brand">
            {seller.shopName} <span className="qdoc-brand-accent">Yamaha</span>
          </div>
          <div className="qdoc-seller-line">
            สาขา{seller.branchName}
            {sellerLines ? (
              <>
                <br />
                {sellerLines}
              </>
            ) : null}
          </div>
        </div>
        <div>
          <div className="qdoc-title">ใบกำกับภาษี</div>
          <div className="qdoc-meta">
            เลขที่ <b>{deal.docNo ?? "—"}</b>
            <br />
            วันที่ <b>{formatThaiDate(deal.soldAt)}</b>
          </div>
        </div>
      </div>

      <div className="qdoc-customer">
        <b>ผู้ซื้อ</b> {deal.customerName || "ลูกค้า"}
        {deal.customerAddress ? (
          <>
            <br />
            {deal.customerAddress}
          </>
        ) : null}
        {deal.customerTaxId ? (
          <>
            <br />
            เลขประจำตัวผู้เสียภาษี {deal.customerTaxId}
          </>
        ) : null}
      </div>

      <table className="qdoc-table">
        <thead>
          <tr>
            <th>รายการ</th>
            <th>จำนวน</th>
            <th>มูลค่า</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {deal.vehicle}
              {deal.engineNo ? ` · เลขเครื่อง ${deal.engineNo}` : ""}
            </td>
            <td>1</td>
            <td>{formatBaht(valueBeforeVat)}</td>
          </tr>
          <tr>
            <td colSpan={2}>มูลค่าสินค้า (ก่อนภาษี)</td>
            <td>{formatBaht(valueBeforeVat)}</td>
          </tr>
          <tr>
            <td colSpan={2}>ภาษีมูลค่าเพิ่ม {vatPct}%</td>
            <td>{formatBaht(vat)}</td>
          </tr>
          <tr className="qdoc-row-strong">
            <td colSpan={2}>รวมทั้งสิ้น</td>
            <td>{formatBaht(deal.netPrice)}</td>
          </tr>
        </tbody>
      </table>

      <div className="qdoc-foot">
        <div className="qdoc-sign">
          ผู้รับเงิน / ผู้มีอำนาจออกใบกำกับภาษี
          <div className="qdoc-sign-line">{seller.sellerName || "พนักงาน"}</div>
        </div>
        <div className="qdoc-sign">
          ผู้ซื้อ
          <div className="qdoc-sign-line">&nbsp;</div>
        </div>
      </div>

      <p className="qdoc-note">
        * เลขที่ใบกำกับภาษีออกอัตโนมัติตอนบันทึกการขาย · ราคารวมภาษีมูลค่าเพิ่มแล้ว
        <br />* ใช้ได้เมื่อกิจการจดทะเบียนภาษีมูลค่าเพิ่ม (มีเลขประจำตัวผู้เสียภาษีผู้ขาย)
      </p>
    </section>
  );
}
