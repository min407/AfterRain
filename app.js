const { seedMockIfNeeded } = require("./utils/mock");

App({
  onLaunch() {
    console.log("App launch");
    if (wx.cloud) {
      wx.cloud.init({
        env: "dev-3gwv4qw4b16fe302",
        traceUser: true
      });
    } else {
      console.error("wx.cloud not available, please use base lib >= 2.2.3");
    }
    seedMockIfNeeded();
  },
  globalData: {
    user: null,
    storySummary: null
  },
  // 工具方法：检查是否完成故事录入
  checkStoryComplete() {
    const story = wx.getStorageSync("storySummary");
    return story && story.scene;
  },
  // 获取故事档案
  getStory() {
    return wx.getStorageSync("storySummary") || null;
  }
});
