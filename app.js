App({
  onLaunch() {
    console.log("App launch");
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