// AI对话页 - 3种模式 + 对话界面 + Claude API接入
import { chatWithAI } from "../../utils/service";

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
        welcome: "好的，慢慢说。我在听。"
      },
      reflect: {
        text: "复盘模式",
        welcome: "想聊什么都可以，我来帮你梳理。"
      },
      companionship: {
        text: "陪伴模式",
        welcome: "我在这里，想说就说吧。"
      }
    }
  },

  onLoad() {
    // 检查是否有故事档案，没有则在聊天入口页显示引导
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
    // 添加欢迎消息
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
    // 滚动到底部
    setTimeout(() => {
      this.setData({ scrollIntoView: "bottom" });
    }, 100);
  },

  async send() {
    const content = this.data.input.trim();
    if (!content) return;

    // 添加用户消息
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