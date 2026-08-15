/**
 * เตรียมคอลัมน์สำหรับเอกสารพิมพ์ใบเสนอราคา (FAM-1029)
 * แปลง built rows ของตัวสร้าง → คอลัมน์เทียบที่พร้อมพิมพ์ (คัดเฉพาะคันที่เลือกรุ่น+มีราคา)
 * ตรรกะล้วน (ไม่มี React/DOM) เพื่อเทสต์ได้ตรง ๆ และใช้ร่วมกับตารางบนจอ
 */

import type { TermRow } from "@/lib/quote/finance";

export type PrintBuilt = {
  o: { price: number; down: number };
  v?: { name: string };
  fin?: { name: string; ratePct: number };
  financed: number;
  terms: readonly TermRow[];
};

export type PrintColumn = {
  name: string;
  price: number;
  down: number;
  financed: number;
  financeLabel: string;
  monthlyByTerm: Record<number, number>;
};

/** คัดเฉพาะคันที่เลือกรุ่นแล้วและมีราคา แล้วแปลงเป็นคอลัมน์พิมพ์ */
export function quotePrintColumns(built: readonly PrintBuilt[]): PrintColumn[] {
  return built
    .filter((b) => b.v !== undefined && b.o.price > 0)
    .map((b) => ({
      name: b.v!.name,
      price: b.o.price,
      down: b.o.down,
      financed: b.financed,
      financeLabel: b.fin ? `${b.fin.name} ${b.fin.ratePct}%` : "เงินสด",
      monthlyByTerm: Object.fromEntries(b.terms.map((t) => [t.months, t.monthly])),
    }));
}

/** ค่างวด/เดือนของงวดที่ระบุ — null ถ้าไม่มี (เช่น เงินสด) */
export function monthlyFor(col: PrintColumn, months: number): number | null {
  const value = col.monthlyByTerm[months];
  return value == null ? null : value;
}
