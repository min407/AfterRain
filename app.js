// 上线后不再注入任何模拟数据；如需演示/截图，可临时 require 并手动调用 seedMockIfNeeded
// const { seedMockIfNeeded } = require("./utils/mock");

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
    // seedMockIfNeeded(); // 已停用：上线版本必须是干净初始状态

    // 一次性清洗历史 mock 残留数据（每个用户只执行一次，不会影响真实打卡）
    if (!wx.getStorageSync("cleanedMockV1")) {
      [
        "checkins",
        "storySummary",
        "storyAnswers",
        "memos",
        "starMemos",
        "jarStars",
        "startDate",
        "firstOpenDate"
      ].forEach((k) => wx.removeStorageSync(k));
      wx.setStorageSync("cleanedMockV1", true);
      console.log("[cleanup] 已清除历史 mock 残留");
    }
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
