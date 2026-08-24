import { describe, it, expect } from "vitest";
import { dueReminders, type RemRow } from "@/lib/automation/service";
import { serviceReminderDigest } from "@/lib/line/message";

const rem = (over: Partial<RemRow>): RemRow => ({
  id: "r1",
  customerName: "สมชาย",
  model: "NMAX",
  targetKm: 1000,
  dueDate: "2026-08-10",
  notified: false,
  ...over,
});

describe("dueReminders", () => {
  const today = "2026-08-21";
  it("keeps due + un-notified, earliest-due first", () => {
    const out = dueReminders(
      [
        rem({ id: "a", dueDate: "2026-08-20" }),
        rem({ id: "b", dueDate: "2026-07-01" }),
        rem({ id: "c", dueDate: "2026-09-01" }), // ยังไม่ถึง
        rem({ id: "d", dueDate: "2026-08-01", notified: true }), // เตือนแล้ว
        rem({ id: "e", dueDate: null }), // ไม่มีกำหนด
      ],
      today,
    );
    expect(out.map((r) => r.id)).toEqual(["b", "a"]);
  });
  it("includes reminders due exactly today", () => {
    expect(dueReminders([rem({ dueDate: today })], today)).toHaveLength(1);
  });
});

describe("serviceReminderDigest", () => {
  it("returns null when none due", () => {
    expect(serviceReminderDigest([], "21 ส.ค. 2026")).toBeNull();
  });
  it("summarizes customer/model/km/due", () => {
    const msg = serviceReminderDigest([rem({ customerName: "มานี", targetKm: 4000, dueDate: "2026-08-10" })], "21 ส.ค. 2026")!;
    expect(msg).toContain("1 ราย");
    expect(msg).toContain("มานี · NMAX · เช็กระยะ 4,000 กม. · ครบ 10 ส.ค. 2569");
  });
});
