# AI 翻译助手 (Chrome Translation Extension)

Chrome 扩展程序，调用 OpenAI 兼容的 Chat Completions API 实现翻译功能。支持划词翻译、弹窗翻译和全页面翻译。

## 1. Getting Started

### Prerequisites
- **Runtime**: Chrome / Edge 浏览器（支持 Manifest V3）
- **外部依赖**: 一个 OpenAI 兼容的 Chat Completions API 端点（如 OpenAI、DeepSeek、或其他兼容服务）

### Environment Setup
1. 在 Chrome 中打开 `chrome://extensions/`
2. 开启 **开发者模式** (Developer mode)
3. 点击 **加载已解压的扩展程序** (Load unpacked)，选择当前项目所在目录
4. 右键扩展图标 → **选项**，配置 API 地址、API Key、默认模型

### Test
- 暂无自动化测试。测试方式为手动加载扩展后验证三个功能：
  - 弹窗翻译：点击扩展图标，输入文本
  - 划词翻译：在任意页面选中文本，点击浮出的"翻译"按钮
  - 全页面翻译：右键页面空白处 → "翻译本页"

---

## 2. Project Layout

```text
[root]/
├── manifest.json                     — 扩展清单（权限、入口、资源声明）
├── lib/                              — 共享模块
│   ├── api.js                        — API 调用 + 语言列表
│   ├── storage.js                    — chrome.storage 读写封装
│   └── prompts.js                    — 翻译提示词模板与渲染
├── background/
│   └── service-worker.js             — Service Worker：右键菜单 + API 代理
├── content/
│   ├── content.js                    — 内容脚本：划词翻译 + 全页面翻译
│   └── content.css                   — 浮动按钮、弹窗、进度条样式
├── popup/
│   ├── popup.html / popup.js / popup.css — 扩展弹窗翻译界面
├── options/
│   ├── options.html / options.js / options.css — 设置页面
├── icons/                            — 扩展图标 (16/32/48/128px)
└── _locales/zh_CN/
    └── messages.json                 — 中文本地化
```

- `lib/` 存放被多个入口复用的逻辑：API 调用、存储读写、提示词渲染
- `background/` 是扩展的 Service Worker，负责右键菜单注册和跨源 API 代理（content script 受 CORS 限制，通过消息传递到此处调用 API）
- `content/` 注入到每个页面，处理划词翻译和全页面翻译的 DOM 操作
- `popup/` 和 `options/` 是独立的扩展页面

---

## 3. Architecture & Code Conventions

### 模块依赖图
```
options.js ──► storage.js
popup.js   ──► storage.js, api.js ──► prompts.js
service-worker.js ──► storage.js, api.js ──► prompts.js
content.js ──(chrome.runtime.sendMessage)──► service-worker.js
```

### 消息传递协议
Content script 不直接调用 API（受页面 CORS 限制），而是通过 `chrome.runtime.sendMessage` 与 Service Worker 通信：

| Action | 方向 | 用途 |
|---|---|---|
| `translate` | content → background | 请求翻译一段文本 |
| `getConfig` | content → background | 获取当前配置 |
| `translatePage` | background → content | 触发全页面翻译 |

### 核心约定
- **ES Modules**: Service Worker、popup.js、options.js 均使用 `import` / `export`（manifest 中 `"type": "module"`）
- **Content Script**: 使用 IIFE 包裹，避免污染页面全局作用域
- **Storage**: 配置通过 `chrome.storage.sync` 持久化，`getConfig()` / `saveConfig()` 统一读写
- **提示词模板**: 支持 `{{sourceLabel}}` `{{targetLabel}}` `{{sourceLang}}` `{{targetLang}}` 四个占位符；用户留空则使用内置默认模板

### Error Handling
- API 层抛出中文错误信息，直接展示给用户
- Popup 中的 AbortController 用于取消 debounce 期间的前一个请求
- Content script 的单个文本节点翻译失败不会阻塞整页翻译

---

<!-- 以下章节暂不适用，保留模板以备后续

## 4. Review & Landing Pipeline

### Before Submitting a PR
1. All automated tests pass locally.
2. Code passes local formatting, linting, and type-checking gates.
3. **Verification**: Verify your test actually fails if you revert your core logic fix.

### Branching & PR Naming
- **Convention**: `e.g., feature/issue-num-short-description, bugfix/*, or conventional commit prefixes`.

---

## 5. Continuous Integration (CI)

- **CI Dashboard**: [Link to GitHub Actions / GitLab CI / Jenkins]
- **Local CI Emulation (Optional)**: `[Command to run CI pipeline locally, if using tools like act or local runners]`.

---

## 6. Key Rules

1. **Don't commit untested code.** If you didn't run the tests, it doesn't work.
2. **Don't overstate.** Be honest about what was done and what actually works. Document limitations.
3. **Read before you write.** Understand why the existing code made the choices it did before changing them.
4. **Fix the root cause, not the symptom.** Don't take a bug report's or AI's suggested quick-fix at face value — verify it addresses the right architectural layer.

-->
