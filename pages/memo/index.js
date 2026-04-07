// 备忘录页面 - 支持打卡模式和备忘录模式
Page({
  data: {
    mode: "memo", // "memo" 或 "checkin"
    // 打卡数据
    day: 1,
    contacted: null, // null/true/false
    mood: null,
    moods: [
      { icon: "😊", label: "不错" },
      { icon: "😐", label: "一般" },
      { icon: "😢", label: "难过" },
      { icon: "😤", label: "愤怒" },
      { icon: "😰", label: "焦虑" }
    ],
    // 备忘录数据
    memos: [],
    isAdding: false,
    newMemo: ""
  },

  onLoad(options) {
    if (options.mode === "checkin") {
      this.setData({ mode: "checkin" });
      this.loadCheckinDay();
    } else {
      this.setData({ mode: "memo" });
      this.loadMemos();
    }
  },

  loadCheckinDay() {
    const checkins = wx.getStorageSync("checkins") || [];
    const day = Math.min(checkins.length + 1, 21);
    this.setData({ day });
  },

  loadMemos() {
    const memos = wx.getStorageSync("memos") || [];
    this.setData({ memos });
  },

  // 打卡相关
  setContacted(e) {
    this.setData({ contacted: e.currentTarget.dataset.value === "true" });
  },

  setMood(e) {
    this.setData({ mood: e.currentTarget.dataset.value });
  },

  submitCheckin() {
    const { day, contacted, mood } = this.data;
    if (contacted === null) {
      wx.showToast({ title: "请选择是否联系TA", icon: "none" });
      return;
    }

    // 保存打卡记录
    const checkins = wx.getStorageSync("checkins") || [];
    const today = new Date().toISOString().split("T")[0];
    checkins.push({
      date: today,
      contacted: contacted,
      mood: mood,
      star_color: this.getRandomStarColor(),
      created_at: new Date().toISOString()
    });
    wx.setStorageSync("checkins", checkins);

    // 首次打卡记录开始日期
    if (!wx.getStorageSync("startDate")) {
      wx.setStorageSync("startDate", new Date().toISOString());
    }

    wx.showToast({ title: "打卡成功", icon: "success" });

    // 打卡后动画效果后返回
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  },

  getRandomStarColor() {
    const colors = ["#FFD700", "#FFB6C1", "#DDA0DD", "#87CEEB", "#98FB98"];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // 备忘录相关
  showAddInput() {
    this.setData({ isAdding: true });
  },

  onNewMemoInput(e) {
    this.setData({ newMemo: e.detail.value });
  },

  addMemo() {
    const text = this.data.newMemo.trim();
    if (!text) return;

    const memos = this.data.memos;
    memos.unshift({
      content: text,
      created_at: this.formatTime(new Date())
    });

    wx.setStorageSync("memos", memos);
    this.setData({
      memos,
      newMemo: "",
      isAdding: false
    });
    wx.showToast({ title: "已添加", icon: "success" });
  },

  deleteMemo(e) {
    const index = e.currentTarget.dataset.index;
    const memos = this.data.memos;
    memos.splice(index, 1);

    wx.setStorageSync("memos", memos);
    this.setData({ memos });
  },

  formatTime(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  }
});