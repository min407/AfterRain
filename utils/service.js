// AI 对话服务 - 基于 OpenRouter Claude API
const OPENROUTER_API_KEY = "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";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

/**
 * 构建 System Prompt
 * 根据用户场景和故事档案定制AI人设
 */
function buildSystemPrompt(story, mode) {
  const { scene, duration, initiator, reason, hardest_moment, current_thoughts } = story || {};

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
    modeInstruction = "【清醒模式】用户现在想联系TA，你要帮用户保持理性，回想分手的原因和最难熬的时刻，提醒用户不要冲动。";
  } else if (mode === "reflect") {
    modeInstruction = "【复盘模式】用户想分析这段关系，你要用结构化提问帮用户梳理关系模式，不要直接给答案。";
  } else {
    modeInstruction = "【陪伴模式】用户只是想倾诉，你要温柔倾听，先共情，不要急着给建议。";
  }

  return `你是"失恋晴天"——用户的清醒好友。你了解她的完整故事：

【用户故事档案】
- 场景：${sceneDesc || "待了解"}
- 关系时长：${duration || "待了解"}
- 分手发起方：${initiator || "待了解"}
- 分手原因：${reason || "待了解"}
- 最难熬的事：${hardest_moment || "待了解"}
- 当前主要念头：${current_thoughts || "待了解"}

【回应原则】
1. 永远先认情绪，再说其他
2. 每次回应必须引用用户故事中的至少1个具体细节
3. 绝对不说泛化套话："这很正常"、"给自己时间"、"你值得更好的"
4. ${modeInstruction}
5. 每次最多问1个问题
6. 语气：像懂你的朋友，不是心理咨询师，不是机器人
7. 回复控制在100字以内，简短有力`;
}

/**
 * 聊天接口
 * @param {Object} payload
 * @param {string} payload.mode - 模式：calm/reflect/companionship
 * @param {Object} payload.story - 用户故事档案
 * @param {string} payload.content - 用户输入
 */
export async function chatWithAI(payload) {
  const { mode = "companionship", story = {}, content } = payload;

  const systemPrompt = buildSystemPrompt(story, mode);

  try {
    const response = await wx.request({
      url: OPENROUTER_ENDPOINT,
      method: "POST",
      header: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://失恋晴天.weixin.qq.com",
        "X-Title": "失恋晴天"
      },
      data: {
        model: "anthropic/claude-sonnet-4-20250514",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ],
        max_tokens: 300,
        temperature: 0.7,
        stream: false
      }
    });

    if (response.data && response.data.choices && response.data.choices[0]) {
      return response.data.choices[0].message.content;
    }

    console.error("API响应异常:", response.data);
    return "抱歉，我现在有点累，让我们稍后再聊吧。";

  } catch (error) {
    console.error("AI对话失败:", error);
    return "抱歉，AI暂时不可用，请稍后再试。";
  }
}

/**
 * 流式对话（微信小程序不支持真正的流式，需模拟）
 * 为后续优化保留接口
 */
export async function chatWithAIStream(payload) {
  // 小程序不支持真正的流式输出，使用普通接口
  return chatWithAI(payload);
}

export default {
  chatWithAI,
  chatWithAIStream
};