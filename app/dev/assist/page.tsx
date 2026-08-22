import { AssistChat } from "@/components/ai/AssistChat";

/** พรีวิวผู้ช่วยวิเคราะห์ (E12) — /assist จริงต้องล็อกอิน + AI_ENABLED + คีย์ */
export default function DevAssistPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-6">
      <p className="mb-4 text-xs text-muted">preview — ถามจริงต้องล็อกอิน + ตั้ง ANTHROPIC_API_KEY + AI_ENABLED=true</p>
      <AssistChat />
    </main>
  );
}
