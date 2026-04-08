// 故事录入页 - 对话式问卷
Page({
  data: {
    currentIndex: 0,
    progress: 0,
    history: [],
    currentQ: "",
    currentType: "",
    currentOptions: [],
    placeholder: "",
    textAnswer: "",
    showTyping: false,
    // 收集的所有答案
    answers: {}
  },

  questions: [
    {
      question: "先告诉我，你们现在的状态，方便我更好陪你：",
      type: "choice",
      options: ["已经分开，我在适应", "在谈分手，心里很乱", "还在犹豫/摇摆"],
      key: "scene"
    },
    {
      question: "这段关系陪了你多久？",
      type: "choice",
      options: ["不到3个月", "3个月-1年", "1-3年", "3年以上"],
      key: "duration"
    },
    {
      question: "是谁先提的分开？",
      type: "choice",
      options: ["我", "TA", "我们一起决定的"],
      key: "initiator"
    },
    {
      question: "此刻最想说的一句话是什么？",
      type: "text",
      placeholder: "随便说，碎碎念也可以…",
      key: "current_thoughts"
    },
    {
      question: "最近最刺痛/放不下的片段是哪一个？",
      type: "text",
      placeholder: "哪怕只是一句话、一幕画面",
      key: "hardest_moment"
    },
    {
      question: "现在更想让我做什么？",
      type: "choice",
      options: ["听你倾诉就好", "帮忙理一理想法", "给一点建议", "还不确定"],
      key: "need"
    }
  ],

  onLoad() {
    this.showCurrentQuestion();
  },

  showCurrentQuestion() {
    const { currentIndex } = this.data;
    const questions = this.questions;
    if (currentIndex >= questions.length) {
      this.finishStory();
      return;
    }
    const q = questions[currentIndex];
    this.setData({
      showTyping: true,
      currentQ: "",
      currentType: "",
      currentOptions: [],
      placeholder: "",
      textAnswer: "",
      progress: Math.round((currentIndex / questions.length) * 100)
    });
    setTimeout(() => {
      this.setData({
        showTyping: false,
        currentQ: q.question,
        currentType: q.type,
        currentOptions: q.options || [],
        placeholder: q.placeholder || ""
      });
    }, 700);
  },

  selectOption(e) {
    const value = e.currentTarget.dataset.value;
    const { currentIndex, answers, history } = this.data;
    const questions = this.questions;
    const q = questions[currentIndex];

    const newHistory = [...history, { question: q.question, answer: value }];
    answers[q.key] = value;

    this.setData({
      history: newHistory,
      answers,
      currentIndex: currentIndex + 1
    });

    this.showCurrentQuestion();
  },

  onTextInput(e) {
    this.setData({ textAnswer: e.detail.value });
  },

  submitText() {
    const { textAnswer, currentIndex, answers, history } = this.data;
    const questions = this.questions;
    if (!textAnswer.trim()) return;

    const q = questions[currentIndex];
    const newHistory = [...history, { question: q.question, answer: textAnswer }];
    answers[q.key] = textAnswer;

    this.setData({
      history: newHistory,
      answers,
      currentIndex: currentIndex + 1,
      textAnswer: ""
    });

    this.showCurrentQuestion();
  },

  finishStory() {
    const { answers } = this.data;
    // 生成本地摘要
    const summary = this.generateSummary(answers);
    // 保存到本地
    wx.setStorageSync("storyAnswers", answers);
    wx.setStorageSync("storySummary", summary);
    // 跳转到主页（使用switchTab因为主页是tabBar页面）
    wx.switchTab({ url: "/pages/home/index" });
  },

  generateSummary(answers) {
    const { scene, duration, initiator, reason, hardest_moment, current_thoughts, need } = answers;
    let summaryText = "";

    if (scene && scene.includes("分手后")) {
      summaryText = `你们${duration}，是${initiator}提出的分手。你说最难受的是：${hardest_moment ? hardest_moment.substring(0, 20) : "那件事"}...`;
    } else if (scene && scene.includes("分手中")) {
      summaryText = `你们${duration}，正在谈分手。你觉得主要原因是：${reason ? reason.substring(0, 20) : "一些问题"}...`;
    } else {
      summaryText = `你们${duration}，还在犹豫要不要分手。最放不下的是：${hardest_moment ? hardest_moment.substring(0, 20) : "这段感情"}...`;
    }

    return {
      scene,
      duration,
      initiator,
      reason,
      hardest_moment,
      current_thoughts,
      summary: summaryText,
      created_at: new Date().toISOString()
    };
  }
});
