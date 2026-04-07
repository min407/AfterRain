# 失恋晴天 · 微信小程序（MVP）

状态：v1.1 文档版，代码骨架初始。

## 结构
- `app.json`：页面与 tabBar 配置（首页/聊一聊/备忘/我的；欢迎页与故事录入不在 tab）
- `pages/`：welcome、story、home、chat、memo、mine
- `utils/service.js`：AI 调用占位，后续接 OpenRouter + Claude

## 下一步开发
1. 接入云开发：初始化环境、集合 users/stories/checkins/memos/conversations。
2. OpenRouter 云函数：封装 Claude haiku，加入速率/成本限制与降级。
3. 打卡页与动画：home 页按钮跳到打卡（当前临时指向 memo）。
4. 真实 AI 对话：chat 页调用云函数，按 mode 注入故事摘要与 system prompt。
5. 广告位：封面/激励接入与频控。
