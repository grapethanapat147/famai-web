import { describe, expect, it } from "vitest";
import { stepValue } from "@/components/ui/MoneyStepInput";

describe("stepValue", () => {
  it("adds the delta to the current value", () => {
    expect(stepValue(0, 5000)).toBe(5000);
    expect(stepValue(46900, 10000)).toBe(56900);
  });
  it("treats falsy current as 0", () => {
    expect(stepValue(Number.NaN, 1000)).toBe(1000);
  });
  it("clamps to 0 (never negative)", () => {
    expect(stepValue(500, -1000)).toBe(0);
  });
});
