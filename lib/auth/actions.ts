"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase/server";
import { CUSTOMER_MODE_COOKIE } from "@/lib/auth/constants";

export type LoginState = { error: string } | null;

/**
 * เข้าสู่ระบบด้วย Supabase Auth (รหัสผ่าน hash โดย Supabase — ไม่เขียนเอง)
 * โหมดทดลอง (DEMO_LOGIN=true): ใส่อะไรก็ได้ → เข้าเป็นบัญชีทดลองจริงตาม DEMO_LOGIN_EMAIL/PASSWORD
 * (คีย์อยู่ฝั่ง server เท่านั้น ไม่หลุดไป client) → ยังเห็นข้อมูลจริงผ่าน RLS · ปิดโหมดนี้ก่อนเปิดใช้จริง
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const demo = process.env.DEMO_LOGIN === "true";
  let email = String(formData.get("email") ?? "").trim();
  let password = String(formData.get("password") ?? "");

  if (demo && process.env.DEMO_LOGIN_EMAIL && process.env.DEMO_LOGIN_PASSWORD) {
    email = process.env.DEMO_LOGIN_EMAIL;
    password = process.env.DEMO_LOGIN_PASSWORD;
  } else if (!email || !password) {
    return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };
  }

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: demo ? "บัญชีทดลองยังไม่พร้อม — ตรวจ DEMO_LOGIN_EMAIL / DEMO_LOGIN_PASSWORD" : "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  redirect("/dash");
}

/** ออกจากระบบ */
export async function logout(): Promise<void> {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/login");
}

/** สลับโหมดลูกค้า (ซ่อน/แสดงต้นทุน-กำไรทุกหน้า) — เก็บใน cookie แล้ว re-render ให้ server strip ใหม่ */
export async function toggleCustomerMode(): Promise<void> {
  const store = await cookies();
  const on = store.get(CUSTOMER_MODE_COOKIE)?.value === "1";
  store.set(CUSTOMER_MODE_COOKIE, on ? "0" : "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
  });
  revalidatePath("/", "layout");
}
