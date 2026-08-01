# ผังกระบวนการทำงาน — ถอดข้อความจากไวท์บอร์ด

ถอดจาก `whiteboard-workflow.png` (ต้นฉบับ: `reference/source/Famai_Workflow_Diagram.pptx`)
**นี่คือแหล่งความต้องการหลักของโครงการ** — ข้อความคงตามต้นฉบับ จัดกลุ่มใหม่ให้อ่านง่าย

---

## เส้นทางหลัก

```
Yamaha → รับรถ → Stock → ขาย → ┬→ ลูกค้าเงินสด  ─┐
                                └→ ลูกค้าเงินผ่อน ─┴→ ติดตามหลังการขาย → ติดตามลูกค้าเก่า
```

---

## 1. รับรถ

- Key รับรถ `< automate + manual >`
- เก็บบิล + ใบทะเบียน (upload file)
- **เด้งแถบบนเตือน เซลล์ วีคโปร** (ถ้าขายรุ่นนี้ได้ลดราคาพิเศษ) เช่น Grand ลด 5,000.-
- หักเงินสด

## 2. Stock

Filter | เช็ค stock
- สาขา
- รุ่น
- สี
- ปีรถ
- **รูปรถ**
- จำนวนคงเหลือ

## 3. ขาย

- show รายการขาย, sale, GP
- ดึงข้อมูลลูกค้าจาก log

---

## 4A. ลูกค้าเงินสด

เอกสารที่ต้องออก:
- **ใบเสร็จรับเงิน** (ลูกค้า) → Print → ☑ Approve
- **ใบกำกับภาษี** (บางราย)
- ✓ ได้รับเงิน

## 4B. ลูกค้าเงินผ่อน

เอกสารที่ต้องออก:
- **ใบเสร็จรับเงิน** (ลูกค้า)
- **ใบกำกับภาษีเงินดาวน์** (ลูกค้า)
- **ใบกำกับภาษี (finance)**

การติดตามเงิน:
- `tracking finance` — อยากให้ AI ดึง (auto จาก email ที่ finance ส่งยอดจ่ายเงิน)
- **ได้รับเงินจาก finance รึยัง?**
- ได้รับเงินจาก finance → **ลงรับ cash** → บันทึกบช.เงินสด

---

## 5. log ลูกค้า

เก็บ: ชื่อ · เบอร์ · รุ่นรถที่สนใจ · สถานะการติดตาม

**Status pipeline:**
```
เข้ามาดูรถ ──── สนใจ ──── สัญญา ──── ผ่าน / ไม่ผ่าน ──── รับรถสำเร็จ
```
พร้อมแหล่งที่มา เช่น `/ เจอผ่าน Facebook`

## 6. คำนวณยอดผ่อน

- ราคายอดกู้แต่ละไฟแนนซ์
- **เทียบ 2 finance**
- → ออก **ใบเสนอราคา** → print

โครงใบเสนอราคา:

| | |
|---|---|
| ชื่อ | รุ่นรถ **คันที่ 1** |
| ที่อยู่ | ราคา |

| | |
|---|---|
| ชื่อ | รุ่นรถ **คันที่ 2** |
| ที่อยู่ | ราคา |

| finance 1 | finance 2 |
|---|---|
| ☐ ชื่อ \| ราคา | ☐ ชื่อ \| ราคา |
| 12 \| … | 12 \| … |
| 24 \| … | 24 \| … |
| 36 \| … | 36 \| … |

---

## 7. ติดตามหลังการขาย

**ทะเบียน**
- ├ ได้รับ
- └ ยังไม่ได้รับ — *กี่วันแล้ว ให้เตือนถ้านานเกิน 1 เดือน*

**เงินค้างรับ**

## 8. ติดตามลูกค้าเก่า *(อีกหน้า — "หน้าติดตามลูกค้า")*

| ระยะ | ทำอะไร |
|---|---|
| 7 วัน | ถามเรื่องออกรถใหม่เป็นไงบ้าง |
| 30 วัน | เช็คระยะ · รับทะเบียน |
| 90 วัน | |
| 1 ปี | |
| 3 ปี | |

ตารางแสดง: `ลูกค้า | เข้าล่าสุด | ติดตาม | เชลล์ | วันที่ | ✓`

---

## 9. Tabs เพิ่มเติมที่อยากให้มี — กลุ่ม 1

### ค่าใช้จ่าย
- upload ไฟล์ใบเสร็จได้
- ทำรายจ่ายเป็นหมวดหมู่ เช่น
  - ออกบูธ
  - Payroll
  - ค่าน้ำไฟ
  - ค่าอาหารเลี้ยงแขก

### ของแถม
- stock จำนวนของแถม
- `รายการ | จำนวน | ราคา | รวม`
- *รายการของแถมก็ลงด้วย*

### อะไหล่
- ยอดขาย
- ต้นทุน
- กำไร *(ต่อวัน)*

### Service
- **ลงเวลาเข้า Service จริง**
- เก็บ: ชื่อ / เบอร์โทรศัพท์ / เลขเครื่อง / เลขถัง / รับบริการอะไร / สถานะลูกค้า *(เช่น ลูกค้าเก่าหรือใหม่)*
- status
- **ถ้าลูกค้าเก่า จะดึงหน้าติดตามลูกค้าเก่ามา show**
- *(ลูกค้าเก่าดูจากเลขเครื่อง/เลขถัง)*

### HR
- Clock in - Clock out
- เงินเดือน → **สลิปเงินเดือน**
- OT
- ลางาน
- **รายงานส่งประกันสังคม**
- **รายงานโอนเงินเดือนให้ธนาคาร**

## 10. Tabs เพิ่มเติมที่อยากให้มี — กลุ่ม 2
- Service
- **AGING STOCK**
- serch *(ค้นหา)*
- …..

---

## 11. Dashboard — รายการที่ขอไว้บนไวท์บอร์ด

โครงเมนู: `รายงานการขาย` · `Service` · `AGING STOCK` · `…..`

### 1. Daily Sales Dashboard
| KPI | Today | MTD |
|---|---|---|
| Units Sold | 8 | 125 |
| Revenue | ฿550,000 | ฿8,200,000 |
| Gross Profit | ฿62,000 | ฿980,000 |
| Finance Deals | 6 | 92 |
| Cash Deals | 2 | 33 |

> *This is what management looks at every morning.*

### 2. Branch Comparison
| Branch | Sales | Revenue | GP |
|---|---|---|---|
| Famai Motor Group | 42 | ฿3.2M | |
| Famai Motor | 35 | ฿2.7M | ฿310K |
| Famai Center Group | 48 | ฿3.6M | |

Green = best branch · Red = lowest branch

### 3. Salesperson Ranking
| Salesperson | Units |
|---|---|
| เซลล์สนุ๊กเกอร์ | 18 |
| เซลล์บิว | 15 |
| เซลล์หมูแดง | 12 |

แล้วต่อด้วย: Revenue · Profit · Finance approval rate → *This becomes a leaderboard.*

### 4. Registration Tracking
> *For motorcycle dealers this is huge.*

```
ขายแล้ว → ส่งไฟแนนซ์ → อนุมัติ → รอทะเบียน → ป้ายขาว → ส่งมอบแล้ว
```

Dashboard:
- Waiting Finance = 15
- Waiting Registration = 23
- Ready For Delivery = 7

> *This is usually the #1 thing managers ask.*

### 5. Aging Stock Report
> *Very important.*

ช่วง: `0-30 days` · `31-60 days` · `61-90 days` · `90+ days`

| Model | Qty | Days |
|---|---|---|
| PG-1 | 4 | 105 |
| FINN | 7 | 89 |
| NMAX | 1 | 12 |

> *Now you know which models need promotion.*

### 6. Customer Database
ค้นหาด้วย: Phone number · Name · **Engine number** · **Frame number**

แล้วแสดง Customer History:
- Bought: NMAX 2025
- Purchase Date: 12 Jan 2026
- Salesperson: เซลล์สนุ๊กเกอร์
- Service Visits: 3

**Service Reminder** หลังขาย: `500 km` · `1,000 km` · `4,000 km` · `8,000 km`
→ Generate **LINE broadcast list**

> *Huge for retention.*

### 7. Finance Dashboard
Track: กรุงศรี · ธนชาต · ทิสโก้ · อื่นๆ
Show: Applications · Approved · Rejected · Pending · **Approval Rate**

### 8. Today's Snapshot
| | |
|---|---|
| Sales Today | ฿550,000 |
| Gross Profit | ฿62,000 |
| Expenses | ฿7,500 |
| **Net Profit** | **฿54,500** |

### 9. Sales by Branch
Bar chart — Famai Motor Group · Famai Motor · Famai Center Group

### 10. Top Models
1. FINN
2. PG-1
3. NMAX
4. Grand Filano
5. Fazzio

**Stock Alert**
- ⚠ PG-1 : 2 left
- ⚠ NMAX : 1 left
- ⚠ XMAX : 0 left

**Pending Registrations** — 12 waiting
**Finance Pending** — 8 waiting
