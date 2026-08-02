/* ============================================================
   Life OS · app-nav.js  —  SPA 视图路由（阶段三）
   ------------------------------------------------------------
   目标：把「多页 HTML 互跳」变成「App 内部视图切换」
     · Tab 切换不再整页重载，不再重放入场动画
     · 视图 DOM keep-alive 缓存，二次进入瞬时且保留滚动位置
     · 一级 Tab 平级淡入 / 二级页右推入 / 返回左退出
     · 任何异常自动退回原生 location.href，绝不产生死路

   约束：不改视觉设计、不改主题系统、不重构既有代码、不新增页面
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 路由表 ---------- */
  // 纳入 SPA 的视图（app-framework.html 是设计稿总览页，结构特殊，走原生跳转）
  var ROUTES = [
    'index.html', 'space.html', 'companion.html',
    'cycle.html', 'finance.html', 'decide.html', 'inspiration.html', 'profile.html'
  ];
  // 底部 Tab 高亮索引（.tabbar .tab 共 4 个：0 首页 / 1 空间 / 2 记录 / 3 我的）
  var TAB_INDEX = {
    'index.html': 0,
    'space.html': 1, 'companion.html': 1,
    'cycle.html': 1, 'finance.html': 1, 'decide.html': 1, 'inspiration.html': 1,
    'profile.html': 3
  };
  // 一级 Tab 页（彼此之间是平级切换）
  var TAB_ROUTES = ['index.html', 'space.html', 'profile.html'];
  // 四个 Tab 的固定目标（原 HTML 会给「当前页」那个 Tab 去掉 onclick，
  // 这里补一层显式标记，避免任何 Tab 变成死区）
  var TAB_TARGETS = ['index.html', 'space.html', 'app-framework.html#record', 'profile.html'];

  /* ---------- 可用性前置判断 ---------- */
  // file:// 协议下 fetch 同级文件会被 CORS 拒绝 → 保持原生跳转
  if (location.protocol === 'file:') return;
  if (!window.fetch || !window.DOMParser || !window.history || !history.pushState) return;

  var screen = document.querySelector('.screen');
  if (!screen) return;
  var indicator = screen.querySelector('.home-indicator');
  var tabbar = screen.querySelector('.tabbar');
  if (!indicator || !tabbar) return;

  function parseHref(href) {
    var a = document.createElement('a');
    a.href = href;
    return { file: (a.pathname.split('/').pop() || 'index.html'), hash: a.hash || '' };
  }

  var current = parseHref(location.href).file;
  if (ROUTES.indexOf(current) < 0) return;   // 宿主页不在路由表内则不启用

  /* ---------- 一次性注入：过渡动画 + 按压反馈 ---------- */
  var navStyle = document.createElement('style');
  navStyle.id = 'lifeos-nav-style';
  navStyle.textContent = [
    /* 视图切换过渡 */
    '@keyframes lifeosNavPush{from{opacity:.3;transform:translate3d(22px,0,0)}to{opacity:1;transform:none}}',
    '@keyframes lifeosNavPop{from{opacity:.3;transform:translate3d(-16px,0,0)}to{opacity:1;transform:none}}',
    '@keyframes lifeosNavFade{from{opacity:.35}to{opacity:1}}',
    '.content.lifeos-push{animation:lifeosNavPush .26s cubic-bezier(.32,.72,0,1) both}',
    '.content.lifeos-pop{animation:lifeosNavPop .24s cubic-bezier(.32,.72,0,1) both}',
    '.content.lifeos-fade{animation:lifeosNavFade .16s ease both}',
    /* 入口按压反馈 —— 对齐 ARCHITECTURE §6.4「:active scale(0.97-0.98)」 */
    '[onclick*="location.href"]:not(.tab),[data-entry]{cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '[onclick*="location.href"]:not(.tab):active,[data-entry]:active{transform:scale(.975)}',
    '.gcard{transition:transform .2s ease}'
  ].join('\n');
  document.head.appendChild(navStyle);

  /* rise 中和：SPA 切换后常驻，保证任何视图都不再重放入场动画（冷启动那一次仍保留） */
  var riseKill = null;
  function neutralizeRise() {
    if (!riseKill) {
      riseKill = document.createElement('style');
      riseKill.id = 'lifeos-rise-off';
      riseKill.textContent =
        '@keyframes rise{from{opacity:1;transform:none}to{opacity:1;transform:none}}';
    }
    document.head.appendChild(riseKill);   // 已存在则移到末尾，保证覆盖视图样式
  }

  /* ---------- 视图缓存 ---------- */
  // views[file] = { content, extras[], styles[], scripts[], title, scroll, ready }
  var views = {};

  function siblingsAfter(node, clone) {
    var out = [], n = node.nextElementSibling;
    while (n) {
      out.push(clone ? document.importNode(n, true) : n);
      n = n.nextElementSibling;
    }
    return out;
  }

  // 给当前 Tab Bar 的四个 Tab 补上显式路由标记
  function decorateTabs() {
    var tabs = screen.querySelectorAll('.tabbar .tab');
    for (var i = 0; i < tabs.length && i < TAB_TARGETS.length; i++) {
      tabs[i].setAttribute('data-nav', TAB_TARGETS[i]);
    }
  }
  decorateTabs();

  // 登记冷启动页（DOM 已在文档中，样式为 head 里无 id 的 <style>）
  views[current] = {
    content: screen.querySelector('.content'),
    tabbar: tabbar,
    extras: siblingsAfter(indicator, false),
    styles: [].slice.call(document.head.querySelectorAll('style:not([id])')),
    scripts: null,          // 冷启动页脚本已由浏览器执行
    title: document.title,
    scroll: 0,
    ready: true
  };
  // 当前挂载中的视图对象（与 views 缓存分开持有，便于刷新时先失效缓存再换页）
  var currentView = views[current];

  /* ---------- 拉取并解析视图 ---------- */
  function loadView(file) {
    if (views[file]) return Promise.resolve(views[file]);
    return fetch(file, { cache: 'no-cache', credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var content = doc.querySelector('.content');
        var ind = doc.querySelector('.home-indicator');
        var bar = doc.querySelector('.tabbar');
        if (!content || !ind || !bar) throw new Error('页面结构不符合视图约定');

        var styles = [];
        [].forEach.call(doc.head.querySelectorAll('style:not([id])'), function (s) {
          var el = document.createElement('style');
          el.setAttribute('data-view-style', file);
          el.textContent = s.textContent;
          styles.push(el);
        });

        var scripts = [];
        [].forEach.call(doc.querySelectorAll('body script'), function (s) {
          if (!s.src && s.textContent && s.textContent.trim()) scripts.push(s.textContent);
        });

        views[file] = {
          content: document.importNode(content, true),
          // Tab Bar 必须随视图替换：inspiration 把 id="addBtn" 挂在 .tab-plus 上，
          // 沿用宿主页的 Tab Bar 会让这些页面的「+」失联。
          tabbar: document.importNode(bar, true),
          extras: siblingsAfter(ind, true),
          styles: styles,
          scripts: scripts,
          title: doc.title || document.title,
          scroll: 0,
          ready: false
        };
        return views[file];
      });
  }

  /* ---------- 视图切换 ---------- */
  var busy = false;

  function transitionMode(from, to) {
    var fromTab = TAB_ROUTES.indexOf(from) >= 0;
    var toTab = TAB_ROUTES.indexOf(to) >= 0;
    if (fromTab && toTab) return 'fade';   // Tab 平级切换
    if (fromTab && !toTab) return 'push';  // 进入二级页
    if (!fromTab && toTab) return 'pop';   // 回到一级页
    return 'push';
  }

  function setActiveTab(idx) {
    var tabs = screen.querySelectorAll('.tabbar .tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', i === idx);
    }
  }

  function playTransition(node, mode) {
    node.classList.remove('lifeos-push', 'lifeos-pop', 'lifeos-fade');
    void node.offsetWidth;                       // 强制回流，重启动画
    node.classList.add('lifeos-' + mode);
  }

  function runViewScripts(list) {
    if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
      try {
        (new Function(list[i])).call(window);    // 函数作用域，避免顶层声明冲突
      } catch (e) {
        if (window.console) console.warn('[app-nav] 视图脚本执行失败:', e);
      }
    }
  }

  function scrollToHash(hash) {
    if (!hash) return;
    var el = null;
    try { el = screen.querySelector(hash); } catch (e) { }
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start' });
  }

  function swap(view, file, hash, push, mode) {
    var prev = currentView;

    // 1. 记录离开前的滚动位置
    if (prev && prev.content) prev.scroll = prev.content.scrollTop || 0;

    // 2. 换页级样式（每个页面的 <style> 都是自包含的，同一时刻只挂一份）
    if (prev && prev.styles) {
      prev.styles.forEach(function (s) { if (s.parentNode) s.parentNode.removeChild(s); });
    }
    view.styles.forEach(function (s) { document.head.appendChild(s); });

    // 3. 覆盖层样式保持在最末（rise 中和 → 过渡样式 → 主题覆盖）
    neutralizeRise();
    document.head.appendChild(navStyle);

    // 4. 换 DOM：.content 与 .tabbar 原位替换，页面级浮层（toast / sheet）整组替换
    var oldContent = (prev && prev.content) || screen.querySelector('.content');
    var oldBar = (prev && prev.tabbar) || screen.querySelector('.tabbar');
    if (oldContent && oldContent.parentNode === screen) {
      screen.replaceChild(view.content, oldContent);
    } else if (oldBar && oldBar.parentNode === screen) {
      screen.insertBefore(view.content, oldBar);
    }
    if (view.tabbar && oldBar && oldBar.parentNode === screen) {
      screen.replaceChild(view.tabbar, oldBar);
    }
    if (prev && prev.extras) {
      prev.extras.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    }
    view.extras.forEach(function (n) { screen.appendChild(n); });

    // 5. Tab 标记 / 高亮 / 标题 / 历史
    decorateTabs();
    setActiveTab(TAB_INDEX[file]);
    document.title = view.title;
    if (push) {
      history.pushState({ file: file, hash: hash || '' }, '', file + (hash || ''));
    }
    current = file;
    currentView = view;

    // 6. 主题重贴（把 lifeos-theme-override 移到 head 末尾并同步主题卡）
    try {
      if (window.LifeOSTheme) window.LifeOSTheme.apply(window.LifeOSTheme.current());
    } catch (e) { }

    // 7. 首次进入执行该视图专属脚本（keep-alive 后不再重复执行）
    if (!view.ready) {
      view.ready = true;
      runViewScripts(view.scripts);
    }

    // 8. 滚动还原 + 过渡动画
    view.content.scrollTop = hash ? 0 : (view.scroll || 0);
    playTransition(view.content, mode);
    if (hash) scrollToHash(hash);

    window.dispatchEvent(new CustomEvent('lifeos:viewchange', {
      detail: { view: file, hash: hash || '' }
    }));
  }

  function go(file, hash, push, mode) {
    if (busy) return;
    if (file === current) {
      if (hash) scrollToHash(hash);
      else if (views[current] && views[current].content) {
        views[current].content.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    busy = true;
    loadView(file).then(function (view) {
      swap(view, file, hash, push, mode || transitionMode(current, file));
      busy = false;
    }).catch(function (err) {
      if (window.console) console.warn('[app-nav] 视图加载失败，回退原生跳转:', err);
      busy = false;
      location.href = file + (hash || '');
    });
  }

  /* ---------- 点击拦截（捕获阶段，早于元素上的内联 onclick） ---------- */
  document.addEventListener('click', function (e) {
    // 注意：不要检查 e.defaultPrevented —— 捕获阶段本就在最前，
    // 且 Chromium 对 SVG 子元素的点击会预置该标记，检查它会导致拦截整体失效。
    if (e.button != null && e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var el = e.target;
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      var href = null, explicit = false;

      if (el.getAttribute) {
        href = el.getAttribute('data-nav');       // Tab Bar 的显式路由标记
        if (href) explicit = true;
      }
      if (!href && el.tagName === 'A') {
        href = el.getAttribute('href');
      }
      if (!href && el.getAttribute) {
        var oc = el.getAttribute('onclick');
        if (oc) {
          var m = /location\.href\s*=\s*['"]([^'"]+)['"]/.exec(oc);
          if (m) href = m[1];
        }
      }

      if (href) {
        if (/^(https?:|mailto:|tel:|javascript:)/i.test(href) || href.charAt(0) === '#') return;
        var t = parseHref(href);
        if (ROUTES.indexOf(t.file) < 0) {
          // 目标不在 SPA 路由表（设计稿页 app-framework.html）→ 走原生跳转
          if (explicit) { e.preventDefault(); e.stopPropagation(); location.href = href; }
          return;                                 // 内联 onclick 自行完成跳转
        }
        e.preventDefault();
        e.stopPropagation();                      // 阻断到达元素自身的内联 onclick
        go(t.file, t.hash, true, transitionMode(current, t.file));
        return;
      }
      el = el.parentElement;
    }
  }, true);

  /* ---------- 前进/后退 ---------- */
  history.replaceState({ file: current, hash: location.hash || '' }, '', location.href);
  window.addEventListener('popstate', function () {
    var t = parseHref(location.href);
    if (ROUTES.indexOf(t.file) < 0) { location.reload(); return; }
    go(t.file, t.hash, false, transitionMode(current, t.file));
  });

  /* ---------- 对外 API ---------- */
  window.LifeOSNav = {
    go: function (href) {
      var t = parseHref(href);
      if (ROUTES.indexOf(t.file) < 0) { location.href = href; return; }
      go(t.file, t.hash, true, transitionMode(current, t.file));
    },
    current: function () { return current; },
    prefetch: function (file) { return loadView(file).catch(function () { }); },
    routes: ROUTES,
    /** 丢弃当前视图缓存并用最新数据重新渲染（编辑保存后调用） */
    refresh: function () {
      var file = current;
      var keepScroll = (currentView && currentView.content) ? currentView.content.scrollTop : 0;
      delete views[file];
      return loadView(file).then(function (v) {
        v.scroll = keepScroll;
        swap(v, file, '', false, 'fade');
      }).catch(function () { location.reload(); });
    }
  };

  /* ---------- 空闲预取一级 Tab，让首次切换也是瞬时的 ---------- */
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1500); };
  idle(function () {
    TAB_ROUTES.forEach(function (f) {
      if (f !== current) loadView(f).catch(function () { });
    });
  });
})();
