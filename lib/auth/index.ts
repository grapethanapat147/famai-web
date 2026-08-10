import "server-only";

/**
 * ดึงผู้ใช้ปัจจุบัน + สิทธิ์ (role / branch / perms) สำหรับตัดสินใจฝั่งเซิร์ฟเวอร์
 * unknown role → fail closed (ไม่มีสิทธิ์). Implementation จริงอยู่ใน FAM-1005
 */
export async function getCurrentUser(): Promise<null> {
  return null;
}
