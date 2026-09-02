import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { readDemoLoginState } from "@/lib/auth/demo";

export const metadata = { title: "เข้าสู่ระบบ — Famai Motor Group" };

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect("/dash");
  }
  const demoState = readDemoLoginState();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-[16px] bg-card p-6 shadow-[var(--sh-md)]">
        <div className="mb-5">
          <span className="inline-flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <span className="h-2 w-2 rounded-full bg-accent" aria-hidden />
            Famai Motor Group
          </span>
          <p className="mt-1 text-sm text-ink-soft">เข้าสู่ระบบเพื่อจัดการสต๊อกและการขาย</p>
        </div>
        {!demoState.enabled && demoState.misconfigured && (
          <p className="mb-4 rounded-[10px] border border-accent bg-accent/10 px-3 py-2 text-sm text-ink">
            ⚠️ {demoState.reason}
          </p>
        )}
        <LoginForm demo={demoState.enabled} />
      </div>
    </main>
  );
}
