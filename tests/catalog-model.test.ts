import { describe, it, expect } from "vitest";
import { availabilityMeta, catalogPhotoUrl } from "@/lib/catalog/model";

describe("availabilityMeta", () => {
  it("maps known availability values", () => {
    expect(availabilityMeta("ready")).toEqual({ label: "มีจำหน่าย", variant: "good" });
    expect(availabilityMeta("low")).toEqual({ label: "เหลือน้อย", variant: "warn" });
    expect(availabilityMeta("order")).toEqual({ label: "สั่งจอง", variant: "off" });
  });
  it("falls back to สั่งจอง for unknown", () => {
    expect(availabilityMeta("weird").label).toBe("สั่งจอง");
  });
});

describe("catalogPhotoUrl", () => {
  const base = "https://proj.supabase.co";
  it("uses photo directly when it is a full url", () => {
    expect(catalogPhotoUrl(base, { photo: "https://cdn/x.jpg", photos: null })).toBe("https://cdn/x.jpg");
  });
  it("builds bucket url from photos[0].card", () => {
    expect(catalogPhotoUrl(base, { photo: null, photos: [{ card: "v1/c.webp", full: "v1/f.webp" }] })).toBe(
      "https://proj.supabase.co/storage/v1/object/public/model-photo/v1/c.webp",
    );
  });
  it("treats a bare photo path as a bucket path", () => {
    expect(catalogPhotoUrl(base, { photo: "v1/c.webp", photos: null })).toBe(
      "https://proj.supabase.co/storage/v1/object/public/model-photo/v1/c.webp",
    );
  });
  it("returns null when no image", () => {
    expect(catalogPhotoUrl(base, { photo: null, photos: null })).toBeNull();
    expect(catalogPhotoUrl(base, { photo: null, photos: [] })).toBeNull();
  });
});
