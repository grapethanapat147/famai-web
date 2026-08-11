import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import "./globals.css";

// Noto Sans Thai — self-host จาก woff2 ในโปรเจกต์ (vendored จาก tools/manual/fonts) ไม่มี request ออก Google
const notoThai = localFont({
  variable: "--f-thai",
  display: "swap",
  src: [
    { path: "./fonts/noto-thai-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/noto-thai-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/noto-thai-700.woff2", weight: "700", style: "normal" },
  ],
});

// Inter — next/font self-host ตอน build (ไม่มี request ออก Google ตอน runtime) ให้ตัวเลข tabular กับตารางเงิน
const inter = Inter({ variable: "--f-inter", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Famai Motor Group",
  description: "ระบบจัดการดีลเลอร์รถจักรยานยนต์ Yamaha 3 สาขา",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="th" className={`${notoThai.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
