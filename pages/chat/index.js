// AI对话页 - 3种模式 + 对话界面 + AI接入
const { chatWithAI } = require("../../utils/service");

Page({
  data: {
    hasStory: false,
    selectedMode: "",
    isChatting: false,
    modeText: "",
    welcomeMsg: "",
    messages: [],
    input: "",
    scrollIntoView: "",
    isLoading: false,
    modeDescriptions: {
      calm: {
        text: "清醒模式",
        welcome: "我在这里，先陪你稳住情绪。告诉我，此刻最想冲动去做的事是什么？"
      },
      reflect: {
        text: "复盘模式",
        welcome: "一起梳理：先说一件让你反复想起的事，我帮你分清事实与感受。"
      },
      companionship: {
        text: "陪伴模式",
        welcome: "我会安静听你说。今天最堵心的点是什么？可以慢慢讲。"
      }
    }
  },

  onLoad() {
    const story = wx.getStorageSync("storySummary");
    this.setData({ hasStory: !!story });
  },

  useMode(e) {
    if (!this.data.hasStory) {
      wx.showModal({
        title: "先讲讲你们的故事",
        content: "AI 需要了解你的故事，才能真正理解你，而不是说套话。只需 2 分钟~",
        confirmText: "去填写",
        cancelText: "稍后",
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({ url: "/pages/story/index" });
          }
        }
      });
      return;
    }
    const mode = e.currentTarget.dataset.mode;
    const desc = this.data.modeDescriptions[mode];
    this.setData({
      selectedMode: mode,
      modeText: desc.text,
      welcomeMsg: desc.welcome
    });
  },

  startChat() {
    if (!this.data.selectedMode) {
      wx.showToast({ title: "请先选择一个话题", icon: "none" });
      return;
    }
    this.setData({ isChatting: true });
    this.addMessage("ai", this.data.welcomeMsg);
  },

  closeChat() {
    this.setData({
      isChatting: false,
      messages: [],
      input: "",
      selectedMode: ""
    });
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  addMessage(from, text) {
    const messages = this.data.messages.concat([{ from, text }]);
    this.setData({
      messages,
      scrollIntoView: `msg-${messages.length - 1}`
    });
    setTimeout(() => {
      this.setData({ scrollIntoView: "bottom" });
    }, 100);
  },

  async send() {
    const content = this.data.input.trim();
    if (!content) return;

    this.addMessage("user", content);
    this.setData({ input: "", isLoading: true });

    try {
      const story = wx.getStorageSync("storySummary") || {};
      const reply = await chatWithAI({
        mode: this.data.selectedMode,
        story,
        content
      });
      this.addMessage("ai", reply);
    } catch (error) {
      console.error("AI对话错误:", error);
      this.addMessage("ai", "抱歉，我现在有点累，让我们稍后再聊吧。");
      wx.showToast({ title: "AI暂时不可用", icon: "none" });
    } finally {
      this.setData({ isLoading: false });
    }
  }
});