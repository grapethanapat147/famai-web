import { describe, expect, it } from "vitest";
import { filterComboOptions, type ComboOption } from "@/components/ui/Combobox";

const opts: ComboOption[] = [
  { value: "1", label: "FINN · ฟ้า", sub: "E34RE-057401 · พะเยา", keywords: "B6FU00" },
  { value: "2", label: "NMAX · แดง", sub: "E3X8E-112097 · สายสี่", keywords: "BTF200" },
  { value: "3", label: "XMAX 300 · ดำ", sub: "EA71E-900233 · พะเยา", keywords: "DR9200" },
];

describe("filterComboOptions", () => {
  it("returns all when query is blank", () => {
    expect(filterComboOptions(opts, "  ")).toHaveLength(3);
  });
  it("matches on label", () => {
    expect(filterComboOptions(opts, "nmax").map((o) => o.value)).toEqual(["2"]);
  });
  it("matches on sub (engine no / branch) case-insensitively", () => {
    expect(filterComboOptions(opts, "e34re").map((o) => o.value)).toEqual(["1"]);
    expect(filterComboOptions(opts, "พะเยา").map((o) => o.value)).toEqual(["1", "3"]);
  });
  it("matches on keywords (model code)", () => {
    expect(filterComboOptions(opts, "dr9200").map((o) => o.value)).toEqual(["3"]);
  });
  it("returns none when nothing matches", () => {
    expect(filterComboOptions(opts, "zzz")).toEqual([]);
  });
});
