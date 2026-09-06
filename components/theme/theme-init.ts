/**
 * รันก่อน paint (blocking) — อ่าน localStorage แล้วตั้งค่าหน้าตากันจอกระพริบ
 * ธีมมืด · ขนาดตัวอักษร (4 ระดับ) · สีเน้นเฉพาะเครื่อง (FAM-1153)
 *
 * สีถูกคำนวณไว้ตั้งแต่ตอนผู้ใช้กดเลือกแล้วเก็บทั้งก้อน — ที่นี่แค่เอามาแปะ
 * จะได้ไม่ต้องเขียนสูตรแปลงสีซ้ำในสตริงนี้
 */
export const THEME_INIT_SCRIPT =
  "(function(){try{var e=document.documentElement,d=localStorage;" +
  "if(d.getItem('fm-theme')==='dark')e.setAttribute('data-theme','dark');" +
  "var s=d.getItem('fm-text-size');" +
  "if(!s&&d.getItem('fm-density')==='compact')s='sm';" +
  "if(s&&s!=='md')e.setAttribute('data-text-size',s);" +
  "var a=d.getItem('fm-accent');if(a){var p=JSON.parse(a);" +
  "if(p&&p.light&&p.dark){var v=function(x){return '--accent:'+x.accent+';--accent-hover:'+x.hover+';--accent-deep:'+x.deep+';--accent-wash:'+x.wash+';'};" +
  "var t=document.createElement('style');t.id='fm-accent-user';" +
  "t.textContent='html:root{'+v(p.light)+'}html:root[data-theme=\"dark\"]{'+v(p.dark)+'}';" +
  "document.head.appendChild(t);}}" +
  "}catch(_){}})();";
