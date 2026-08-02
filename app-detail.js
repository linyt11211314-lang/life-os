/* ============================================================
   Life OS · app-detail.js  —  统一「详情 / 编辑」交互骨架（阶段三）
   ------------------------------------------------------------
   建立全站统一的一条链路：
       点击卡片 → 上滑详情/编辑面板 → 修改字段 → 保存 → 落 localStorage → 列表刷新

   接入方式（声明式，一个属性即可，无需写任何 JS）：
       <div class="goal-card" data-edit="finance.goals#0">…</div>   按下标定位
       <div class="insp-card" data-edit="inspirations:3">…</div>    按 id 定位

   数据：沿用 storage.js 的 mock + localStorage，不引入任何后端
   视觉：完全复用既有 sheet 语言（遮罩淡入 + 面板 0.4s cubic-bezier 上滑，
         见 ARCHITECTURE §6.4），颜色全部走主题 CSS 变量
   ============================================================ */
(function () {
  'use strict';

  if (!window.LifeOS) return;

  /* ---------- 字段表：只描述「哪些字段可改」，不含任何业务逻辑 ---------- */
  var SCHEMAS = {
    'todos': {
      title: '任务', name: 'name',
      fields: [
        { k: 'name', l: '任务名称', t: 'text' },
        { k: 'note', l: '备注', t: 'textarea' },
        { k: 'deadline', l: '截止时间', t: 'text' },
        { k: 'status', l: '状态', t: 'select', options: ['todo', 'progress', 'done'], labels: ['待开始', '进行中', '已完成'] }
      ]
    },
    'inspirations': {
      title: '灵感', name: 'title',
      fields: [
        { k: 'title', l: '标题', t: 'text' },
        { k: 'text', l: '内容', t: 'textarea' },
        { k: 'cat', l: '分类', t: 'text' },
        { k: 'tags', l: '标签（逗号分隔）', t: 'tags' }
      ]
    },
    'starred': {
      title: '精选想法', name: 'title',
      fields: [
        { k: 'emoji', l: '图标', t: 'text' },
        { k: 'title', l: '标题', t: 'text' },
        { k: 'text', l: '内容', t: 'textarea' },
        { k: 'cat', l: '分类', t: 'text' }
      ]
    },
    'decisions': {
      title: '消费决策', name: 'name',
      fields: [
        { k: 'name', l: '物品名称', t: 'text' },
        { k: 'price', l: '价格', t: 'text' },
        { k: 'cat', l: '分类', t: 'text' },
        { k: 'reason', l: '决策理由', t: 'textarea' }
      ]
    },
    'finance.goals': {
      title: '储蓄目标', name: 'name',
      fields: [
        { k: 'emoji', l: '图标', t: 'text' },
        { k: 'name', l: '目标名称', t: 'text' },
        { k: 'current', l: '已存金额', t: 'number' },
        { k: 'target', l: '目标金额', t: 'number' },
        { k: 'eta', l: '预计达成', t: 'text' }
      ]
    },
    'finance.allocations': {
      title: '资金分配', name: 'name',
      fields: [
        { k: 'emoji', l: '图标', t: 'text' },
        { k: 'name', l: '类目名称', t: 'text' },
        { k: 'amount', l: '金额', t: 'number' },
        { k: 'pct', l: '占比 %', t: 'number' }
      ]
    },
    'pet.timeline': {
      title: '陪伴记录', name: 'text',
      fields: [
        { k: 'date', l: '日期', t: 'text' },
        { k: 'text', l: '记录', t: 'text' },
        { k: 'sub', l: '详情', t: 'textarea' }
      ]
    },
    'cycle.history': {
      title: '周期记录', name: 'dates',
      fields: [
        { k: 'dates', l: '起止日期', t: 'text' },
        { k: 'cycle', l: '周期长度（天）', t: 'number' },
        { k: 'duration', l: '持续天数', t: 'number' },
        { k: 'flow', l: '流量', t: 'select', options: ['light', 'normal', 'heavy'], labels: ['少量', '正常', '较多'] }
      ]
    }
  };

  /* ---------- 样式（复用既有 sheet 语言，颜色走主题变量） ---------- */
  var style = document.createElement('style');
  style.id = 'lifeos-detail-style';   // 带 id → 不会被视图样式切换清掉
  style.textContent = [
    '.lifeos-ds{position:absolute;inset:0;z-index:400;background:rgba(8,8,10,.6);',
    ' backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);',
    ' opacity:0;pointer-events:none;transition:opacity .3s ease;isolation:isolate}',
    '.lifeos-ds.show{opacity:1;pointer-events:auto}',
    /* 面板绝对定位并固定在 Tab Bar（约 96px 高）之上，底部留白与 translateY 滑入互不耦合，
       不再依赖 flex 父级 padding，避免多视图切换后留白失效、按钮压住 Tab Bar 的问题 */
    '.lifeos-ds-panel{position:absolute;left:0;right:0;bottom:108px;',
    ' max-height:calc(100% - 124px);background:var(--card-2);border:1px solid var(--line);',
    ' border-radius:32px 32px 44px 44px;padding:24px 22px 30px;transform:translateY(130%);',
    ' transition:transform .4s cubic-bezier(.32,.72,0,1);overflow-y:auto;scrollbar-width:none}',
    '.lifeos-ds.show .lifeos-ds-panel{transform:translateY(0)}',
    '.lifeos-ds-panel::-webkit-scrollbar{display:none}',
    '.lifeos-ds-handle{width:40px;height:4px;background:rgba(255,255,255,.2);border-radius:100px;margin:0 auto 18px}',
    '.lifeos-ds-title{font-size:20px;font-weight:800;letter-spacing:-.3px;margin-bottom:4px;color:var(--text)}',
    '.lifeos-ds-sub{font-size:13px;color:var(--text-sub);margin-bottom:20px}',
    '.lifeos-ds-field{margin-bottom:16px}',
    '.lifeos-ds-label{font-size:12px;font-weight:700;color:var(--text-sub);letter-spacing:.3px;margin-bottom:8px;text-transform:uppercase}',
    '.lifeos-ds-input{width:100%;background:rgba(255,255,255,.05);border:1px solid var(--line);',
    ' border-radius:14px;padding:14px 16px;font-size:15px;font-weight:600;color:var(--text);',
    ' font-family:inherit;outline:none;transition:border-color .2s;-webkit-appearance:none;appearance:none}',
    '.lifeos-ds-input:focus{border-color:var(--accent);background:rgba(var(--accent-rgb),.06)}',
    'textarea.lifeos-ds-input{resize:none;min-height:64px;line-height:1.5;font-weight:500}',
    '.lifeos-ds-btns{display:flex;gap:10px;margin-top:24px}',
    '.lifeos-ds-btn{flex:1;border:none;border-radius:16px;padding:15px;font-size:15px;font-weight:800;',
    ' font-family:inherit;cursor:pointer;transition:transform .15s ease}',
    '.lifeos-ds-btn:active{transform:scale(.97)}',
    '.lifeos-ds-btn.ghost{background:rgba(255,255,255,.06);color:var(--text-sub);border:1px solid var(--line)}',
    '.lifeos-ds-btn.primary{background:var(--accent);color:#0E0E10}',
    '.lifeos-ds-toast{position:absolute;left:50%;top:64px;transform:translate(-50%,-14px);z-index:500;',
    ' background:var(--accent);color:#0E0E10;font-size:13px;font-weight:800;padding:10px 18px;',
    ' border-radius:100px;opacity:0;pointer-events:none;transition:opacity .25s ease,transform .25s ease}',
    '.lifeos-ds-toast.show{opacity:1;transform:translate(-50%,0)}',
    '[data-edit]{cursor:pointer;-webkit-tap-highlight-color:transparent;transition:transform .2s ease}',
    '[data-edit]:active{transform:scale(.975)}'
  ].join('');
  document.head.appendChild(style);

  /* ---------- 面板 DOM（挂在 .screen 内，不随视图切换销毁） ---------- */
  var host = document.querySelector('.screen');
  if (!host) return;

  var sheet = document.createElement('div');
  sheet.className = 'lifeos-ds';
  sheet.innerHTML =
    '<div class="lifeos-ds-panel">' +
      '<div class="lifeos-ds-handle"></div>' +
      '<div class="lifeos-ds-title"></div>' +
      '<div class="lifeos-ds-sub"></div>' +
      '<div class="lifeos-ds-body"></div>' +
      '<div class="lifeos-ds-btns">' +
        '<button type="button" class="lifeos-ds-btn ghost" data-ds="cancel">取消</button>' +
        '<button type="button" class="lifeos-ds-btn primary" data-ds="save">保存</button>' +
      '</div>' +
    '</div>';
  host.appendChild(sheet);

  var toast = document.createElement('div');
  toast.className = 'lifeos-ds-toast';
  host.appendChild(toast);

  var elTitle = sheet.querySelector('.lifeos-ds-title');
  var elSub = sheet.querySelector('.lifeos-ds-sub');
  var elBody = sheet.querySelector('.lifeos-ds-body');

  var toastTimer;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 1800);
  }

  /* ---------- 定位一条数据 ---------- */
  // "finance.goals#0" → {store:'finance', path:'goals', by:'index', ref:0}
  // "inspirations:3"  → {store:'inspirations', path:null, by:'id', ref:3}
  function parseSpec(str) {
    var by = str.indexOf('#') >= 0 ? 'index' : (str.indexOf(':') >= 0 ? 'id' : null);
    if (!by) return null;
    var parts = str.split(by === 'index' ? '#' : ':');
    var head = parts[0], ref = parts[1];
    var dot = head.indexOf('.');
    return {
      schema: head,
      store: dot >= 0 ? head.slice(0, dot) : head,
      path: dot >= 0 ? head.slice(dot + 1) : null,
      by: by,
      ref: by === 'index' ? parseInt(ref, 10) : ref
    };
  }

  function locate(spec) {
    var root = LifeOS.get(spec.store);
    if (!root) return null;
    var arr = spec.path ? root[spec.path] : root;
    if (!Array.isArray(arr)) return null;
    var idx = spec.by === 'index'
      ? spec.ref
      : arr.findIndex(function (x) { return String(x.id) === String(spec.ref); });
    if (idx < 0 || idx >= arr.length) return null;
    return { root: root, arr: arr, idx: idx, item: arr[idx] };
  }

  /* ---------- 渲染表单 ---------- */
  var activeSpec = null, activeSchema = null;

  function fieldHTML(f, val) {
    var v = (val === undefined || val === null) ? '' : val;
    if (f.t === 'tags' && Array.isArray(v)) v = v.join(', ');
    var safe = String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    var html = '<div class="lifeos-ds-field"><div class="lifeos-ds-label">' + f.l + '</div>';
    if (f.t === 'textarea') {
      html += '<textarea class="lifeos-ds-input" data-k="' + f.k + '">' + safe + '</textarea>';
    } else if (f.t === 'select') {
      html += '<select class="lifeos-ds-input" data-k="' + f.k + '">';
      for (var i = 0; i < f.options.length; i++) {
        html += '<option value="' + f.options[i] + '"' +
                (String(v) === f.options[i] ? ' selected' : '') + '>' +
                ((f.labels && f.labels[i]) || f.options[i]) + '</option>';
      }
      html += '</select>';
    } else {
      html += '<input class="lifeos-ds-input" type="' + (f.t === 'number' ? 'number' : 'text') +
              '" data-k="' + f.k + '" data-t="' + f.t + '" value="' + safe + '">';
    }
    return html + '</div>';
  }

  function open(specStr) {
    var spec = parseSpec(specStr);
    if (!spec) return;
    var schema = SCHEMAS[spec.schema];
    if (!schema) { showToast('该模块暂未开放编辑'); return; }
    var found = locate(spec);
    if (!found) { showToast('未找到这条数据'); return; }

    activeSpec = spec;
    activeSchema = schema;
    elTitle.textContent = schema.title;
    elSub.textContent = String(found.item[schema.name] || '') || '编辑内容后点击保存';
    elBody.innerHTML = schema.fields.map(function (f) {
      return fieldHTML(f, found.item[f.k]);
    }).join('');
    sheet.classList.add('show');
  }

  function close() {
    sheet.classList.remove('show');
    activeSpec = null;
    activeSchema = null;
  }

  function save() {
    if (!activeSpec || !activeSchema) return;
    var found = locate(activeSpec);
    if (!found) { close(); return; }

    var inputs = elBody.querySelectorAll('[data-k]');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      var key = el.getAttribute('data-k');
      var def = null;
      for (var j = 0; j < activeSchema.fields.length; j++) {
        if (activeSchema.fields[j].k === key) { def = activeSchema.fields[j]; break; }
      }
      var raw = el.value;
      if (def && def.t === 'number') {
        var n = parseFloat(raw);
        found.item[key] = isNaN(n) ? 0 : n;
      } else if (def && def.t === 'tags') {
        found.item[key] = String(raw).split(/[,，]/)
          .map(function (s) { return s.trim(); })
          .filter(function (s) { return !!s; });
      } else {
        found.item[key] = raw;
      }
    }

    found.arr[found.idx] = found.item;
    LifeOS.set(activeSpec.store, found.root);
    close();
    showToast('已保存');

    // 让当前视图用最新数据重新渲染
    if (window.LifeOSNav && window.LifeOSNav.refresh) {
      setTimeout(function () { window.LifeOSNav.refresh(); }, 240);
    } else {
      setTimeout(function () { location.reload(); }, 240);
    }
  }

  /* ---------- 事件 ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target;
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      if (el === sheet) {                       // 点遮罩关闭
        if (e.target === sheet) close();
        return;
      }
      var act = el.getAttribute && el.getAttribute('data-ds');
      if (act === 'cancel') { close(); return; }
      if (act === 'save') { save(); return; }
      var spec = el.getAttribute && el.getAttribute('data-edit');
      if (spec) { e.preventDefault(); e.stopPropagation(); open(spec); return; }
      el = el.parentElement;
    }
  }, false);

  /* ---------- 对外 API ---------- */
  window.LifeOSDetail = {
    open: open,
    close: close,
    schemas: SCHEMAS,
    /** 供后续模块注册字段表，无需改动本文件 */
    register: function (key, schema) { SCHEMAS[key] = schema; },
    toast: showToast
  };
})();
