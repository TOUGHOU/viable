# Vibe Coding 项目规范 (Spec)

本文档描述本 monorepo 的通用规范，供人工与 AI Agent 共同遵循。开发各包（尤其是 `packages/web`）时建议先对齐本文档与各包下的 SPEC/README。

## 1. 仓库结构

- **packages/web**：前端应用（React + Vite + Tailwind + shadcn/ui + Zustand + SWR）
- **packages/service**：后端服务（NestJS + Prisma + PostgreSQL）
- **packages/cli**：命令行工具
- **packages/utils/inspector**：公共库（Vite lib）

## 2. 通用约定

- **Node** >= 18，**pnpm** >= 8
- 根目录执行：`pnpm lint`、`pnpm format` 通过后再提交
- 各子包继承根目录的 ESLint、Prettier 配置

## 3. 代码风格

- **命名**：变量/函数 camelCase，类/类型 PascalCase，常量 UPPER_SNAKE_CASE
- **文件头**：TS 文件建议包含 `@file`、`@author`、可选 `@description`
- **注释**：复杂逻辑用 JSDoc 或行内注释，保持简洁、可被 Agent 理解

## 4. Web 包 (packages/web) 特别约定

- 组件：函数式组件 + Hooks，Props 用 TypeScript 接口
- 状态：全局/跨组件用 Zustand，服务端数据用 SWR
- UI：Tailwind + shadcn/ui（`@/components/ui`），避免内联样式
- 新功能开发流程建议：**先写 SPEC/需求要点 → 再实现 → 用 Agent 做代码生成/审查时引用本 spec 与 AGENTS.md**

## 5. 与 AI / Agent 协作

- 仓库内 `.agents/skills/vercel-react-best-practices/AGENTS.md` 为 React/Next 性能与最佳实践，写或改 React 代码时 Agent 会参考
- 根目录本文件 `spec.md` 与各包下的 `SPEC.md` 作为「规格与约定」输入，便于 Agent 生成符合项目风格的代码
- 在 Cursor 中开发时，`.cursor/rules/` 下的规则会在匹配文件（如 `packages/web/**/*.tsx`）下自动应用

## 6. 参考

- 运行方式与脚本：见 [README.md](./README.md)
- Web 包功能规格与 Agentic 实践：见 [packages/web/SPEC.md](./packages/web/SPEC.md)
