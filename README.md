# Vibe Coding

Monorepo for the Vibe Coding product: web app, backend service, CLI, and shared utilities.

## 环境要求

- **Node.js** >= 18
- **pnpm** >= 8

## 安装

```bash
pnpm install
```

## 包结构

| 包                  | 路径                       | 技术栈                                                           | 说明       |
| ------------------- | -------------------------- | ---------------------------------------------------------------- | ---------- |
| **web**             | `packages/web`             | React + TypeScript + Vite + Tailwind + shadcn/ui + Zustand + SWR | 前端应用   |
| **service**         | `packages/service`         | NestJS + PostgreSQL (Prisma)                                     | 后端服务   |
| **cli**             | `packages/cli`             | TypeScript                                                       | 命令行工具 |
| **utils/inspector** | `packages/utils/inspector` | Vite (lib)                                                       | 公共库     |

## 运行方式

### 根目录脚本

- `pnpm dev` - 并行运行各包 dev（若有）
- `pnpm build` - 构建所有包
- `pnpm lint` - 全仓库 ESLint 检查
- `pnpm format` - Prettier 格式化
- `pnpm format:check` - 仅检查格式

### 按包运行

```bash
# 前端开发
pnpm --filter @vibe/web dev

# 后端开发（需配置 .env 中的 DATABASE_URL）
pnpm --filter @vibe/service start:dev

# 构建 inspector 并供 web 引用
pnpm --filter @jd/vibe-inspector-plugin build

# 运行 CLI
pnpm --filter @vibe/cli build && node packages/cli/dist/cli.js --version
```

### 单独在子包内执行

进入对应包目录后执行相同命令即可，例如：

```bash
cd packages/web && pnpm dev
cd packages/service && pnpm start:dev
cd packages/utils/inspector && pnpm build
cd packages/cli && pnpm build && node dist/cli.js --version
```

## 代码规范

- 提交前建议执行：`pnpm lint`、`pnpm format`
- ESLint 与 Prettier 配置在仓库根目录，各子包继承

## 规范说明

详见 [spec.md](./spec.md)。
