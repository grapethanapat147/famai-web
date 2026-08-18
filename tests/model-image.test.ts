import { describe, it, expect } from "vitest";
import { fitDimensions, canUploadModelPhoto } from "@/lib/models/image";

describe("fitDimensions (FAM-1024)", () => {
  it("scales down landscape to fit max on the long side", () => {
    expect(fitDimensions(1600, 1200, 640)).toEqual({ w: 640, h: 480 });
  });

  it("scales down portrait to fit max on the long side", () => {
    expect(fitDimensions(1200, 1600, 640)).toEqual({ w: 480, h: 640 });
  });

  it("does not upscale images already smaller than max", () => {
    expect(fitDimensions(400, 300, 640)).toEqual({ w: 400, h: 300 });
  });

  it("keeps square images square", () => {
    expect(fitDimensions(2000, 2000, 1600)).toEqual({ w: 1600, h: 1600 });
  });

  it("guards zero/negative dimensions", () => {
    expect(fitDimensions(0, 100, 640)).toEqual({ w: 0, h: 0 });
    expect(fitDimensions(-5, 100, 640)).toEqual({ w: 0, h: 0 });
  });
});

describe("canUploadModelPhoto", () => {
  it("only admin/manager (matches is_manager RLS)", () => {
    expect(canUploadModelPhoto(["admin"])).toBe(true);
    expect(canUploadModelPhoto(["manager"])).toBe(true);
    expect(canUploadModelPhoto(["sales"])).toBe(false);
    expect(canUploadModelPhoto(["stock"])).toBe(false);
    expect(canUploadModelPhoto([])).toBe(false);
  });
});
