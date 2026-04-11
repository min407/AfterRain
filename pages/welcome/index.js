Page({
  data: {
    agreed: false
  },

  onLoad() {
    // 读取上次是否已同意协议（同意过就默认勾选）
    const agreed = wx.getStorageSync("privacyAgreed") === true;
    this.setData({ agreed });
  },

  toggleAgree() {
    const agreed = !this.data.agreed;
    this.setData({ agreed });
    if (agreed) {
      wx.setStorageSync("privacyAgreed", true);
      wx.setStorageSync("privacyAgreedAt", Date.now());
    } else {
      wx.removeStorageSync("privacyAgreed");
    }
  },

  openPrivacy() {
    wx.navigateTo({ url: "/pages/privacy/index" });
  },

  goHome() {
    if (!this.data.agreed) {
      wx.showToast({
        title: "请先阅读并同意《用户隐私协议》",
        icon: "none",
        duration: 2000
      });
      return;
    }
    wx.switchTab({ url: "/pages/home/index" });
  }
});
