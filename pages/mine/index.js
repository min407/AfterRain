// 我的页面 - 故事档案 + 打卡日历 + 设置
Page({
  data: {
    days: 0,
    story: null,
    currentMonth: "",
    calendarDays: [],
    checkinCount: 0,
    streak: 0
  },

  onShow() {
    this.loadUserData();
    this.loadStory();
    this.loadCalendar();
  },

  loadUserData() {
    const checkins = wx.getStorageSync("checkins") || [];
    const days = checkins.length;
    this.setData({ days });
  },

  loadStory() {
    const story = wx.getStorageSync("storySummary");
    this.setData({ story });
  },

  loadCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const currentMonth = `${year}年${month + 1}月`;
    this.setData({ currentMonth });

    // 获取当月天数
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    // 获取打卡记录
    const checkins = wx.getStorageSync("checkins") || [];
    const checkinDates = checkins.map(c => c.date);
    const today = new Date().toISOString().split("T")[0];

    // 生成日历数据
    const calendarDays = [];
    // 填充空白
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ day: "", checkin: false });
    }
    // 填充日期
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      calendarDays.push({
        day: d,
        checkin: checkinDates.includes(dateStr),
        today: dateStr === today
      });
    }

    // 统计本月打卡和连续天数
    const checkinCount = calendarDays.filter(c => c.checkin).length;
    let streak = 0;
    // 计算连续天数（从今天往前数）
    for (let i = calendarDays.length - 1; i >= 0; i--) {
      if (calendarDays[i].checkin) {
        streak++;
      } else if (calendarDays[i].day) {
        break;
      }
    }

    this.setData({
      calendarDays,
      checkinCount,
      streak
    });
  },

  prevMonth() {
    this.changeMonth(-1);
  },

  nextMonth() {
    this.changeMonth(1);
  },

  changeMonth(delta) {
    const now = new Date();
    const currentMonth = this.data.currentMonth;
    const [year, month] = currentMonth.match(/(\d+)年(\d+)月/).slice(1).map(Number);
    const newDate = new Date(year, month - 1 + delta);
    const newMonth = `${newDate.getFullYear()}年${newDate.getMonth() + 1}月`;
    this.setData({ currentMonth: newMonth });

    // 重新生成日历（简化版：复用当月数据）
    const yearNow = newDate.getFullYear();
    const monthNow = newDate.getMonth();
    const daysInMonth = new Date(yearNow, monthNow + 1, 0).getDate();
    const firstDay = new Date(yearNow, monthNow, 1).getDay();

    const checkins = wx.getStorageSync("checkins") || [];
    const checkinDates = checkins.map(c => c.date);

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) {
      calendarDays.push({ day: "", checkin: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${yearNow}-${String(monthNow + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      calendarDays.push({
        day: d,
        checkin: checkinDates.includes(dateStr),
        today: false
      });
    }

    this.setData({ calendarDays });
  },

  editStory() {
    wx.navigateTo({ url: "/pages/story/index" });
  },

  clearData() {
    wx.showModal({
      title: "确认清空",
      content: "将清空所有故事、打卡、备忘录数据，是否确定？",
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.setData({
            story: null,
            days: 0,
            checkinCount: 0,
            streak: 0
          });
          wx.showToast({ title: "已清空", icon: "none" });
        }
      }
    });
  }
});