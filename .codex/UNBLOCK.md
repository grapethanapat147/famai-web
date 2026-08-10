# Unblock checklist — สิ่งที่ต้องให้เจ้าของ/ลูกค้าทำ ก่อนไปต่อ

สถานะ: พัก dev หน้าจอ · foundation + สต๊อก + Dashboard เสร็จ (9 commit local บน `feat/nextjs-app`)
เมื่อเคลียร์ครบ ลำดับต่อไป: **push → ทดสอบ login ของจริง → ตอบบริษัท/สาขา → ทำรับรถ/ขาย**

---

## 1. 🔴 push ขึ้น repo บนบัญชี GrapeThanapat

**พี่ทำ:** สร้าง repo **เปล่า** (ไม่ติ๊ก README/gitignore/license) ที่ github.com/GrapeThanapat เช่น `famai-web`

**แล้วรัน (ผมรันให้ได้เมื่อพี่ให้ URL):**
```bash
cd ~/Herd/famai-web
git remote add origin https://github.com/GrapeThanapat/<repo>.git
git push -u origin main             # baseline (งานเพื่อน 60 commit)
git push -u origin feat/nextjs-app  # งาน Next.js ของผม (+9)
```
เปิด PR รีวิว (ตามสไตล์พี่): `https://github.com/GrapeThanapat/<repo>/compare/main...feat/nextjs-app`

> `upstream` = repo เพื่อน (push ถูกปิดไว้) — ดึง update ดีไซน์/schema จากเพื่อนภายหลังได้ด้วย `git fetch upstream`

---

## 2. ทดสอบ login ของจริง (Supabase console)

ก่อนอื่น (ความปลอดภัย — handoff §3):
- Settings → Database → **Reset database password** (รหัสเดิมหลุดผ่านแชต)
- Authentication → Policies → เปิด **Leaked Password Protection**

**ตั้งรหัสให้ผู้ใช้ทดสอบ** (มี seed account อยู่แล้ว เช่น `admin@famai.local` เห็นทุกสาขา — docs/06 §3):
- Authentication → Users → เลือก user → ตั้ง/รีเซ็ตรหัสผ่าน
- หรือสร้าง user ใหม่แล้วผูกตามสิทธิ์ (SQL อยู่ใน `docs/06-supabase-setup.md` §7.1)

**ลองล็อกอิน:**
```bash
cd ~/Herd/famai-web && npm run dev   # แล้วเปิด http://localhost:3000/login
```
คาดหวัง: ล็อกอินสำเร็จ → เห็น `/dash` + `/stock` ข้อมูลจริง (50 คัน) · เซลล์เห็นเฉพาะสาขาตัวเอง + ไม่เห็นต้นทุน (money-strip)

---

## 3. ตอบ "บริษัท vs สาขา" (ถามลูกค้า) — ปลดล็อก รับรถ/ขาย

R1 อยากให้ "สาขา" กลายเป็น "บริษัท" แล้วเพิ่มสาขาย่อย + โอนข้ามบริษัทต้องเปิดบิลก่อน
**คำถามที่ต้องได้คำตอบ:**
1. มี **กี่บริษัท** (นิติบุคคล/เลขผู้เสียภาษี)?
2. `FMG01` / `FMM01` / `FCG01` — เป็น **คนละบริษัท** หรือ **บริษัทเดียว 3 สาขา**?
3. แต่ละบริษัทมีสาขาย่อยอะไรบ้าง?

> กระทบ schema (ต้องเพิ่ม entity `company` เหนือ `branch`), RLS, เลขเอกสาร, และหน้ารับรถ/ขาย — จึงต้องรู้ก่อนสร้างหน้าพวกนี้

---

## 4. ไฟล์ที่รอจากลูกค้า (R1)
- **PDF เอกสาร** (ใบเสร็จ/ใบกำกับภาษี) สำหรับ train AI ให้เข้าใจ — "รอไฟล์จากพี่เขา"
- **รูปตัวอย่าง** 3 จุด: (ก) ฟอร์มขาย/หัวข้อลูกค้า (ข) B2B เลขเครื่อง-เลขถัง (ค) สรุปดีลที่ปรับแสดงได้
- (เสริม) ยืนยัน cadence ติดตาม 7/30/60/90/120 · dark mode ทำรอบนี้ไหม · วิธีเก็บเลขบัตร ปชช. (PDPA)
