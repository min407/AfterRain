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
    // 收集的所有答案
    answers: {}
  },

  questions: [
    {
      question: "你现在和TA的关系是？",
      type: "choice",
      options: ["已经分手（分手后）", "我们在谈/刚谈分手（分手中）", "我一直想要不要分（摇摆期）"],
      key: "scene"
    },
    {
      question: "你们在一起多久了？",
      type: "choice",
      options: ["不到3个月", "3个月到1年", "1到3年", "3年以上"],
      key: "duration"
    },
    {
      question: "是谁先开口说分手的？",
      type: "choice",
      options: ["我提的", "TA提的", "我们商量后决定的"],
      key: "initiator"
    },
    {
      question: "大概是因为什么？",
      type: "text",
      placeholder: "可以说一下原因，不用很详细...",
      key: "reason"
    },
    {
      question: "最让你反复回想的是哪件事？",
      type: "text",
      placeholder: "那件事是什么样的？",
      key: "hardest_moment"
    },
    {
      question: "你现在最常冒出来的念头是？",
      type: "text",
      placeholder: "比如：想联系TA、我是不是哪里不够好...",
      key: "current_thoughts"
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
      currentQ: q.question,
      currentType: q.type,
      currentOptions: q.options || [],
      placeholder: q.placeholder || "",
      textAnswer: "",
      progress: Math.round((currentIndex / questions.length) * 100)
    });
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
    const { scene, duration, initiator, reason, hardest_moment, current_thoughts } = answers;
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