import { describe, expect, it } from "vitest";
import { regPrev, substatusOptions, STAGE_SUBSTATUS } from "@/lib/deal/stage";
import { buildLeads, validateLeadInput, type LeadInput } from "@/lib/deal/lead";

describe("substatusOptions", () => {
  it("returns the options for a known stage", () => {
    expect(substatusOptions("ส่งไฟแนนซ์")).toEqual(STAGE_SUBSTATUS["ส่งไฟแนนซ์"]);
    expect(substatusOptions("ส่งไฟแนนซ์")).toContain("รอผลพิจารณา");
  });
  it("returns [] for an unknown stage", () => {
    expect(substatusOptions("ไม่มีขั้นนี้")).toEqual([]);
  });
  it("every real stage has at least one option", () => {
    for (const opts of Object.values(STAGE_SUBSTATUS)) {
      expect(opts.length).toBeGreaterThan(0);
    }
  });
});

describe("regPrev", () => {
  it("cash track steps back one stage", () => {
    expect(regPrev("รอทะเบียน", "cash")).toBe("ขายแล้ว");
    expect(regPrev("ส่งมอบแล้ว", "cash")).toBe("ป้ายขาว");
  });
  it("finance track steps back one stage (incl. finance-only stages)", () => {
    expect(regPrev("อนุมัติ", "finance")).toBe("ส่งไฟแนนซ์");
    expect(regPrev("รอทะเบียน", "finance")).toBe("อนุมัติ");
  });
  it("returns null at the first stage or off-track", () => {
    expect(regPrev("ขายแล้ว", "cash")).toBeNull();
    expect(regPrev("ส่งไฟแนนซ์", "cash")).toBeNull(); // ไม่อยู่ใน cash track
  });
});

const leadBase: LeadInput = { name: "กานดา ทองคำ", phone: "081-111-2222", interestedVariantId: "v1", interestedColorCode: "010A", source: "Facebook", note: "งบ 5 หมื่น" };

describe("รุ่นย่อย + สีที่สนใจ (FAM-1150)", () => {
  it("เลือกสีโดยไม่เลือกรุ่น = ปฏิเสธ (สีผูกกับรุ่นเสมอ)", () => {
    const r = validateLeadInput({ ...leadBase, interestedVariantId: "", interestedColorCode: "010A" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain("เลือกรุ่นก่อน");
    }
  });

  it("เลือกรุ่นแต่ยังไม่เลือกสี = ผ่าน (สีเป็นตัวเลือก)", () => {
    const r = validateLeadInput({ ...leadBase, interestedColorCode: "" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.interestedVariantId).toBe("v1");
      expect(r.value.interestedColorCode).toBeNull();
    }
  });

  it("ป้ายรุ่นในลิสต์ลีดต่อชื่อสีให้ด้วยเมื่อมีสี", () => {
    const variantName = new Map([["v1", "ฟินน์ ล้อแม็ก"]]);
    const colorName = new Map([["v1|010A", "แดง"]]);
    const base = { id: "c1", full_name: "ก", phone: null, source: null, stage: "สนใจ", created_at: "2026-09-01T00:00:00Z" };
    const [withColor] = buildLeads(
      [{ ...base, interested_variant_id: "v1", interested_color_code: "010A" }],
      variantName,
      new Set(),
      colorName,
    );
    expect(withColor.interestedModel).toBe("ฟินน์ ล้อแม็ก · แดง");

    const [noColor] = buildLeads(
      [{ ...base, interested_variant_id: "v1", interested_color_code: null }],
      variantName,
      new Set(),
      colorName,
    );
    expect(noColor.interestedModel).toBe("ฟินน์ ล้อแม็ก");
  });

  it("ไม่ได้ระบุรุ่น = ไม่มีป้ายรุ่น", () => {
    const [row] = buildLeads(
      [{ id: "c2", full_name: "ข", phone: null, interested_variant_id: null, source: null, stage: "สนใจ", created_at: "2026-09-01T00:00:00Z" }],
      new Map(),
      new Set(),
    );
    expect(row.interestedModel).toBeNull();
    expect(row.interestedColorCode).toBeNull();
  });
});

describe("validateLeadInput", () => {
  it("accepts a complete lead and nulls blanks", () => {
    const r = validateLeadInput({ ...leadBase, phone: "", note: "" });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.name).toBe("กานดา ทองคำ");
      expect(r.value.phone).toBeNull();
      expect(r.value.note).toBeNull();
      expect(r.value.interestedVariantId).toBe("v1");
      expect(r.value.source).toBe("Facebook");
    }
  });
  it("requires a name", () => {
    const r = validateLeadInput({ ...leadBase, name: "  " });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toBe("กรอกชื่อลูกค้า");
    }
  });
  it("rejects an unknown source", () => {
    const r = validateLeadInput({ ...leadBase, source: "TikTok" });
    expect(r.ok).toBe(false);
  });
});

describe("buildLeads", () => {
  const variantName = new Map([["v1", "NMAX"]]);
  const customers = [
    { id: "c1", full_name: "ลีดใหม่", phone: "08", interested_variant_id: "v1", source: "LINE", stage: "เข้ามาดูรถ", created_at: "2026-08-22T00:00:00Z" },
    { id: "c2", full_name: "ลูกค้าซื้อแล้ว", phone: null, interested_variant_id: null, source: null, stage: "เข้ามาดูรถ", created_at: "2026-08-01T00:00:00Z" },
    { id: "c3", full_name: "ลีดเก่า", phone: null, interested_variant_id: "vX", source: null, stage: "เข้ามาดูรถ", created_at: "2026-07-01T00:00:00Z" },
  ];

  it("keeps only customers without a deal, newest first, resolves interested model", () => {
    const leads = buildLeads(customers, variantName, new Set(["c2"]));
    expect(leads.map((l) => l.id)).toEqual(["c1", "c3"]); // c2 excluded (has deal), sorted newest first
    expect(leads[0].interestedModel).toBe("NMAX");
    expect(leads[1].interestedModel).toBeNull(); // vX unknown
  });
});
