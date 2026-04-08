// 主页 - 罐子+进度+打卡+折星星动画
const COLOR_PAIRS = [
  { color: "#F5CE60", colorLight: "#FFF5B8" },
  { color: "#F5A0B0", colorLight: "#FFE0E8" },
  { color: "#B898E8", colorLight: "#E8D8FF" },
  { color: "#78C8EE", colorLight: "#C5EEFF" },
  { color: "#88D8A8", colorLight: "#CFFCE0" },
];

function randomPair() {
  return COLOR_PAIRS[Math.floor(Math.random() * COLOR_PAIRS.length)];
}

Page({
  data: {
    day: 1,
    progress: 5,
    targetDays: 28,
    streak: 0,
    quote: "今天先照顾好自己，一口气完成一件小事就很棒。",
    stars: [],
    memoText: "",
    // 飞行星星动画状态
    flyingStar: null,
    lidOpen: false,
    jarFlash: false,
    isAnimating: false
  },

  onLoad() {
    this.initStars();
  },

  onShow() {
    this.loadDay();
  },

  initStars() {
    // 优先从本地缓存加载（保留用户积累的星星）
    const saved = wx.getStorageSync("jarStars");
    if (saved && saved.length) {
      this.setData({ stars: saved });
      return;
    }
    const sizes = [26, 30, 34, 38, 42];
    const count = 8 + Math.floor(Math.random() * 3);
    const stars = [];
    for (let i = 0; i < count; i++) {
      const pair = randomPair();
      stars.push({
        x: 20 + Math.random() * 60,
        y: 12 + Math.random() * 70,
        color: pair.color,
        colorLight: pair.colorLight,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        delay: Math.random() * 2.2
      });
    }
    this.setData({ stars });
    wx.setStorageSync("jarStars", stars);
  },

  // ——— 核心：折星星入瓶动画 ———
  foldStar() {
    const { memoText, isAnimating } = this.data;
    if (isAnimating) return;
    if (!memoText.trim()) {
      wx.showToast({ title: "先写点什么吧~", icon: "none" });
      return;
    }

    this.setData({ isAnimating: true });

    // 获取按钮和瓶身位置
    const query = wx.createSelectorQuery();
    query.select(".checkin-btn").boundingClientRect();
    query.select(".jar-body").boundingClientRect();
    query.exec((rects) => {
      const btnRect = rects[0];
      const jarRect = rects[1];
      if (!btnRect || !jarRect) {
        this.setData({ isAnimating: false });
        return;
      }

      const pair = randomPair();
      const starSize = 40;

      // 起点：按钮正上方居中
      const startX = btnRect.left + btnRect.width / 2 - starSize / 2;
      const startY = btnRect.top - starSize - 4;
      // 终点：瓶身中上部（穿过瓶口落入）
      const endX = jarRect.left + jarRect.width / 2 - starSize / 2;
      const endY = jarRect.top + jarRect.height * 0.3 - starSize / 2;

      // ① 在按钮上方生成星星
      this.setData({
        flyingStar: {
          visible: true,
          flying: false,
          color: pair.color,
          colorLight: pair.colorLight,
          left: startX,
          top: startY,
          deltaX: endX - startX,
          deltaY: endY - startY
        }
      });

      // ② 下一帧：星星起飞 + 盖子掀开
      setTimeout(() => {
        this.setData({ "flyingStar.flying": true, lidOpen: true });
      }, 50);

      // ③ 星星到达瓶内：隐藏飞行星 → 瓶内新增一颗 → 闪光
      setTimeout(() => {
        const newStar = {
          x: 15 + Math.random() * 65,
          y: 15 + Math.random() * 65,
          color: pair.color,
          colorLight: pair.colorLight,
          size: 28 + Math.floor(Math.random() * 14),
          delay: Math.random() * 2.2,
          isNew: true  // 标记新星，触发 pop 动画
        };
        const stars = this.data.stars.concat([newStar]);

        this.setData({
          "flyingStar.visible": false,
          jarFlash: true,
          stars,
          memoText: ""
        });

        // 持久化
        wx.setStorageSync("jarStars", stars);
        const memos = wx.getStorageSync("starMemos") || [];
        memos.push({ text: memoText.trim(), color: pair.color, date: new Date().toISOString() });
        wx.setStorageSync("starMemos", memos);
      }, 750);

      // ④ 盖子合上
      setTimeout(() => {
        this.setData({ lidOpen: false });
      }, 1050);

      // ⑤ 闪光消失，解锁
      setTimeout(() => {
        this.setData({ jarFlash: false, isAnimating: false, flyingStar: null });
        // 去掉新星标记（停止 pop 动画，恢复常态）
        const stars = this.data.stars.map(s => {
          if (s.isNew) { s.isNew = false; }
          return s;
        });
        this.setData({ stars });
      }, 1300);
    });
  },

  loadDay() {
    const checkins = wx.getStorageSync("checkins") || [];
    const targetDays = this.data.targetDays;
    const day = Math.min(checkins.length + 1, targetDays);

    let streak = 0;
    if (checkins.length > 0) {
      const sortedDates = checkins.map(c => c.date).sort().reverse();
      const today = new Date();
      for (let i = 0; i < sortedDates.length; i++) {
        const expected = new Date(today);
        expected.setDate(today.getDate() - i);
        const expectedStr = expected.toISOString().split("T")[0];
        if (sortedDates[i] === expectedStr) {
          streak++;
        } else {
          break;
        }
      }
    }

    this.setData({
      day,
      streak,
      progress: Math.round((day / targetDays) * 100)
    });

    const summary = wx.getStorageSync("storySummary");
    if (summary) {
      const { scene, hardest_moment, reason } = summary;
      let quote = "今天先照顾好自己，一口气完成一件小事就很棒。";

      if (scene && scene.includes("分手后")) {
        quote = hardest_moment ? `记得那天：${hardest_moment.substring(0, 15)}...但今天你已经进步了` : "每过一天，你就更接近更好的自己";
      } else if (scene && scene.includes("分手中")) {
        quote = reason ? `你说原因是：${reason.substring(0, 15)}...给自己一些时间想清楚` : "无论最终如何，你都值得被认真对待";
      } else if (scene && scene.includes("摇摆期")) {
        quote = "想清楚最重要，不要着急做决定";
      }

      this.setData({ quote });
    }
  },

  onInput(e) {
    this.setData({ memoText: e.detail.value });
  },

  goCheckin() {
    wx.navigateTo({ url: "/pages/memo/index?mode=checkin" });
  }
});
