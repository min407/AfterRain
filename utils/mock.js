// 开发环境模拟用户数据，便于真机/预览截图
// 默认只在非 release 环境写入；若需要强制保留样例数据，可将 FORCE_MOCK 设为 true
const FORCE_MOCK = true;

function getEnvVersion() {
  try {
    const info = wx.getAccountInfoSync();
    return info?.miniProgram?.envVersion || "release";
  } catch (e) {
    return "release";
  }
}

function setIfEmpty(key, value) {
  const existing = wx.getStorageSync(key);
  const isEmptyObject = typeof existing === "object" && existing !== null && Object.keys(existing).length === 0;
  const isEmptyArray = Array.isArray(existing) && existing.length === 0;
  const isEmptyString = existing === "";
  if (existing === undefined || existing === null || isEmptyObject || isEmptyArray || isEmptyString) {
    wx.setStorageSync(key, value);
  }
}

function buildRecentCheckins(days = 9) {
  const list = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().split("T")[0];
    list.push({
      date: iso,
      contacted: false, // 9天都没联系
      mood: i % 5,
      star_color: randomStarColor(),
      created_at: d.toISOString()
    });
  }
  return list;
}

function randomStarColor() {
  const colors = ["#FFD700", "#FFB6C1", "#DDA0DD", "#87CEEB", "#98FB98", "#FFA07A"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function seedMockIfNeeded() {
  if (!FORCE_MOCK && getEnvVersion() === "release") return;

  // 故事档案
  setIfEmpty("storySummary", {
    scene: "已经分开，我在适应",
    duration: "1-3年",
    initiator: "TA",
    reason: "沟通渐少、价值观不一致",
    hardest_moment: "在地铁站被突然拉黑的那天晚上",
    current_thoughts: "很想发消息，但又怕打扰，脑子反复回放",
    need: "帮忙理一理想法",
    summary: "你们1-3年，TA提出分手。最难受的是在地铁站被拉黑…",
    created_at: new Date().toISOString()
  });

  setIfEmpty("storyAnswers", {
    scene: "已经分开，我在适应",
    duration: "1-3年",
    initiator: "TA",
    reason: "沟通渐少、价值观不一致",
    hardest_moment: "在地铁站被突然拉黑的那天晚上",
    current_thoughts: "很想发消息，但又怕打扰，脑子反复回放",
    need: "帮忙理一理想法"
  });

  // 打卡
  setIfEmpty("checkins", buildRecentCheckins());
  setIfEmpty("startDate", new Date(Date.now() - 9 * 24 * 3600 * 1000).toISOString());

  // 备忘录
  setIfEmpty("memos", [
    { content: "分手不是失败，是一次重新认识自己的机会", created_at: "3月12日" },
    { content: "忍住 48 小时再联系，不要在情绪高点做决定", created_at: "3月10日" },
    { content: "列表：真正快乐的瞬间来自朋友和自我成长", created_at: "3月8日" }
  ]);

  // 星星留言（home 页展示亮度）
  setIfEmpty("starMemos", [
    { text: "今天没忍住想他，但写下来后好多了", color: "#F5A0B0", date: new Date().toISOString() },
    { text: "去跑了 5 公里，累到睡得很沉", color: "#78C8EE", date: new Date(Date.now() - 86400000).toISOString() },
    { text: "删除了相册里旧视频，哭了一会", color: "#B898E8", date: new Date(Date.now() - 2 * 86400000).toISOString() },
    { text: "和朋友吃饭，没有提他，感觉自己进步了", color: "#88D8A8", date: new Date(Date.now() - 3 * 86400000).toISOString() }
  ]);

  // 瓶子里的星星（若为空则由首页随机生成，这里不用强制写入）
}

module.exports = {
  seedMockIfNeeded
};
