import { notFound } from "next/navigation";
import { ManualBookView } from "@/components/manual/ManualBookView";
import { MANUAL_PRINT_CSS } from "@/components/manual/manual-print-css";
import { MANUAL_BOOKS, manualBook } from "@/lib/manual/manual";

/**
 * คู่มือหนึ่งเล่ม ในรูปแบบพร้อมพิมพ์ (FAM-1138)
 * เปิดในเบราว์เซอร์แล้วสั่งพิมพ์ก็ได้ PDF เล่มเดียวกับที่ `node tools/manual/build.js` สร้าง
 * ไม่ต้องล็อกอิน ไม่แตะฐานข้อมูล — เนื้อหาทั้งหมดมาจาก lib/manual/manual.ts + MENU + FLOWS
 * ภาพหน้าจอในภาคผนวกคือหน้า /dev/* ที่ฝังมาแบบย่อส่วน จึงตรงกับระบบเสมอโดยไม่ต้องถ่ายภาพใหม่
 */

export function generateStaticParams() {
  return MANUAL_BOOKS.map((b) => ({ book: b.key }));
}

export default async function ManualBookPage({ params }: { params: Promise<{ book: string }> }) {
  const { book } = await params;
  const meta = manualBook(book);
  if (!meta) {
    notFound();
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: MANUAL_PRINT_CSS }} />
      <title>{`${meta.title} — Famai Motor Group`}</title>
      <ManualBookView bookKey={book} />
    </>
  );
}
