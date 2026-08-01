/* ============================================================
   全局主题系统 — 跨页面持久化
   在所有页面 <head> 或 <body> 末尾引入即可生效
   用法：<script src="theme.js"></script>
   ============================================================ */

(function () {
  'use strict';

  // 主题定义
  const THEMES = {
    default: {
      name: '默认主题',
      cls: '',
      vars: {
        '--bg': '#0E0E0F',
        '--bg-grad': 'linear-gradient(165deg, #141416 0%, #0E0E10 45%, #111114 100%)',
        '--card': '#F8F5EE',
        '--card-2': '#1C1C20',
        '--accent': '#DFFF00',
        '--accent-deep': '#C4E600',
        '--accent-rgb': '223,255,0',
        '--accent2': '#8B5CF6',
        '--accent2-deep': '#7C3AED',
        '--accent2-rgb': '139,92,246',
        '--text': '#F8F5EE',
        '--text-sub': '#9A9AA2',
        '--text-dim': '#6B6B72',
        '--line': 'rgba(255,255,255,0.07)',
        '--is-dark': '1'
      }
    },
    cinnamoroll: {
      name: '玉桂狗主题',
      cls: 'theme-cinnamoroll',
      vars: {
        '--bg': '#E8F4FD',
        '--bg-grad': 'linear-gradient(165deg, #F0F8FF 0%, #E8F4FD 45%, #DCEFFF 100%)',
        '--card': '#FFFFFF',
        '--card-2': '#F0F4F8',
        '--accent': '#FF8FAB',
        '--accent-deep': '#E8688A',
        '--accent-rgb': '255,143,171',
        '--accent2': '#87CEEB',
        '--accent2-deep': '#5BB5E0',
        '--accent2-rgb': '135,206,235',
        '--text': '#4A5568',
        '--text-sub': '#8B95A5',
        '--text-dim': '#A8B2C0',
        '--line': 'rgba(74,85,104,0.10)',
        '--is-dark': '0'
      }
    },
    luohei: {
      name: '罗小黑主题',
      cls: 'theme-luohei',
      vars: {
        '--bg': '#0A100A',
        '--bg-grad': 'linear-gradient(165deg, #0D140D 0%, #0A100A 45%, #0B120B 100%)',
        '--card': '#F8F5EE',
        '--card-2': '#161C16',
        '--accent': '#4ADE80',
        '--accent-deep': '#22C55E',
        '--accent-rgb': '74,222,128',
        '--accent2': '#6B6B72',
        '--accent2-deep': '#4A4A52',
        '--accent2-rgb': '107,107,114',
        '--text': '#E8F5E8',
        '--text-sub': '#8A9A8A',
        '--text-dim': '#5A6A5A',
        '--line': 'rgba(255,255,255,0.06)',
        '--is-dark': '1'
      }
    },
    naruto: {
      name: '火影主题',
      cls: 'theme-naruto',
      vars: {
        '--bg': '#0E0E0F',
        '--bg-grad': 'linear-gradient(165deg, #1A1410 0%, #0E0E0F 45%, #12100E 100%)',
        '--card': '#F8F5EE',
        '--card-2': '#1C1814',
        '--accent': '#FF6B1A',
        '--accent-deep': '#E55510',
        '--accent-rgb': '255,107,26',
        '--accent2': '#1A1A1A',
        '--accent2-deep': '#0A0A0A',
        '--accent2-rgb': '26,26,26',
        '--text': '#F8F5EE',
        '--text-sub': '#9A8A7A',
        '--text-dim': '#6B6055',
        '--line': 'rgba(255,255,255,0.07)',
        '--is-dark': '1'
      }
    }
  };

  const STORAGE_KEY = 'lifeos_theme';

  // 获取存储的主题
  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'default';
    } catch (e) {
      return 'default';
    }
  }

  // 存储主题
  function storeTheme(key) {
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch (e) {}
  }

  // 应用主题到页面
  function applyTheme(themeKey) {
    const theme = THEMES[themeKey] || THEMES.default;
    const root = document.documentElement;

    // 清除其他主题 class
    Object.values(THEMES).forEach(t => {
      if (t.cls) root.classList.remove(t.cls);
    });
    // 添加当前主题 class（用于 CSS 选择器匹配）
    if (theme.cls) root.classList.add(theme.cls);

    // 设置 CSS 变量到 :root
    Object.entries(theme.vars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });

    // 同步 body 背景
    document.body.style.background = themeKey === 'cinnamoroll' ? '#E8F4FD' : '#050506';

    // 标记当前选中（用于主题卡 UI）
    root.setAttribute('data-theme', themeKey);

    // 触发自定义事件，让页面 JS 能监听
    window.dispatchEvent(new CustomEvent('themechange', { detail: { key: themeKey, name: theme.name } }));
  }

  // 切换主题（公开 API）
  window.LifeOSTheme = {
    switch: function (themeKey, name) {
      storeTheme(themeKey);
      applyTheme(themeKey);
    },
    current: function () {
      return getStoredTheme();
    },
    themes: THEMES,
    apply: applyTheme
  };

  // 初始化：尽早应用主题，避免闪烁
  // 用内联方式在 <head> 中尽早执行
  applyTheme(getStoredTheme());

  // DOMContentLoaded 后同步主题卡选中状态
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      syncThemeCards();
    });
  } else {
    syncThemeCards();
  }

  function syncThemeCards() {
    const current = getStoredTheme();
    document.querySelectorAll('[data-theme-card]').forEach(function (card) {
      card.classList.toggle('active', card.dataset.themeCard === current);
    });
    // 更新主题名称显示
    document.querySelectorAll('[data-current-theme-name]').forEach(function (el) {
      el.textContent = THEMES[current] ? THEMES[current].name : '默认主题';
    });
  }
})();
