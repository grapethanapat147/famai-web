import { formatBaht, formatThaiMonth } from "@/lib/format";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";
import type { PayslipRow } from "@/lib/payroll/payroll";

function otHint(minutes: number): string {
  if (!minutes) {
    return "";
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h ? `${h} ชม.` : ""}${m ? ` ${m} น.` : ""}`.trim();
}

/**
 * แม่แบบพิมพ์สลิปเงินเดือนรายคน (FAM-1076) — ใช้สไตล์ .print-doc/.qdoc-* ร่วมกับเอกสารอื่น
 * ซ่อนบนจอด้วย .print-doc · แสดงเดี่ยวตอน window.print() (globals.css :has(.print-doc))
 * ตัวเลขถูก money-strip มาจาก server แล้วเมื่อผู้ใช้ไม่มีสิทธิ์เห็นเงิน
 */
export function PrintableEmployeePayslip({
  seller,
  month,
  row,
}: {
  seller: QuoteSeller;
  month: string;
  row: PayslipRow;
}) {
  const sellerLines = [
    seller.address,
    seller.phone ? `โทร. ${seller.phone}` : null,
    seller.taxId ? `เลขผู้เสียภาษี ${seller.taxId}` : null,
  ]
    .filter((x): x is string => Boolean(x))
    .join("  ·  ");
  const ot = otHint(row.otMinutes);

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
          <div className="qdoc-title">สลิปเงินเดือน</div>
          <div className="qdoc-meta">
            งวด <b>{formatThaiMonth(month)}</b>
          </div>
        </div>
      </div>

      <p className="qdoc-customer">
        พนักงาน <b>{row.name}</b> · {row.position}
      </p>

      <table className="qdoc-table">
        <tbody>
          <tr className="qdoc-subhead">
            <td colSpan={2}>รายรับ</td>
          </tr>
          <tr>
            <td>เงินเดือน</td>
            <td>{formatBaht(row.base)}</td>
          </tr>
          <tr>
            <td>ค่าล่วงเวลา{ot ? ` (${ot})` : ""}</td>
            <td>{formatBaht(row.otAmount)}</td>
          </tr>
          <tr>
            <td>คอมมิชชั่น</td>
            <td>{formatBaht(row.commission)}</td>
          </tr>
          <tr className="qdoc-row-strong">
            <td>รวมรายรับ</td>
            <td>{formatBaht(row.gross)}</td>
          </tr>

          <tr className="qdoc-subhead">
            <td colSpan={2}>รายการหัก</td>
          </tr>
          <tr>
            <td>ประกันสังคม</td>
            <td>{formatBaht(-row.ssn)}</td>
          </tr>

          <tr className="qdoc-row-strong">
            <td>เงินได้สุทธิ</td>
            <td>{formatBaht(row.net)}</td>
          </tr>
        </tbody>
      </table>

      <div className="qdoc-foot">
        <div className="qdoc-sign">
          ผู้จ่ายเงิน
          <div className="qdoc-sign-line">{seller.sellerName || "ฝ่ายบุคคล"}</div>
        </div>
        <div className="qdoc-sign">
          ผู้รับเงิน
          <div className="qdoc-sign-line">{row.name}</div>
        </div>
      </div>

      <p className="qdoc-note">
        * เอกสารลับเฉพาะบุคคล — โปรดเก็บรักษาเป็นความลับ
        <br />* ประกันสังคมหักตามอัตราที่กฎหมายกำหนด
      </p>
    </section>
  );
}
