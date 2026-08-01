/* ============================================================
   Life OS PWA 注册脚本
   - 注册 Service Worker
   - 处理 iOS「添加到主屏幕」检测
   - 提供更新提示
   - 启动屏：黑底 + 荧光黄「我的生活 OS」
   ============================================================ */

(function () {
  'use strict';

  // ============ 启动屏（首次访问显示）============
  var splashShown = false;

  function showSplash() {
    if (splashShown) return;
    splashShown = true;

    var splash = document.createElement('div');
    splash.id = 'lifeos-splash';
    splash.innerHTML = [
      '<div class="splash-inner">',
      '  <div class="splash-logo">',
      '    <div class="splash-badge">OS</div>',
      '  </div>',
      '  <div class="splash-title">我的生活 OS</div>',
      '  <div class="splash-sub">Life OS</div>',
      '  <div class="splash-dots"><span></span><span></span><span></span></div>',
      '</div>'
    ].join('');
    document.body.appendChild(splash);

    // 注入样式
    var style = document.createElement('style');
    style.id = 'lifeos-splash-style';
    style.textContent = [
      '#lifeos-splash {',
      '  position: fixed; inset: 0; z-index: 999999;',
      '  background: #0E0E0F;',
      '  display: flex; align-items: center; justify-content: center;',
      '  animation: splashFadeOut 0.4s ease 1.4s forwards;',
      '  font-family: -apple-system, BlinkMacSystemFont, "Plus Jakarta Sans", "Noto Sans SC", sans-serif;',
      '}',
      '#lifeos-splash .splash-inner {',
      '  display: flex; flex-direction: column; align-items: center; gap: 20px;',
      '}',
      '#lifeos-splash .splash-logo {',
      '  width: 96px; height: 96px;',
      '  background: #DFFF00;',
      '  border-radius: 22px;',
      '  display: flex; align-items: center; justify-content: center;',
      '  box-shadow: 0 12px 32px rgba(223,255,0,0.18);',
      '  animation: splashLogoPulse 1.6s ease infinite;',
      '}',
      '#lifeos-splash .splash-badge {',
      '  font-size: 36px; font-weight: 900; color: #0E0E0F; letter-spacing: -1px;',
      '}',
      '#lifeos-splash .splash-title {',
      '  font-size: 32px; font-weight: 800; color: #DFFF00;',
      '  letter-spacing: -0.5px;',
      '  animation: splashTitleIn 0.6s ease 0.3s both;',
      '}',
      '#lifeos-splash .splash-sub {',
      '  font-size: 14px; font-weight: 600; color: #9A9AA2;',
      '  letter-spacing: 1.5px; text-transform: uppercase;',
      '  animation: splashTitleIn 0.6s ease 0.5s both;',
      '}',
      '#lifeos-splash .splash-dots {',
      '  display: flex; gap: 6px; margin-top: 20px;',
      '}',
      '#lifeos-splash .splash-dots span {',
      '  width: 6px; height: 6px; background: #DFFF00; border-radius: 50%;',
      '  animation: splashDot 1.2s ease infinite;',
      '  opacity: 0.3;',
      '}',
      '#lifeos-splash .splash-dots span:nth-child(2) { animation-delay: 0.2s; }',
      '#lifeos-splash .splash-dots span:nth-child(3) { animation-delay: 0.4s; }',
      '@keyframes splashLogoPulse {',
      '  0%, 100% { transform: scale(1); box-shadow: 0 12px 32px rgba(223,255,0,0.18); }',
      '  50% { transform: scale(1.05); box-shadow: 0 16px 40px rgba(223,255,0,0.32); }',
      '}',
      '@keyframes splashTitleIn {',
      '  from { opacity: 0; transform: translateY(8px); }',
      '  to { opacity: 1; transform: translateY(0); }',
      '}',
      '@keyframes splashDot {',
      '  0%, 100% { opacity: 0.3; transform: scale(1); }',
      '  50% { opacity: 1; transform: scale(1.3); }',
      '}',
      '@keyframes splashFadeOut {',
      '  to { opacity: 0; visibility: hidden; pointer-events: none; }',
      '}',
      ''
    ].join('\n');
    document.head.appendChild(style);

    // 2 秒后彻底移除
    setTimeout(function () {
      if (splash.parentNode) splash.parentNode.removeChild(splash);
      if (style.parentNode) style.parentNode.removeChild(style);
    }, 2000);
  }

  function hideSplash() {
    var splash = document.getElementById('lifeos-splash');
    if (splash) {
      splash.style.opacity = '0';
      splash.style.visibility = 'hidden';
      setTimeout(function () {
        if (splash.parentNode) splash.parentNode.removeChild(splash);
      }, 500);
    }
  }

  // 显示启动屏
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showSplash);
  } else {
    showSplash();
  }

  // 页面加载完成后淡出
  window.addEventListener('load', function () {
    setTimeout(hideSplash, 800);
  });

  // ============ Service Worker 注册 ============
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      // file:// 协议下 SW 不支持，跳过注册
      if (location.protocol === 'file:') {
        console.log('[LifeOS PWA] file:// 协议下跳过 SW 注册（iOS Safari 直接打开本地文件时可手动触发）');
        return;
      }

      navigator.serviceWorker.register('./sw.js')
        .then(function (reg) {
          console.log('[LifeOS PWA] Service Worker 注册成功:', reg.scope);
          // 监听更新
          reg.addEventListener('updatefound', function () {
            var newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', function () {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[LifeOS PWA] 新版本可用，刷新即可使用');
                }
              });
            }
          });
        })
        .catch(function (err) {
          console.warn('[LifeOS PWA] SW 注册失败:', err);
        });
    });
  }

  // ============ 检测 iOS「添加到主屏幕」状态 ============
  function isStandalone() {
    return window.navigator.standalone === true ||
           window.matchMedia('(display-mode: standalone)').matches;
  }

  function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  // 如果是 iOS Safari（非 standalone 模式），3 秒后可提示用户添加到主屏幕
  // 这里不强制弹窗，避免打扰用户
  window.LifeOSPWA = {
    isStandalone: isStandalone,
    isIOS: isIOS,
    canInstall: isIOS && !isStandalone()
  };

})();