/**
 * รันก่อน paint (blocking) — อ่าน localStorage แล้วตั้งค่าหน้าตากันจอกระพริบ
 * ธีมมืด · ขนาดตัวอักษร (4 ระดับ) · สีของเครื่องนี้ (FAM-1153, ย้อมทั้งเว็บใน FAM-1155)
 *
 * สีถูกคำนวณไว้ตั้งแต่ตอนผู้ใช้กดเลือกแล้วเก็บทั้งก้อน — ที่นี่แค่เอามาแปะ
 * จะได้ไม่ต้องเขียนสูตรแปลงสีซ้ำในสตริงนี้ (ค่าที่เก็บจากเวอร์ชันเก่าที่ยังไม่มี surface ก็ยังใช้ได้)
 */
export const THEME_INIT_SCRIPT =
  "(function(){try{var e=document.documentElement,d=localStorage;" +
  "if(d.getItem('fm-theme')==='dark')e.setAttribute('data-theme','dark');" +
  "var s=d.getItem('fm-text-size');" +
  "if(!s&&d.getItem('fm-density')==='compact')s='sm';" +
  "if(s&&s!=='md')e.setAttribute('data-text-size',s);" +
  "var a=d.getItem('fm-accent');if(a){var p=JSON.parse(a);" +
  "var side=function(x){if(!x)return '';var o=x.accent||x,f=x.surface,v='';" +
  "if(o&&o.accent)v+='--accent:'+o.accent+';--accent-hover:'+o.hover+';--accent-deep:'+o.deep+';--accent-wash:'+o.wash+';';" +
  "if(f)v+='--paper:'+f.paper+';--paper-2:'+f.paper2+';--card:'+f.card+';--ink:'+f.ink+';--ink-soft:'+f.inkSoft+';--muted:'+f.muted+';--hairline:'+f.hairline+';--hairline-2:'+f.hairline2+';';" +
  "return v};" +
  "var lt=side(p&&p.light),dk=side(p&&p.dark);" +
  "if(lt||dk){var t=document.createElement('style');t.id='fm-accent-user';" +
  "t.textContent='html:root:root{'+lt+'}html:root:root[data-theme=\"dark\"]{'+dk+'}';" +
  "document.head.appendChild(t);}}" +
  "}catch(_){}})();";
