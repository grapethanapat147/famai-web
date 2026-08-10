import "server-only";

import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { CUSTOMER_MODE_COOKIE } from "@/lib/auth/constants";

/** โหมดลูกค้าเปิดอยู่ไหม (อ่านจาก cookie) */
export async function isCustomerMode(): Promise<boolean> {
  const store = await cookies();
  return store.get(CUSTOMER_MODE_COOKIE)?.value === "1";
}

/**
 * เห็นเงินได้ = มีสิทธิ์ `money` **และ** ไม่ได้อยู่ในโหมดลูกค้า
 * ใช้เป็น `canSee` ให้ stripMoneyFields / คอมโพเนนต์ Money
 */
export async function canSeeMoney(): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user?.perms.money) return false;
  if (await isCustomerMode()) return false;
  return true;
}
