import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** หน้าแรก — พาเข้าแอปเลย (ล็อกอินแล้ว → แดชบอร์ด · ยังไม่ล็อกอิน → เข้าสู่ระบบ) */
export default async function Home() {
  const user = await getCurrentUser();
  redirect(user ? "/dash" : "/login");
}
