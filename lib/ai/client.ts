import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * ไคลเอนต์ Claude — คีย์อยู่ฝั่ง server เท่านั้น (process.env.ANTHROPIC_API_KEY, ไม่มี NEXT_PUBLIC)
 * ห้าม import จาก client component (E12 security)
 */
let cached: Anthropic | null = null;

export function aiClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY ยังไม่ตั้งค่า (server-only)");
  }
  if (!cached) {
    cached = new Anthropic({ apiKey });
  }
  return cached;
}
