/* ============================================================
   theme-runtime.js — 全局主题运行时
   在所有页面 </body> 前引入，配合 theme-inline.js（防闪烁）
   功能：
   1. 从 localStorage 读取主题并应用 CSS 变量
   2. 动态注入覆盖样式，强制硬编码颜色跟随主题
   3. 提供全局切换 API
   4. 同步主题卡选中状态
   ============================================================ */

(function () {
  'use strict';

  var THEMES = {
    default: {
      name: '默认主题',
      vars: {
        '--bg':'#0E0E0F',
        '--bg-grad':'linear-gradient(165deg, #141416 0%, #0E0E10 45%, #111114 100%)',
        '--card':'#F8F5EE','--card-2':'#1C1C20',
        '--accent':'#DFFF00','--accent-deep':'#C4E600','--accent-rgb':'223,255,0',
        '--accent2':'#8B5CF6','--accent2-deep':'#7C3AED','--accent2-rgb':'139,92,246',
        '--text':'#F8F5EE','--text-sub':'#9A9AA2','--text-dim':'#6B6B72',
        '--line':'rgba(255,255,255,0.07)','--is-dark':'1'
      },
      bodyBg: '#050506'
    },
    cinnamoroll: {
      name: '玉桂狗主题',
      vars: {
        '--bg':'#E8F4FD',
        '--bg-grad':'linear-gradient(165deg, #F0F8FF 0%, #E8F4FD 45%, #DCEFFF 100%)',
        '--card':'#FFFFFF','--card-2':'#F0F4F8',
        '--accent':'#FF8FAB','--accent-deep':'#E8688A','--accent-rgb':'255,143,171',
        '--accent2':'#87CEEB','--accent2-deep':'#5BB5E0','--accent2-rgb':'135,206,235',
        '--text':'#4A5568','--text-sub':'#8B95A5','--text-dim':'#A8B2C0',
        '--line':'rgba(74,85,104,0.10)','--is-dark':'0'
      },
      bodyBg: '#E8F4FD'
    },
    luohei: {
      name: '罗小黑主题',
      vars: {
        '--bg':'#0A100A',
        '--bg-grad':'linear-gradient(165deg, #0D140D 0%, #0A100A 45%, #0B120B 100%)',
        '--card':'#F8F5EE','--card-2':'#161C16',
        '--accent':'#4ADE80','--accent-deep':'#22C55E','--accent-rgb':'74,222,128',
        '--accent2':'#6B6B72','--accent2-deep':'#4A4A52','--accent2-rgb':'107,107,114',
        '--text':'#E8F5E8','--text-sub':'#8A9A8A','--text-dim':'#5A6A5A',
        '--line':'rgba(255,255,255,0.06)','--is-dark':'1'
      },
      bodyBg: '#050506'
    },
    naruto: {
      name: '火影主题',
      vars: {
        '--bg':'#0E0E0F',
        '--bg-grad':'linear-gradient(165deg, #1A1410 0%, #0E0E0F 45%, #12100E 100%)',
        '--card':'#F8F5EE','--card-2':'#1C1814',
        '--accent':'#FF6B1A','--accent-deep':'#E55510','--accent-rgb':'255,107,26',
        '--accent2':'#1A1A1A','--accent2-deep':'#0A0A0A','--accent2-rgb':'26,26,26',
        '--text':'#F8F5EE','--text-sub':'#9A8A7A','--text-dim':'#6B6055',
        '--line':'rgba(255,255,255,0.07)','--is-dark':'1'
      },
      bodyBg: '#050506'
    }
  };

  var STORAGE_KEY = 'lifeos_theme';
  var STYLE_ID = 'lifeos-theme-override';

  function getStored() {
    try { return localStorage.getItem(STORAGE_KEY) || 'default'; } catch(e) { return 'default'; }
  }
  function store(key) {
    try { localStorage.setItem(STORAGE_KEY, key); } catch(e) {}
  }

  // 生成覆盖样式：强制硬编码颜色跟随主题
  function buildOverrideCSS(theme) {
    var v = theme.vars;
    var isDark = v['--is-dark'] === '1';
    var accent = v['--accent'];
    var accent2 = v['--accent2'];
    var card = v['--card'];
    var card2 = v['--card-2'];
    var bg = v['--bg'];
    var text = v['--text'];
    var textSub = v['--text-sub'];
    var textDim = v['--text-dim'];

    // 颜色映射表：硬编码色 → 主题色
    var css = '';

    // 背景渐变覆盖
    css += '.screen { background: ' + v['--bg-grad'] + ' !important; }\n';
    css += 'body { background: ' + theme.bodyBg + ' !important; }\n';

    // 荧光黄 → accent
    css += '[style*="#DFFF00"], [style*="#dfff00"] { --override-accent: ' + accent + '; }\n';

    // 直接替换常见硬编码（用属性选择器无法实现，改用全局规则）
    // 黄色系
    css += '.yellow, .entry-card.yellow, .gcard.yellow, .cat-card.yellow, .quick-card.yellow, .hcard.yellow, .mcard.yellow, .star-card.yellow, .theme-card.yellow, .status-card, .fund-card, .spend-card, .plan-card:not(.purple):not(.dark), .plan-card.flex-card:not(.purple) { '
      + 'background: linear-gradient(140deg, ' + accent + ' 0%, ' + v['--accent-deep'] + ' 100%) !important; '
      + 'color: ' + (isDark ? '#0E0E10' : bg) + ' !important; }\n';

    // 紫色系
    css += '.purple, .entry-card.purple, .gcard.purple, .cat-card.purple, .quick-card.purple, .hcard.purple, .mcard.purple, .star-card.purple, .plan-card.purple, .duo-card.purple, .goal-card.purple, .think-card { '
      + 'background: linear-gradient(140deg, ' + accent2 + ' 0%, ' + v['--accent2-deep'] + ' 100%) !important; '
      + 'color: #fff !important; }\n';

    // 米白卡片
    css += '.light, .entry-card.light, .gcard.light, .cat-card.light, .quick-card.light, .hcard.light, .mcard.light, .star-card.light, .plan-card:not(.purple):not(.dark), .duo-card.light, .goal-card.light, .period-card.light { '
      + 'background: ' + card + ' !important; '
      + 'color: ' + (isDark ? '#0E0E10' : bg) + ' !important; '
      + 'border: none !important; }\n';

    // 暗卡
    css += '.dark, .entry-card.dark, .gcard:not(.yellow):not(.light):not(.purple), .cat-card.dark, .quick-card.dark, .hcard.dark, .mcard:not(.light):not(.yellow):not(.purple), .star-card.dark, .task-card.dark, .want-card.dark, .note-card, .alloc-card, .decide-card, .flow-card, .trend-card, .cal-card, .remind-card, .setting-group, .profile-card, .insp-card, .cycle-card { '
      + 'background: ' + card2 + ' !important; '
      + 'border: 1px solid ' + v['--line'] + ' !important; '
      + 'color: ' + text + ' !important; }\n';

    // 文字颜色
    css += '.page-title, .section-title, .entry-name, .gtitle, .task-name, .want-name, .star-title, .plan-name, .goal-name, .alloc-name, .profile-name, .hcard-name, .duo-name, .cat-name, .cat-pill-name, .quick-name, .mcard-title, .diary-text, .tl-text, .pet-name, .fund-amount, .spend-amount, .think-title, .flow-label, .verdict-text, .eval-pname, .eval-pprice, .score-name, .body-value, .phase-name, .cycle-day-num, .is-val, .growth-title { '
      + 'color: ' + text + ' !important; }\n';

    // 副标题/浅灰文字
    css += '.page-sub, .section-more, .entry-desc, .gdesc, .task-meta, .want-meta, .plan-meta, .goal-eta, .alloc-pct, .profile-id, .profile-bio, .hcard-desc, .duo-text, .cat-count, .cat-pill-count, .quick-desc, .mcard-text, .tl-sub, .pet-breed, .fund-change, .spend-change, .think-text, .body-sub, .cycle-day-sub, .cycle-next-date, .is-label, .is-sub, .growth-sub, .setting-val, .setting-name, .flow-count .l, .remind-desc, .verdict-sub, .eval-pcat, .score-val, .exp-next { '
      + 'color: ' + textSub + ' !important; }\n';

    // 强调色文字（黄→accent）
    css += '.page-title .accent, .section-title .bar, .lv-pill, .tag.y, .tag.status-progress, .plan-pct, .task-pct, .alloc-amount, .goal-current, .want-price, .star-badge, .phase-name, .cycle-next-val .days, .energy-ring, .fund-amount, .spend-amount, .is-val.y, .stat-pill .v.y, .gs .v.y, .exp-val .num, .exp-fill, .verdict-text, .eval-pprice, .score-val, .tab.active, .flow-step.active .flow-dot, .flow-step.active .flow-label, .alloc-fill.y, .pfill.y, .goal-fill, .ptrack .pfill, .setting-toggle:not(.off), .tab-plus, .ap-pill.active, .theme-card.active, .ps .v, .growth-lv, .tp-accent, .duo-btn, .plan-btn, .task-check.checked, .remind-toggle:not(.off) { '
      + 'background-color: ' + accent + ' !important; }\n';
    css += '.page-title .accent, .greeting, .lv-pill, .tag.y, .plan-pct, .task-pct, .alloc-amount, .goal-current, .want-price, .star-badge, .phase-name, .cycle-next-val .days, .is-val.y, .stat-pill .v.y, .gs .v.y, .exp-val .num, .verdict-text, .eval-pprice, .score-val, .tab.active, .flow-step.active .flow-label, .setting-ico.accent, .cat-emoji, .alloc-emoji.y, .hcard.yellow .hcard-val, .ap-pill.active { '
      + 'color: ' + accent + ' !important; }\n';

    // 紫色辅助
    css += '.is-val.p, .stat-pill .v.p, .gs .v.p, .flow-step.done .flow-dot, .flow-step.done .flow-label, .setting-ico.accent2, .alloc-fill.p, .pfill.p, .tag.p, .alloc-emoji.p, .hcard.purple .hcard-val, .remind-toggle:not(.off):not(.p) { '
      + 'background-color: ' + accent2 + ' !important; }\n';
    css += '.is-val.p, .stat-pill .v.p, .gs .v.p, .flow-step.done .flow-label, .setting-ico.accent2, .flow-step.done .flow-label { '
      + 'color: ' + accent2 + ' !important; }\n';

    // 光晕
    css += '.glow-y { background: rgba(' + v['--accent-rgb'] + ',0.18) !important; }\n';
    css += '.glow-p { background: rgba(' + v['--accent2-rgb'] + ',0.22) !important; }\n';
    css += '.glow-y2 { background: rgba(' + v['--accent-rgb'] + ',0.08) !important; }\n';

    // Tab Bar
    css += '.tabbar { background: rgba(' + (isDark ? '14,14,16' : v['--accent-rgb']) + ',0.82) !important; border-top: 1px solid ' + v['--line'] + ' !important; }\n';
    if (!isDark) {
      css += '.tabbar { background: rgba(255,255,255,0.82) !important; }\n';
      css += '.tab { color: ' + textDim + ' !important; }\n';
      css += '.home-indicator { background: ' + text + ' !important; opacity: 0.3 !important; }\n';
      css += '.island { background: ' + text + ' !important; }\n';
      css += '.statusbar { color: ' + text + ' !important; }\n';
      css += '.statusbar svg [fill]:not([fill="none"]) { fill: ' + text + ' !important; }\n';
      css += '.statusbar svg rect, .statusbar svg path { fill: ' + text + ' !important; stroke: ' + text + ' !important; }\n';
    }

    // 卡片内文字
    css += '.yellow .entry-name, .yellow .gtitle, .yellow .hcard-name, .yellow .task-name, .yellow .want-name, .yellow .quick-name, .yellow .cat-name, .yellow .cat-pill-name, .yellow .star-title, .yellow .mcard-title, .yellow .plan-name, .yellow .duo-name, .yellow .body-value, .yellow .is-val, .yellow .alloc-name, .yellow .goal-name, .yellow .flow-label, .yellow .tl-text, .yellow .verdict-text, .yellow .fund-amount, .yellow .spend-amount, .yellow .phase-name, .yellow .growth-lv, .yellow .energy-ring, .yellow .exp-val, .yellow .gs .v { color: ' + (isDark ? '#0E0E10' : bg) + ' !important; }\n';

    // 头像
    css += '.avatar { background: linear-gradient(135deg, ' + accent + ', ' + accent2 + ') !important; box-shadow: 0 10px 24px -6px rgba(' + v['--accent-rgb'] + ',0.4) !important; }\n';

    // exp-fill / progress gradients
    css += '.exp-fill { background: linear-gradient(90deg, ' + accent2 + ' 0%, ' + accent + ' 100%) !important; }\n';

    // phase-ring conic
    css += '.phase-ring { background: conic-gradient(' + v['--accent'] + ' 0% 35%, rgba(255,255,255,0.06) 35% 100%) !important; }\n';
    css += '.phase-ring::before { background: ' + card2 + ' !important; }\n';

    return css;
  }

  function applyTheme(key) {
    var theme = THEMES[key] || THEMES.default;
    var root = document.documentElement;

    // 设置 CSS 变量
    Object.keys(theme.vars).forEach(function (prop) {
      root.style.setProperty(prop, theme.vars[prop]);
    });

    // 设置 data-theme 属性
    root.setAttribute('data-theme', key);

    // body 背景
    document.body.style.background = theme.bodyBg;

    // 注入/更新覆盖样式
    var existing = document.getElementById(STYLE_ID);
    if (existing) existing.remove();
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = buildOverrideCSS(theme);
    document.head.appendChild(style);

    // 同步主题卡
    document.querySelectorAll('[data-theme-card]').forEach(function (card) {
      card.classList.toggle('active', card.dataset.themeCard === key);
    });
    document.querySelectorAll('[data-current-theme-name]').forEach(function (el) {
      el.textContent = theme.name;
    });

    // 触发事件
    window.dispatchEvent(new CustomEvent('themechange', { detail: { key: key, name: theme.name } }));
  }

  // 公开 API
  window.LifeOSTheme = {
    switch: function (key, name) {
      store(key);
      applyTheme(key);
    },
    current: function () { return getStored(); },
    themes: THEMES,
    apply: applyTheme
  };

  // 应用存储的主题（覆盖 theme-inline.js 的初步设置）
  applyTheme(getStored());
})();
