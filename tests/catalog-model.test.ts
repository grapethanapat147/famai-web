import { describe, it, expect } from "vitest";
import { availabilityMeta, catalogPhotoUrl, modelPhotoUrl, galleryImages } from "@/lib/catalog/model";

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

describe("modelPhotoUrl", () => {
  const base = "https://proj.supabase.co";
  it("builds bucket url from a path", () => {
    expect(modelPhotoUrl(base, "v1/f.webp")).toBe("https://proj.supabase.co/storage/v1/object/public/model-photo/v1/f.webp");
  });
  it("passes through an absolute url", () => {
    expect(modelPhotoUrl(base, "https://cdn/x.jpg")).toBe("https://cdn/x.jpg");
  });
});

describe("galleryImages", () => {
  const base = "https://proj.supabase.co";
  it("maps photos[] to thumb(card)+full", () => {
    const g = galleryImages(base, { photo: null, photos: [{ card: "a/c.webp", full: "a/f.webp" }] });
    expect(g).toEqual([
      {
        thumb: "https://proj.supabase.co/storage/v1/object/public/model-photo/a/c.webp",
        full: "https://proj.supabase.co/storage/v1/object/public/model-photo/a/f.webp",
      },
    ]);
  });
  it("falls back to the cover when no photos[]", () => {
    expect(galleryImages(base, { photo: "https://cdn/x.jpg", photos: null })).toEqual([
      { thumb: "https://cdn/x.jpg", full: "https://cdn/x.jpg" },
    ]);
  });
  it("returns [] when no image at all", () => {
    expect(galleryImages(base, { photo: null, photos: null })).toEqual([]);
  });
});
