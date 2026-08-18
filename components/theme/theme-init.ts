/** รันก่อน paint (blocking) — อ่าน localStorage แล้วตั้ง data-theme/data-density กันจอกระพริบ */
export const THEME_INIT_SCRIPT =
  "(function(){try{var e=document.documentElement;" +
  "if(localStorage.getItem('fm-theme')==='dark')e.setAttribute('data-theme','dark');" +
  "if(localStorage.getItem('fm-density')==='compact')e.setAttribute('data-density','compact');" +
  "}catch(_){}})();";
