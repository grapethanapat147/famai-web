-- ข้อมูลอ้างอิงจริง (ไม่รวมข้อมูลสมมุติใด ๆ)

insert into branch (code,name,doc_prefix,branch_no,address) values
 ('FMG01','Famai Motor Group','FMG','00000','สำนักงานใหญ่'),
 ('FMM01','Famai Motor','FMM','00001','สาขา 1'),
 ('FCG01','Famai Center Group','FCG','00002','สาขา 2');
-- tax_id เว้นว่างตั้งใจ: เลขในไฟล์ยามาฮ่าเป็นของผู้ขาย (ไทยยามาฮ่า) ไม่ใช่ของร้าน

insert into role (code,name,perms) values
 ('admin','ผู้ดูแลระบบ','{"money":true,"allBranch":true,"approve":true,"admin":true}'),
 ('manager','ผู้บริหาร','{"money":true,"allBranch":true,"approve":true,"admin":false}'),
 ('sales','เซลล์','{"money":false,"allBranch":false,"approve":false,"admin":false}'),
 ('stock','สต๊อก','{"money":false,"allBranch":false,"approve":false,"admin":false}'),
 ('acct','บัญชี','{"money":true,"allBranch":true,"approve":false,"admin":false}'),
 ('hr','ฝ่ายบุคคล','{"money":true,"allBranch":true,"approve":true,"admin":false}'),
 ('tech','ช่าง','{"money":false,"allBranch":false,"approve":false,"admin":false}');

insert into expense_category (name) values
 ('ออกบูธ'),('เงินเดือน'),('ค่าน้ำไฟ'),('ค่าอาหารเลี้ยงแขก'),('ค่าขนส่ง'),('ค่าเช่า'),('อื่นๆ');

-- ชื่อบริษัทจริง แต่เรตยังไม่ทราบ — เว้นว่าง ไม่ใส่ค่าสมมุติลงฐานข้อมูลจริง
insert into finance_company (name) values ('กรุงศรี ออโต้'),('ธนชาต'),('ทิสโก้');

insert into app_setting (key,value) values
 ('aging_days','90'),('aging_buckets','[30,60,90]'),('low_stock','2'),('reg_days','30'),
 ('follow_up_cadence','[7,30,90,365,1095]'),('service_km','[500,1000,4000,8000]'),
 ('vat_pct','7'),('finance_terms','[12,18,24,30,36,42,48]'),('freebie_is_cost','true'),
 ('work_start','"08:30"'),('work_end','"17:30"'),('ot_rate','1.5'),
 ('ssn_pct','5'),('ssn_cap','750'),('commission_pct','8');
-- company_name / address / phone / tax_id ยังไม่ลง: ค่าในต้นแบบเป็นตัวอย่าง

insert into model_variant (code,model_name,model_th,category,cc,model_year) values
 ('B6FS00','FINN','ฟินน์ ล้อซี่ลวดดรัมเบรก','Moped',114.0,2567),
 ('B6FT00','FINN','ฟินน์ ล้อซี่ลวด','Moped',114.0,2567),
 ('B6FU00','FINN','ฟินน์ ล้อแม็ก','Moped',114.0,2567),
 ('B6FV00','FINN','ฟินน์ ยูบีเอส','Moped',114.0,2567),
 ('BJKC00','Grand Filano Hybrid','แกรนด์ ฟีลาโน่ ไฮบริด','Automatic',124.96,2569),
 ('BJKD00','Grand Filano Hybrid','แกรนด์ ฟีลาโน่ ไฮบริด (ABS)','Automatic',124.96,2569),
 ('BJKE00','Grand Filano Hybrid',null,null,null,null),
 ('BTF200','NMAX','เอ็นแม็กซ์ สแตนดาร์ด','Automatic',155.09,2569),
 ('BTF300','NMAX','เอ็นแม็กซ์ สแตนดาร์ด','Automatic',155.09,2569),
 ('D13100','Aerox',null,null,null,null),
 ('D18100','PG-1','พีจี 1','Moped',114.0,2568),
 ('DA6200','FINN',null,null,null,null),
 ('DR9200','XMAX 300','เอ็กซ์แม็กซ์ คอนเน็คเต็ด','Automatic',292.26,2569),
 ('DR9400','XMAX 300','เอ็กซ์แม็กซ์ คอนเน็คเต็ด','Automatic',292.26,2569);

-- BTF300/010A สะกดต่างกันสองที่ (ไฟล์นำเข้า 'ดำ-เทา' · ตารางราคา 'ดำ/เทา') — ยึดตามไฟล์นำเข้า
insert into model_color (variant_id,color_code,color_name)
select v.id, x.cc, x.nm from (values
 ('B6FS00','010A','ดำ'),
 ('B6FT00','010A','ดำ'),
 ('B6FT00','010B','แดง'),
 ('B6FU00','010A','น้ำเงิน'),
 ('B6FU00','010B','เขียว'),
 ('B6FU00','010C','ฟ้า'),
 ('B6FV00','010A','ดำ'),
 ('B6FV00','010B','เขียว'),
 ('B6FV00','010C','เทา'),
 ('BJKC00','010A','เขียว'),
 ('BJKC00','010B','ดำ'),
 ('BJKC00','010C','น้ำเงิน'),
 ('BJKC00','010D','เทา'),
 ('BJKD00','010A','ฟ้า'),
 ('BJKD00','010B','ฟ้า/ดำ'),
 ('BJKD00','010C','ม่วง'),
 ('BJKD00','010F','น้ำเงิน'),
 ('BJKE00','010A','น้ำตาล'),
 ('BTF200','010C','ขาว'),
 ('BTF200','010D','ดำ'),
 ('BTF200','010E','แดง'),
 ('BTF200','010F','น้ำเงิน'),
 ('BTF300','010A','ดำ-เทา'),
 ('D13100','010A','น้ำเงิน'),
 ('D18100','010A','ฟ้า'),
 ('D18100','010B','แดง'),
 ('D18100','010C','เทา'),
 ('D18100','010D','น้ำตาล'),
 ('DA6200','010A','ดำ'),
 ('DA6200','010B','แดง'),
 ('DR9200','010A','ดำ/เทา'),
 ('DR9200','010B','เทา'),
 ('DR9200','010C','น้ำเงิน'),
 ('DR9200','010D','แดง'),
 ('DR9400','010A','ดำ')
) as x(code,cc,nm) join model_variant v on v.code = x.code;;
