import { describe, it, expect } from "vitest";
import { buildMonthGrid, monthLabel, shiftMonth } from "@/lib/calendar/grid";
import { expandLeave, eventsByDay, filterByType, countsByType, EVENT_ORDER, type CalEvent } from "@/lib/calendar/events";

describe("buildMonthGrid", () => {
  it("covers the whole month with 7-day weeks starting Sunday", () => {
    const weeks = buildMonthGrid(2026, 7); // สิงหาคม 2026 (month0=7)
    for (const w of weeks) {
      expect(w).toHaveLength(7);
    }
    const flat = weeks.flat();
    // ทุกแถวเริ่มวันอาทิตย์ → cell แรกของสัปดาห์แรกเป็นอาทิตย์
    expect(new Date(flat[0].date + "T00:00:00Z").getUTCDay()).toBe(0);
    // วันในเดือน = 01..31 ครบ 31 วัน เรียงถูก
    const inMonth = flat.filter((d) => d.inMonth).map((d) => d.date);
    expect(inMonth).toHaveLength(31);
    expect(inMonth[0]).toBe("2026-08-01");
    expect(inMonth[30]).toBe("2026-08-31");
  });

  it("handles leap February", () => {
    expect(buildMonthGrid(2024, 1).flat().filter((d) => d.inMonth)).toHaveLength(29);
    expect(buildMonthGrid(2026, 1).flat().filter((d) => d.inMonth)).toHaveLength(28);
  });
});

describe("monthLabel + shiftMonth", () => {
  it("formats Thai month + BE year and shifts across year boundary", () => {
    expect(monthLabel("2026-08")).toBe("สิงหาคม 2569");
    expect(shiftMonth("2026-08", 1)).toBe("2026-09");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

describe("expandLeave", () => {
  it("expands inclusive day range", () => {
    expect(expandLeave("2026-08-10", "2026-08-12")).toEqual(["2026-08-10", "2026-08-11", "2026-08-12"]);
    expect(expandLeave("2026-08-12", "2026-08-10")).toEqual([]);
  });

  it("clamps to the visible month window", () => {
    expect(expandLeave("2026-07-30", "2026-08-02", "2026-08-01", "2026-08-31")).toEqual(["2026-08-01", "2026-08-02"]);
  });
});

describe("event grouping", () => {
  const events: CalEvent[] = [
    { date: "2026-08-05", type: "company", title: "ประชุมทีม", subtitle: null },
    { date: "2026-08-05", type: "leave", title: "สมชาย ลา", subtitle: "ลาป่วย" },
    { date: "2026-08-10", type: "reg", title: "ครบกำหนดจดทะเบียน", subtitle: null },
  ];

  it("eventsByDay groups by date", () => {
    const map = eventsByDay(events);
    expect(map.get("2026-08-05")).toHaveLength(2);
    expect(map.get("2026-08-10")).toHaveLength(1);
  });

  it("filterByType + countsByType", () => {
    expect(filterByType(events, "leave").map((e) => e.title)).toEqual(["สมชาย ลา"]);
    const c = countsByType(events);
    expect(c.company).toBe(1);
    expect(c.service).toBe(0);
    expect(Object.keys(c)).toHaveLength(EVENT_ORDER.length);
  });
});
