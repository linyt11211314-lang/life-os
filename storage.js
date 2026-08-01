/* ============================================================
   LifeOS Storage — 统一本地数据存储层
   基于 localStorage，无需后端，纯个人使用
   在所有页面 </body> 前引入（在 theme-runtime.js 之后）
   ============================================================ */

(function () {
  'use strict';

  var PREFIX = 'lifeos_';
  var VERSION = 1;

  // 默认数据
  var DEFAULTS = {
    // 待办清单
    todos: [
      { id: 1, name: '完成健身计划', cat: 'health', priority: 'mid', status: 'progress', deadline: '今天 20:00', note: '上肢训练 · 45 分钟', createdAt: '2026-08-01' },
      { id: 2, name: '学习新技能 30 分钟', cat: 'study', priority: 'mid', status: 'progress', deadline: '今天 22:00', note: '设计思维课程第 3 节', createdAt: '2026-08-01' },
      { id: 3, name: '整理本周笔记', cat: 'life', priority: 'low', status: 'done', deadline: '已完成', note: '把灵感碎片归类到资料库', createdAt: '2026-07-31' }
    ],

    // 生活记录
    records: [
      { id: 1, type: 'image', date: '8月1日', title: '晚霞很温柔', img: 'https://picsum.photos/seed/record-sunset/400/520', mood: '' },
      { id: 2, type: 'mood', date: '8月1日', title: '闪闪发光', text: '完成了一个小目标', mood: '✨', color: 'purple' },
      { id: 3, type: 'text', date: '7月31日', title: '今天的灵感', text: '把生活当成产品来打磨', color: 'light' },
      { id: 4, type: 'image', date: '7月31日', title: '早安咖啡', img: 'https://picsum.photos/seed/record-coffee/400/300', mood: '' },
      { id: 5, type: 'text', date: '7月30日', title: '坚持打卡第 20 天', text: '习惯追踪', color: 'yellow' },
      { id: 6, type: 'image', date: '7月30日', title: '散步路上', img: 'https://picsum.photos/seed/record-walk/400/440', mood: '' }
    ],

    // 我的伙伴
    pet: {
      name: '饭团', species: '英国短毛猫 · 银渐层', gender: '♀',
      age: '2 岁', birthDate: '2024.03.15', weight: '4.2kg',
      mood: '今天心情很好', avatar: '🐱',
      stats: { days: 128, records: 86, goals: 21 },
      timeline: [
        { id: 1, date: '2026.08.01 · 今天', text: '今天晒太阳 ☀️', sub: '在窗边躺了一下午，尾巴摇来摇去', img: 'https://picsum.photos/seed/pet-today/400/260', color: '' },
        { id: 2, date: '2026.07.28', text: '第 4 次驱虫完成 💊', sub: '体重稳定在 4.2kg，医生说很健康', img: '', color: 'yellow' },
        { id: 3, date: '2026.07.20', text: '两岁生日快乐 🎂', sub: '给饭团做了专属鸡肉蛋糕，吃得很开心', img: 'https://picsum.photos/seed/pet-cake/400/260', color: '' }
      ]
    },

    // 财富规划
    finance: {
      available: 28560, budget: 8000, budgetUsed: 53,
      savingsTarget: 50000, savingsCurrent: 34200,
      allocations: [
        { emoji: '🏠', name: '固定支出', amount: 3050, pct: 38, color: 'y' },
        { emoji: '🍚', name: '日常生活', amount: 2000, pct: 25, color: 'p' },
        { emoji: '🎮', name: '娱乐消费', amount: 800, pct: 10, color: 'w' },
        { emoji: '📚', name: '自我提升', amount: 950, pct: 12, color: 'p' },
        { emoji: '💰', name: '储蓄计划', amount: 1200, pct: 15, color: 'y' }
      ],
      goals: [
        { emoji: '✈️', name: '日本旅行计划', current: 8200, target: 15000, eta: '2026.12', cardType: 'light' },
        { emoji: '💻', name: '新 MacBook', current: 6500, target: 14999, eta: '2026.10', cardType: 'dark' },
        { emoji: '🏦', name: '长期储蓄基金', current: 34200, target: 50000, eta: '2027.06', cardType: 'purple' }
      ]
    },

    // 消费决策
    decisions: [
      { id: 1, name: 'Sony WH-1000XM5 降噪耳机', price: '¥1,899', cat: '🎧 数码', img: 'https://picsum.photos/seed/buy-headphone/200/200', reason: '每天通勤 2 小时，降噪对专注和休息都有帮助，可以用很久', status: 'consider', necessity: 4, frequency: 5, priceSat: 3 },
      { id: 2, name: '机械键盘', price: '¥899', cat: '⌨️ 数码', img: 'https://picsum.photos/seed/buy-keyboard/200/200', reason: '手感确实好，但当前键盘还能用，可以再等等', status: 'research', necessity: 2, frequency: 4, priceSat: 3 },
      { id: 3, name: '日常背包', price: '¥459', cat: '🎒 生活', img: 'https://picsum.photos/seed/buy-bag/200/200', reason: '旧包拉链坏了，通勤+短途旅行都能用，实用度高', status: 'buy', necessity: 5, frequency: 5, priceSat: 4 },
      { id: 4, name: '限量版手办', price: '¥1,200', cat: '🎨 收藏', img: 'https://picsum.photos/seed/buy-figure/200/200', reason: '很喜欢，但只是收藏展示，实用价值不高', status: 'want', necessity: 1, frequency: 1, priceSat: 2 }
    ],

    // 生理周期
    cycle: {
      currentDay: 18, lastPeriodStart: '7月14日',
      phase: '黄体期', phaseEmoji: '🌙',
      daysToNext: 10, nextDate: '8月11日',
      avgCycle: 28, avgDuration: 5.5, fluctuation: '±1.0',
      history: [
        { dates: '7月14日 - 7月19日', cycle: 28, duration: 6, flow: 'normal', cardType: 'light' },
        { dates: '6月16日 - 6月21日', cycle: 29, duration: 6, flow: 'heavy', cardType: 'dark' },
        { dates: '5月18日 - 5月22日', cycle: 27, duration: 5, flow: 'light', cardType: 'dark' }
      ]
    },

    // 灵感空间
    inspirations: [
      { id: 1, type: 'image', date: '8月1日', cat: '灵感', title: '极简配色方案', text: '黑+荧光黄+紫，撞色但有高级感', tags: ['#设计', '#配色'], img: 'https://picsum.photos/seed/insp-design/400/300', starred: false },
      { id: 2, type: 'text', date: '8月1日', cat: '灵感', title: '把生活当产品打磨', text: '迭代自己 v1.0 → v2.0，每个版本都比上一个好一点', tags: ['#成长', '#思维'], img: '', starred: false, color: 'purple' },
      { id: 3, type: 'text', date: '7月31日', cat: '学习', title: '费曼学习法', text: '能用简单语言解释给别人听，才算真懂', tags: ['#学习方法'], img: '', starred: false, color: 'light' },
      { id: 4, type: 'image', date: '7月31日', cat: '创意', title: '咖啡馆工作法', text: '换个环境，思维会不一样', tags: [], img: 'https://picsum.photos/seed/insp-cafe/400/360', starred: false },
      { id: 5, type: 'text', date: '7月30日', cat: '计划', title: 'Q3 个人 OKR', text: '健康、学习、输出三条线并行推进', tags: ['#规划', '#目标'], img: '', starred: false, color: 'yellow' },
      { id: 6, type: 'image', date: '7月30日', cat: '收藏', title: '《心流》读书笔记', text: '专注本身就是奖励', tags: [], img: 'https://picsum.photos/seed/insp-book/400/280', starred: false }
    ],

    // 精选想法
    starred: [
      { id: 1, emoji: '💡', title: '每天进步 1%，一年后是 37 倍', text: '复利效应不只适用于金钱，也适用于知识、健康、关系。关键是每天都要有微小的正向积累。', cat: '#成长思维', date: '7月28日', cardType: 'purple' },
      { id: 2, emoji: '🚀', title: '年底前完成个人 App 上线', text: '把生活 OS 打造成真正的产品。MVP 9月内完成，10月开始内测，12月正式上线。', cat: '#未来计划', date: '7月25日', cardType: 'dark' },
      { id: 3, emoji: '📖', title: '值得反复读的三本书', text: '《心流》《被讨厌的勇气》《纳瓦尔宝典》—— 每次读都有新收获，适合放在床头定期回看。', cat: '#值得回看', date: '7月20日', cardType: 'light' }
    ],

    // 用户资料
    profile: {
      name: 'Lin', id: 'life_os_2026',
      bio: '认真生活的人，生活也会认真待你 ✨',
      stats: { days: 128, records: 86, goals: 21 }
    }
  };

  // 读取
  function get(key) {
    try {
      var raw = localStorage.getItem(PREFIX + key);
      if (raw === null) return DEFAULTS[key] !== undefined ? JSON.parse(JSON.stringify(DEFAULTS[key])) : null;
      return JSON.parse(raw);
    } catch (e) {
      return DEFAULTS[key] !== undefined ? JSON.parse(JSON.stringify(DEFAULTS[key])) : null;
    }
  }

  // 写入
  function set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  // 追加到数组
  function push(key, item) {
    var arr = get(key);
    if (!Array.isArray(arr)) arr = [];
    if (!item.id) item.id = Date.now();
    if (!item.createdAt) item.createdAt = new Date().toISOString().slice(0, 10);
    arr.unshift(item);
    set(key, arr);
    return item;
  }

  // 更新数组中某项
  function update(key, id, patch) {
    var arr = get(key);
    if (!Array.isArray(arr)) return null;
    var idx = arr.findIndex(function (x) { return x.id === id; });
    if (idx === -1) return null;
    arr[idx] = Object.assign(arr[idx], patch);
    set(key, arr);
    return arr[idx];
  }

  // 删除数组中某项
  function remove(key, id) {
    var arr = get(key);
    if (!Array.isArray(arr)) return false;
    arr = arr.filter(function (x) { return x.id !== id; });
    set(key, arr);
    return true;
  }

  // 重置为默认
  function reset(key) {
    if (DEFAULTS[key]) {
      set(key, JSON.parse(JSON.stringify(DEFAULTS[key])));
      return true;
    }
    localStorage.removeItem(PREFIX + key);
    return true;
  }

  // 重置全部
  function resetAll() {
    Object.keys(DEFAULTS).forEach(function (k) { reset(k); });
  }

  // 导出全部
  function exportAll() {
    var data = {};
    Object.keys(DEFAULTS).forEach(function (k) { data[k] = get(k); });
    return JSON.stringify(data, null, 2);
  }

  // 导入
  function importAll(jsonStr) {
    try {
      var data = JSON.parse(jsonStr);
      Object.keys(data).forEach(function (k) { set(k, data[k]); });
      return true;
    } catch (e) { return false; }
  }

  // 公开 API
  window.LifeOS = {
    get: get,
    set: set,
    push: push,
    update: update,
    remove: remove,
    reset: reset,
    resetAll: resetAll,
    exportAll: exportAll,
    importAll: importAll,
    defaults: DEFAULTS,
    version: VERSION
  };
})();
