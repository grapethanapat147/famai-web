import type { Metadata } from "next";
import { StatusCheck } from "@/components/catalog/StatusCheck";

export const metadata: Metadata = {
  title: "เช็กสถานะซื้อรถ — Famai Motor Group",
  description: "กรอกรหัสติดตามเพื่อดูสถานะการดำเนินการซื้อรถกับ Famai Motor Group",
  robots: { index: false },
};

export default function StatusPage() {
  return <StatusCheck />;
}
