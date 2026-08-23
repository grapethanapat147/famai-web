import { formatBaht, formatThaiDate } from "@/lib/format";
import { docTypeLabel, type DocDetail } from "@/lib/acct/documents";

/**
 * แม่แบบพิมพ์ใบเสร็จรับเงิน / ใบกำกับภาษี (FAM-1102) — ใช้สไตล์ .print-doc/.qdoc-* ร่วมกับเอกสารอื่น
 * ข้อมูลทั้งหมดมาจาก snapshot ในตาราง document (ไม่เปลี่ยนตามข้อมูลปัจจุบัน)
 */
export function PrintableReceipt({ doc }: { doc: DocDetail }) {
  const sellerLines = [
    doc.seller.address,
    doc.seller.phone ? `โทร. ${doc.seller.phone}` : null,
    doc.seller.taxId ? `เลขผู้เสียภาษี ${doc.seller.taxId}` : null,
  ]
    .filter((x): x is string => Boolean(x))
    .join("  ·  ");

  const buyerLines = [doc.buyer.address, doc.buyer.taxId ? `เลขผู้เสียภาษี ${doc.buyer.taxId}` : null]
    .filter((x): x is string => Boolean(x))
    .join("  ·  ");

  return (
    <section className="print-doc" aria-hidden>
      <div className="qdoc-head">
        <div>
          <div className="qdoc-brand">
            {doc.seller.name} <span className="qdoc-brand-accent">Yamaha</span>
          </div>
          {sellerLines ? <div className="qdoc-seller-line">{sellerLines}</div> : null}
        </div>
        <div>
          <div className="qdoc-title">{docTypeLabel(doc.docType)}</div>
          <div className="qdoc-meta">
            เลขที่ <b>{doc.docNo}</b>
            <br />
            วันที่ <b>{formatThaiDate(doc.date)}</b>
          </div>
        </div>
      </div>

      <p className="qdoc-customer">
        ผู้ซื้อ <b>{doc.buyer.name}</b>
        {buyerLines ? (
          <>
            <br />
            {buyerLines}
          </>
        ) : null}
      </p>

      <table className="qdoc-table qdoc-table--kv">
        <tbody>
          <tr className="qdoc-subhead">
            <td colSpan={2}>รายการ</td>
          </tr>
          <tr>
            <td>ยี่ห้อ / รุ่น / สี</td>
            <td>YAMAHA · {doc.vehicle}</td>
          </tr>
          <tr>
            <td>เลขตัวถัง</td>
            <td>{doc.frameNo || "—"}</td>
          </tr>
          <tr>
            <td>เลขเครื่อง</td>
            <td>{doc.engineNo || "—"}</td>
          </tr>
          <tr>
            <td>มูลค่าก่อนภาษี</td>
            <td>{formatBaht(doc.base)}</td>
          </tr>
          <tr>
            <td>ภาษีมูลค่าเพิ่ม</td>
            <td>{formatBaht(doc.vat)}</td>
          </tr>
          <tr className="qdoc-row-strong">
            <td>รวมทั้งสิ้น</td>
            <td>{formatBaht(doc.total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="qdoc-foot">
        <div className="qdoc-sign">
          ผู้รับสินค้า
          <div className="qdoc-sign-line">&nbsp;</div>
        </div>
        <div className="qdoc-sign">
          ผู้รับเงิน
          <div className="qdoc-sign-line">&nbsp;</div>
        </div>
        <div className="qdoc-sign">
          ผู้มีอำนาจลงนาม
          <div className="qdoc-sign-line">&nbsp;</div>
        </div>
      </div>
    </section>
  );
}
