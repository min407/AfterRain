// 云函数：代理调用 MiniMax API（主） + OpenRouter（备）
const cloud = require("wx-server-sdk");

cloud.init({ env: "dev-3gwv4qw4b16fe302" });

// ── MiniMax ──────────────────────────────────────────────
const MINIMAX_ENDPOINT = "https://api.minimax.chat/v1/text/chatcompletion_v2";
const MINIMAX_API_KEY = "sk-cp-sFUNQqp2fLkOjmX2mp-bi8fTXu3rFZn5MOGkA2uTZfr585xkp3pxQYVJZuRZplyJUX4qHZc9VlpyTkiAP7PWu4-VP_7MkibIz6zPCitjb7MxtY9FWiw5N-s";
const MINIMAX_MODELS = ["MiniMax-M2.7", "MiniMax-M2.5"];

// ── OpenRouter（兜底） ────────────────────────────────────
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = "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";
const OPENROUTER_MODEL = "anthropic/claude-sonnet-4";

const MAX_RETRIES_PER_MODEL = 3;
const REQUEST_TIMEOUT_MS = 20000;

// ── System Prompt ─────────────────────────────────────────
function buildSystemPrompt(story = {}, mode = "companionship") {
  const { scene, duration, initiator, reason, hardest_moment, current_thoughts, need } = story || {};

  let sceneDesc = "";
  if (scene && (scene.includes("分手后") || scene.includes("已经分开"))) {
    sceneDesc = "用户已经和TA分手，正在努力走出来";
  } else if (scene && (scene.includes("分手中") || scene.includes("在谈分手"))) {
    sceneDesc = "用户正在谈分手或刚谈完分手";
  } else if (scene && (scene.includes("摇摆") || scene.includes("犹豫"))) {
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── 解析 MiniMax 响应（兼容 NDJSON 多行格式） ────────────
function parseMinimaxResponse(text) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  const parsed = [];
  for (const line of lines) {
    try { parsed.push(JSON.parse(line)); } catch (e) { /* skip */ }
  }
  if (parsed.length === 0) return { parseError: true };

  for (const d of parsed) {
    const reply = d.reply || d.choices?.[0]?.message?.content;
    if (reply && reply.trim()) return { ok: true, reply: reply.trim() };
  }
  for (const d of parsed) {
    if (d.error?.type === "overloaded_error") return { overloaded: true };
    if (d.base_resp?.status_code !== undefined && d.base_resp.status_code !== 0) {
      return { apiError: true, code: d.base_resp.status_code, msg: d.base_resp.status_msg };
    }
    if (d.error) return { apiError: true, detail: d.error };
  }
  return { unknown: true };
}

// ── 调用 MiniMax ──────────────────────────────────────────
async function requestMinimax(model, systemPrompt, content) {
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
        model,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ],
        max_tokens: 300,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    const text = await res.text();
    console.log(`[MiniMax:${model}] HTTP ${res.status}:`, text.slice(0, 500));
    return parseMinimaxResponse(text);
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") return { timeout: true };
    return { fetchError: err.message };
  }
}

// ── 调用 OpenRouter ───────────────────────────────────────
async function requestOpenRouter(systemPrompt, content) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    console.log("[OpenRouter] 开始调用，model:", OPENROUTER_MODEL);
    const res = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + OPENROUTER_API_KEY,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://miniprogram.weixin.qq.com",
        "X-Title": "失恋晴天"
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content }
        ],
        max_tokens: 300,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    clearTimeout(timer);
    const text = await res.text();
    console.log(`[OpenRouter] HTTP ${res.status}:`, text.slice(0, 500));

    let data;
    try { data = JSON.parse(text); } catch (e) {
      return { parseError: true };
    }

    const reply = data.choices?.[0]?.message?.content;
    if (reply && reply.trim()) return { ok: true, reply: reply.trim() };

    if (data.error) return { apiError: true, detail: data.error };
    return { unknown: true };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === "AbortError") return { timeout: true };
    return { fetchError: err.message };
  }
}

// ── 主入口 ────────────────────────────────────────────────
exports.main = async (event) => {
  const { mode = "companionship", story = {}, content } = event || {};
  if (!content) return { error: "NO_CONTENT" };

  const systemPrompt = buildSystemPrompt(story, mode);

  // 1. 依次尝试 MiniMax 模型
  for (const model of MINIMAX_MODELS) {
    console.log(`===== 尝试 MiniMax 模型: ${model} =====`);
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      const result = await requestMinimax(model, systemPrompt, content);

      if (result.ok) {
        console.log(`MiniMax 成功！model=${model} attempt=${attempt}`);
        return { success: true, reply: result.reply };
      }
      if (result.overloaded) {
        const delay = attempt * 1500;
        console.log(`[${model}] 过载 attempt=${attempt}，等 ${delay}ms...`);
        if (attempt < MAX_RETRIES_PER_MODEL) { await sleep(delay); continue; }
        console.log(`[${model}] 重试耗尽，切换`);
        break;
      }
      // 超时 / 其他错误 → 不重试，直接切下一个
      console.log(`[${model}] 错误:`, JSON.stringify(result).slice(0, 150));
      break;
    }
  }

  // 2. MiniMax 全部失败 → 切 OpenRouter
  console.log("===== MiniMax 不可用，切换至 OpenRouter =====");
  const orResult = await requestOpenRouter(systemPrompt, content);
  if (orResult.ok) {
    console.log("OpenRouter 成功！");
    return { success: true, reply: orResult.reply };
  }

  console.error("OpenRouter 也失败:", JSON.stringify(orResult).slice(0, 200));
  return { error: "ALL_FAILED", detail: orResult };
};
