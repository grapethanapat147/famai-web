import { describe, it, expect } from "vitest";
import { SETTING_FIELDS, SETTING_GROUPS, formatForInput, parseInput } from "@/lib/settings/fields";
import { SETTING_DEFAULTS } from "@/lib/settings/resolve";

describe("SETTING_FIELDS coverage", () => {
  it("covers every key in AppSettings exactly once", () => {
    const fieldKeys = SETTING_FIELDS.map((f) => f.key).sort();
    const settingKeys = Object.keys(SETTING_DEFAULTS).sort();
    expect(fieldKeys).toEqual(settingKeys);
  });

  it("every field's group is a known group", () => {
    for (const f of SETTING_FIELDS) {
      expect(SETTING_GROUPS).toContain(f.group);
    }
  });
});

describe("formatForInput", () => {
  it("joins int-lists and stringifies scalars", () => {
    expect(formatForInput("int-list", [12, 24, 36])).toBe("12, 24, 36");
    expect(formatForInput("number", 90)).toBe("90");
    expect(formatForInput("bool", true)).toBe("true");
    expect(formatForInput("time", "08:30")).toBe("08:30");
  });
});

describe("parseInput", () => {
  it("parses numbers and rejects negatives", () => {
    expect(parseInput("number", "90")).toEqual({ ok: true, value: 90 });
    expect(parseInput("number", "-1").ok).toBe(false);
    expect(parseInput("number", "").ok).toBe(false);
  });

  it("percent caps at 100", () => {
    expect(parseInput("percent", "7")).toEqual({ ok: true, value: 7 });
    expect(parseInput("percent", "150").ok).toBe(false);
  });

  it("int-list dedupes + sorts ascending, rejects non-positive ints", () => {
    expect(parseInput("int-list", "36, 12, 24, 12")).toEqual({ ok: true, value: [12, 24, 36] });
    expect(parseInput("int-list", "").ok).toBe(false);
    expect(parseInput("int-list", "12, x").ok).toBe(false);
    expect(parseInput("int-list", "0, 5").ok).toBe(false);
  });

  it("bool only accepts true/false strings", () => {
    expect(parseInput("bool", "true")).toEqual({ ok: true, value: true });
    expect(parseInput("bool", "false")).toEqual({ ok: true, value: false });
    expect(parseInput("bool", "yes").ok).toBe(false);
  });

  it("time enforces HH:MM 24h", () => {
    expect(parseInput("time", "08:30")).toEqual({ ok: true, value: "08:30" });
    expect(parseInput("time", "23:59").ok).toBe(true);
    expect(parseInput("time", "24:00").ok).toBe(false);
    expect(parseInput("time", "8:30").ok).toBe(false);
  });
});
