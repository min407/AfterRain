// AI 对话服务 - 基于 MiniMax API
// 注意：生产环境请将密钥移入云函数或环境变量，避免明文暴露
const MINI_MAX_API_KEY = "sk-cp-sFUNQqp2fLkOjmX2mp-bi8fTXu3rFZn5MOGkA2uTZfr585xkp3pxQYVJZuRZplyJUX4qHZc9VlpyTkiAP7PWu4-VP_7MkibIz6zPCitjb7MxtY9FWiw5N-s";
const MINI_MAX_ENDPOINT = "https://api.minimax.chat/v1/text/chatcompletion_v2";
const MODEL_NAME = "MiniMax-M2.5";

// 兜底开关：仅在请求失败时返回本地离线回复，正常情况下始终走真实模型
const USE_LOCAL_FALLBACK_ON_ERROR = true;

// 将 wx.request Promise 化
const wxRequest = (opts) =>
  new Promise((resolve, reject) => {
    wx.request({
      ...opts,
      success: resolve,
      fail: reject,
    });
  });

// 本地兜底回复，避免网络失败时出现空白体验
function localFallbackReply({ content, story, mode }) {
  const name = mode === "calm" ? "清醒" : mode === "reflect" ? "复盘" : "陪伴";
  const detail = story?.hardest_moment || story?.current_thoughts || "你刚刚的分享";
  const nudge = mode === "calm"
    ? "先别急着联系，对自己好一点。深呼吸，再去做一件让你踏实的小事。"
    : mode === "reflect"
    ? "把让你反复想起的瞬间写下来，分开【事实/感受/担心】三个栏，等会儿我们再一起看。"
    : "我会在这里，先喝口水，打几个字记录下此刻的情绪。";
  return `(${name}·离线回复) 我看到了：${detail}。${nudge}`;
}

/**
 * 构建 System Prompt
 * 根据用户场景和故事档案定制AI人设
 */
function buildSystemPrompt(story, mode) {
  const {
    scene,
    duration,
    initiator,
    reason,
    hardest_moment,
    current_thoughts,
    need,
  } = story || {};

  let sceneDesc = "";
  if (scene && scene.includes("分手后")) {
    sceneDesc = "用户已经和TA分手，正在努力走出来";
  } else if (scene && scene.includes("分手中")) {
    sceneDesc = "用户正在谈分手或刚谈完分手";
  } else if (scene && scene.includes("摇摆期")) {
    sceneDesc = "用户还在犹豫要不要分手";
  }

  let modeInstruction = "";
  if (mode === "calm") {
    modeInstruction = "【清醒模式】用户想冲动联系TA，你要帮她稳住，提醒分手/矛盾的原因，提供可执行的小步行动(如先散步/写下想说的话不发送)。";
  } else if (mode === "reflect") {
    modeInstruction = "【复盘模式】用结构化提问帮助梳理关系模式：事实-感受-需求-界限，避免直接给结论，鼓励自我洞察。";
  } else {
    modeInstruction = "【陪伴模式】主要是共情与情绪容纳，先反馈听到的情绪，再给温柔陪伴，不着急给建议。";
  }

  return `你是用户最贴心的好朋友，名字叫"晴天"。你正在和一个刚经历失恋的朋友聊天。

【绝对禁止】
- 绝对不要输出你的思考过程、分析步骤、角色说明
- 绝对不要说"让我理解一下""我的角色是""我需要"这类话
- 绝对不要用第三人称描述用户（如"用户说""她表示"）
- 直接用"你"称呼对方，用"我"称呼自己，像朋友聊天一样

【你知道的关于TA的故事】
- 场景：${sceneDesc || "还不太了解"}
- 在一起多久：${duration || "还不太了解"}
- 谁提的分手：${initiator || "还不太了解"}
- 分手原因：${reason || "还不太了解"}
- 最难熬的事：${hardest_moment || "还不太了解"}
- 现在脑子里想的：${current_thoughts || "还不太了解"}
- 现在最需要的：${need || "还不太了解"}

【聊天风格】
1. 先接住对方的情绪，再聊别的。用对方说过的具体细节来回应。
2. 像闺蜜/好哥们一样说话，温暖但不矫情，不说"一切都会好的"这种空话。
3. 可以给一个小建议（比如先深呼吸、写下来但不发），但不要说教。
4. 每次最多问一个问题，别追问太多。
5. 简短有力，控制在80字以内。
6. ${modeInstruction}
`;
}

/**
 * 聊天接口
 */
async function chatWithAI(payload) {
  const { mode = "companionship", story = {}, content } = payload;

  const systemPrompt = buildSystemPrompt(story, mode);

  // 优先走云函数（避免域名白名单限制）
  if (wx && wx.cloud) {
    try {
      const cloudRes = await wx.cloud.callFunction({
        name: "openrouterProxy",
        data: { mode, story, content },
        timeout: 25000
      });
      const data = cloudRes?.result;
      console.log("CloudFn result:", JSON.stringify(data).slice(0, 300));

      // 兼容多种成功格式:
      // { success: true, reply: "..." }
      // { base_resp: { status_code: 0 }, reply: "..." }
      // { choices: [{ message: { content: "..." } }] }
      if (data) {
        if (data.reply) {
          // 格式1: { reply: "..." } 或 { success: true, reply: "..." }
          // 格式2: { base_resp: { status_code: 0 }, reply: "..." }
          if (data.success !== false && data.base_resp?.status_code === 0) {
            return data.reply;
          }
          if (data.success === true && data.reply) {
            return data.reply;
          }
        }
        // 格式3: OpenAI 格式
        if (data.choices && data.choices[0]?.message?.content) {
          return data.choices[0].message.content;
        }
        // 错误情况
        if (data.error || data.base_resp?.status_code !== 0) {
          console.error("CloudFn错误:", data);
          if (data.error === "TIMEOUT" || data.base_resp?.status_msg?.includes("timeout")) {
            return "这边等得有点久，先缓一缓。";
          }
          if (data.error === "OVERLOADED") {
            return "晴天正在休息，稍后再来找她吧~";
          }
        }
      }
      if (USE_LOCAL_FALLBACK_ON_ERROR) {
        return localFallbackReply({ content, story, mode });
      }
    } catch (err) {
      console.error("调用云函数失败:", err);
      if (USE_LOCAL_FALLBACK_ON_ERROR) {
        return localFallbackReply({ content, story, mode });
      }
    }
  }

  // 兜底：直接请求（需要配域名白名单）
  try {
    const response = await wxRequest({
      url: MINI_MAX_ENDPOINT,
      method: "POST",
      header: {
        "Authorization": `Bearer ${MINI_MAX_API_KEY}`,
        "Content-Type": "application/json"
      },
      data: {
        model: MODEL_NAME,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ],
        max_tokens: 300,
        temperature: 0.7
      }
    });

    const { statusCode, data } = response || {};
    // MiniMax API 返回格式: { code: 0, success: true, reply: "...", ... }
    if (statusCode === 200 && data && data.success && data.reply) {
      return data.reply;
    }

    console.error("AI响应异常:", statusCode, data);
    if (USE_LOCAL_FALLBACK_ON_ERROR) {
      return localFallbackReply({ content, story, mode });
    }
    return "抱歉，我现在有点累，让我们稍后再聊吧。";

  } catch (error) {
    console.error("AI对话失败:", error);
    if (USE_LOCAL_FALLBACK_ON_ERROR) {
      return localFallbackReply({ content, story, mode });
    }
    return "抱歉，AI暂时不可用，请稍后再试。";
  }
}

/**
 * 流式对话（微信小程序不支持真正的流式，需模拟）
 */
async function chatWithAIStream(payload) {
  return chatWithAI(payload);
}

module.exports = {
  chatWithAI,
  chatWithAIStream
};