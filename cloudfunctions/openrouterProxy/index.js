// 云函数：代理调用 MiniMax API，避免小程序域名限制
const cloud = require("wx-server-sdk");

cloud.init({ env: "dev-3gwv4qw4b16fe302" });

const MINIMAX_ENDPOINT = "https://api.minimax.chat/v1/text/chatcompletion_v2";
const MODEL_ID = "MiniMax-M2.5";
const MINIMAX_API_KEY = "fc662a434babb407a1bdcc187fd7d2a54da1a075d6dc2faab21973b4d603525e";

// 尝试不同的认证格式
const AUTH_HEADER = "Bearer " + MINIMAX_API_KEY;
console.log("认证头:", AUTH_HEADER.slice(0, 30) + "...");
const REQUEST_TIMEOUT_MS = 20000;

function buildSystemPrompt(story = {}, mode = "companionship") {
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

exports.main = async (event) => {
  const { mode = "companionship", story = {}, content } = event || {};
  if (!content) {
    return { error: "NO_CONTENT" };
  }

  const systemPrompt = buildSystemPrompt(story, mode);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(MINIMAX_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + MINIMAX_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "MiniMax-M2.5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ],
        max_tokens: 200,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    console.log("发送的请求:", {
      url: MINIMAX_ENDPOINT,
      model: "MiniMax-M2.5",
      authKey: MINIMAX_API_KEY.slice(0, 10) + "..."
    });
    clearTimeout(timer);

    const data = await res.json();
    console.log("API响应:", JSON.stringify(data));

    if (data.base_resp?.status_code !== 0) {
      console.error("API错误:", data.base_resp);
      return { error: "API_ERROR", detail: data };
    }

    // 正常返回格式
    return { success: true, reply: data.reply || data.choices?.[0]?.message?.content };
  } catch (err) {
    clearTimeout(timer);
    console.error("MiniMax API error", err.message);
    if (err.name === "AbortError") {
      return { error: "TIMEOUT", detail: "MiniMax request timeout" };
    }
    return { error: "REQUEST_FAILED", detail: err.message };
  }
};
