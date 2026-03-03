# Web 包功能规格与 Agentic 实践

本文档说明在开发 `packages/web` 时如何实践 **Spec（规格先行）** 与 **Agentic（AI Agent 协作）**。

---

## 做 Web 开发一定要写 Spec 吗？

**不必每次都写。** 按需求决定：

| 情况 | 建议 |
|------|------|
| 小改动（改样式、文案、单文件小逻辑） | 不用写，直接改代码即可 |
| 原型/一次性实验 | 可不写 |
| **新功能、多文件、多人协作** | 建议写几行「目标 + 验收点」，便于对齐和交给 Agent 实现 |
| **逻辑或交互较复杂** | 写简短规格能减少返工，也方便 Agent 按规格生成/审查 |

**结论**：Spec 是**可选工具**——需要对齐或借 Agent 实现时再写；日常小修小补可以直接写代码。

---

## 一、Spec 实践：先写规格再写代码

### 1. 功能级规格（推荐）

对新功能或较大改动，在实现前写一段简短规格，便于人和 Agent 对齐：

- **位置**：可在本文件下方用「功能名 + 规格」小节，或新建 `packages/web/docs/specs/<feature>.md`
- **内容建议**：
  - **目标**：要解决什么问题、给谁用
  - **范围**：涉及哪些页面/组件/接口
  - **验收点**：可检查的行为或结果（例如：「列表支持分页」「错误时显示 toast」）
  - **约束**：性能、无障碍、与后端约定等

**示例**：

```markdown
## 功能：用户偏好设置

- **目标**：用户可设置主题与语言，刷新后保持。
- **范围**：设置页、Zustand store、localStorage 持久化。
- **验收点**：切换主题/语言立即生效；localStorage 有版本 key；无 hydration 闪烁。
- **约束**：遵循 AGENTS.md 中 localStorage 版本化与 hydration 规则。
```

### 2. 与根目录 spec 的关系

- 根目录 [spec.md](../../spec.md) 描述全仓库通用规范（目录、代码风格、与 Agent 协作）。
- 本文件侧重 **web 包** 的功能规格写法与 Agentic 流程，两者一起用。

---

## 二、Agentic 实践：让 Agent 按规范生成与审查

### 1. 自动生效的上下文

在 Cursor 中编辑 `packages/web` 下文件时：

- **`.cursor/rules/web-package.mdc`** 会按 glob `packages/web/**/*` 自动应用，提供本包技术栈与约定。
- **`.agents/skills/vercel-react-best-practices/AGENTS.md`** 会在涉及 React/性能/数据请求等任务时被 Skill 引用，Agent 会按其中的规则生成或修改代码。

你无需每次说明「用 Zustand」「用 SWR」「不要 barrel 全量导入」等，只要在需求里说明功能目标即可。

### 2. 如何提需求更利于 Agent

- **写清目标**：例如「做一个设置页，可改主题和语言并持久化」而不是只说「做个设置页」。
- **引用规格**：若已在 SPEC 或 `docs/specs/` 写了功能规格，可说「按 SPEC 里『用户偏好设置』实现」。
- **限定范围**：说明「只改 `Settings.tsx` 和 store」可减少无关改动。

### 3. 让 Agent 做代码审查

- 可以说：「按 AGENTS.md 和 spec 检查这段代码，给出修改建议。」
- 或：「检查是否有 waterfall、是否该用 React.cache / SWR、是否有多余 re-render。」

---

## 三、推荐工作流（Spec + Agentic）

1. **写/更新规格**：在本文档或 `docs/specs/<feature>.md` 写功能目标与验收点。
2. **用 Agent 实现**：在 Cursor 中描述需求或引用规格，由 Agent 生成/修改代码（会自动参考 `.cursor/rules` 与 AGENTS.md）。
3. **自检与审查**：跑 `pnpm lint`、`pnpm format`；需要时让 Agent 按 AGENTS.md 做一次性能与模式审查。
4. **迭代**：若实现与预期不符，回头改规格再让 Agent 对齐。

---

## 四、当前功能规格（示例）

以下为示例，可按实际功能增删。

### 占位：首页

- **目标**：展示产品名与入口按钮。
- **范围**：`App.tsx`、`@/components/ui` 的 Button。
- **验收点**：标题「Vibe Coding」、按钮「Get started」可见；无控制台报错。
- **约束**：符合根目录 spec 与 web-package rule 的组件与样式约定。

（后续新功能可在此追加或链接到 `docs/specs/` 下的独立文件。）
