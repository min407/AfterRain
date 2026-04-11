// 隐私协议页
Page({
  data: {
    updateDate: "2026-04-12",
    developer: "刘志敏",
    contactEmail: "Liuzmid@gmail.com"
  },

  // 复制邮箱
  copyEmail() {
    wx.setClipboardData({
      data: this.data.contactEmail,
      success: () => {
        wx.showToast({ title: "邮箱已复制", icon: "success" });
      }
    });
  }
});
