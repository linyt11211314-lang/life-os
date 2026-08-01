/* 防闪烁内联脚本 — 在 <head> 中引用，确保主题在页面渲染前生效 */
(function(){
  try {
    var key = localStorage.getItem('lifeos_theme') || 'default';
    var themes = {
      default: {'--bg':'#0E0E0F','--bg-grad':'linear-gradient(165deg, #141416 0%, #0E0E10 45%, #111114 100%)','--card':'#F8F5EE','--card-2':'#1C1C20','--accent':'#DFFF00','--accent-deep':'#C4E600','--accent-rgb':'223,255,0','--accent2':'#8B5CF6','--accent2-deep':'#7C3AED','--accent2-rgb':'139,92,246','--text':'#F8F5EE','--text-sub':'#9A9AA2','--text-dim':'#6B6B72','--line':'rgba(255,255,255,0.07)','--is-dark':'1'},
      cinnamoroll: {'--bg':'#E8F4FD','--bg-grad':'linear-gradient(165deg, #F0F8FF 0%, #E8F4FD 45%, #DCEFFF 100%)','--card':'#FFFFFF','--card-2':'#F0F4F8','--accent':'#FF8FAB','--accent-deep':'#E8688A','--accent-rgb':'255,143,171','--accent2':'#87CEEB','--accent2-deep':'#5BB5E0','--accent2-rgb':'135,206,235','--text':'#4A5568','--text-sub':'#8B95A5','--text-dim':'#A8B2C0','--line':'rgba(74,85,104,0.10)','--is-dark':'0'},
      luohei: {'--bg':'#0A100A','--bg-grad':'linear-gradient(165deg, #0D140D 0%, #0A100A 45%, #0B120B 100%)','--card':'#F8F5EE','--card-2':'#161C16','--accent':'#4ADE80','--accent-deep':'#22C55E','--accent-rgb':'74,222,128','--accent2':'#6B6B72','--accent2-deep':'#4A4A52','--accent2-rgb':'107,107,114','--text':'#E8F5E8','--text-sub':'#8A9A8A','--text-dim':'#5A6A5A','--line':'rgba(255,255,255,0.06)','--is-dark':'1'},
      naruto: {'--bg':'#0E0E0F','--bg-grad':'linear-gradient(165deg, #1A1410 0%, #0E0E0F 45%, #12100E 100%)','--card':'#F8F5EE','--card-2':'#1C1814','--accent':'#FF6B1A','--accent-deep':'#E55510','--accent-rgb':'255,107,26','--accent2':'#1A1A1A','--accent2-deep':'#0A0A0A','--accent2-rgb':'26,26,26','--text':'#F8F5EE','--text-sub':'#9A8A7A','--text-dim':'#6B6055','--line':'rgba(255,255,255,0.07)','--is-dark':'1'}
    };
    var t = themes[key] || themes.default;
    var root = document.documentElement;
    var cls = {cinnamoroll:'theme-cinnamoroll',luohei:'theme-luohei',naruto:'theme-naruto'};
    if (cls[key]) root.classList.add(cls[key]);
    for (var p in t) root.style.setProperty(p, t[p]);
    root.setAttribute('data-theme', key);
  } catch(e){}
})();
