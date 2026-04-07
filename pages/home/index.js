// 主页 - 罐子+进度+打卡
Page({
  data: {
    day: 1,
    progress: 5,
    streak: 0,
    quote: "今天先照顾好自己，一口气完成一件小事就很棒。",
    stars: []
  },

  onLoad() {
    this.initStars();
  },

  onShow() {
    this.loadDay();
  },

  initStars() {
    const colors = ["#FFD700", "#FFB6C1", "#DDA0DD", "#87CEEB", "#C4B8E8"];
    const sizes = [10, 12, 14, 16, 18];
    const stars = [];
    for (let i = 0; i < 18; i++) {
      stars.push({
        x: 12 + Math.random() * 76,
        y: 10 + Math.random() * 72,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: sizes[Math.floor(Math.random() * sizes.length)],
        delay: Math.random() * 2.5
      });
    }
    this.setData({ stars });
  },

  loadDay() {
    const checkins = wx.getStorageSync("checkins") || [];
    const day = Math.min(checkins.length + 1, 21);

    // 计算连续打卡天数
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
      progress: Math.round((day / 21) * 100)
    });

    // 加载AI寄语
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

  goCheckin() {
    wx.navigateTo({ url: "/pages/memo/index?mode=checkin" });
  }
});