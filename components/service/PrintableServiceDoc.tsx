import { formatBaht, formatThaiDate } from "@/lib/format";
import type { QuoteSeller } from "@/components/quote/PrintableQuoteDoc";
import type { ServiceJob } from "@/lib/service/jobs";

/**
 * แม่แบบพิมพ์ใบสั่งซ่อม (FAM-1075) — ใช้สไตล์ .print-doc/.qdoc-* ร่วมกับใบเสนอราคา/ใบขาย
 * ซ่อนบนจอด้วย .print-doc · แสดงเดี่ยวตอน window.print() (globals.css :has(.print-doc))
 */
export function PrintableServiceDoc({ seller, job }: { seller: QuoteSeller; job: ServiceJob }) {
  const sellerLines = [
    seller.address,
    seller.phone ? `โทร. ${seller.phone}` : null,
    seller.taxId ? `เลขผู้เสียภาษี ${seller.taxId}` : null,
  ]
    .filter((x): x is string => Boolean(x))
    .join("  ·  ");

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
          <div className="qdoc-title">ใบสั่งซ่อม</div>
          <div className="qdoc-meta">
            เลขที่ <b>{job.jobNo}</b>
            <br />
            วันที่ <b>{formatThaiDate(job.checkedInAt)}</b>
            <br />
            สถานะ <b>{job.status}</b>
          </div>
        </div>
      </div>

      <p className="qdoc-customer">
        ลูกค้า <b>{job.customerName || "ลูกค้า"}</b>
      </p>

      <table className="qdoc-table qdoc-table--kv">
        <tbody>
          <tr className="qdoc-subhead">
            <td colSpan={2}>ข้อมูลรถ</td>
          </tr>
          <tr>
            <td>รถ</td>
            <td>{job.vehicle}</td>
          </tr>
          <tr>
            <td>เลขเครื่อง</td>
            <td>{job.engineNo || "—"}</td>
          </tr>
          <tr>
            <td>เลขไมล์</td>
            <td>{job.odometerKm != null ? `${job.odometerKm.toLocaleString("en-US")} กม.` : "—"}</td>
          </tr>
          <tr>
            <td>ประเภทงาน</td>
            <td>{job.serviceType}</td>
          </tr>
          <tr>
            <td>ช่างผู้รับผิดชอบ</td>
            <td>{job.technicianName || "—"}</td>
          </tr>
          {job.symptom && (
            <tr>
              <td>อาการ/รายละเอียด</td>
              <td>{job.symptom}</td>
            </tr>
          )}
        </tbody>
      </table>

      <table className="qdoc-table">
        <thead>
          <tr>
            <th>รายการ</th>
            <th>จำนวน</th>
            <th>ราคา/หน่วย</th>
            <th>รวม</th>
          </tr>
        </thead>
        <tbody>
          {job.lines.length === 0 ? (
            <tr>
              <td colSpan={4}>— ยังไม่มีรายการ —</td>
            </tr>
          ) : (
            job.lines.map((ln) => (
              <tr key={ln.id}>
                <td>
                  {ln.kind === "labor" ? "ค่าแรง" : "อะไหล่"} · {ln.description}
                </td>
                <td>{ln.qty}</td>
                <td>{formatBaht(ln.unitPrice)}</td>
                <td>{formatBaht(ln.amount)}</td>
              </tr>
            ))
          )}
          <tr>
            <td colSpan={3}>ค่าแรงรวม</td>
            <td>{formatBaht(job.laborCost)}</td>
          </tr>
          <tr>
            <td colSpan={3}>ค่าอะไหล่รวม</td>
            <td>{formatBaht(job.partsCost)}</td>
          </tr>
          <tr className="qdoc-row-strong">
            <td colSpan={3}>รวมสุทธิ</td>
            <td>{formatBaht(job.total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="qdoc-foot">
        <div className="qdoc-sign">
          ช่างผู้รับงาน
          <div className="qdoc-sign-line">{job.technicianName || "—"}</div>
        </div>
        <div className="qdoc-sign">
          ลูกค้า
          <div className="qdoc-sign-line">&nbsp;</div>
        </div>
      </div>

      <p className="qdoc-note">
        * ราคาเป็นการประเมินเบื้องต้น อาจเปลี่ยนแปลงตามงานจริงและอะไหล่ที่ใช้
        <br />* กรุณาเก็บเอกสารนี้ไว้เป็นหลักฐานในการรับรถคืน
      </p>
    </section>
  );
}
