# Vibe Coding 大模型对话前后端技术方案

## 一、概述

### 1.1 目标

- **后端 (packages/service)**：提供大模型对话相关的基础 API，支持会话管理、消息发送与流式/非流式回复；**本期不与数据库关联，采用本地文件持久化存储**，数据落盘、重启不丢失，后续可平滑切换为 DB。
- **前端 (packages/web)**：在现有对话 UI（`conversationPanel`、`chatStore`）基础上，接入后端 API，实现「用户发消息 → 调用大模型 → 展示助手回复」的完整闭环。

### 1.2 范围

| 模块 | 本期范围 | 不在本期 |
|------|----------|----------|
| Service | 会话/消息 CRUD、对话补全（含流式）、本地存储 | 数据库、用户体系、计费、多模型路由 |
| Web | 调用 Service API、展示流式/非流式回复、错误与加载态 | 多模型选择、密钥配置 UI、历史同步到服务端 |

### 1.3 技术栈（现状）

- **Service**：NestJS 10、Node 18+、TypeScript；**存储**：本地文件持久化（见 2.2）。
- **Web**：React 18、Vite、Zustand、现有 `chatStore` / `Conversation` / `Message` 类型。

---

## 二、后端设计 (packages/service)

### 2.1 模块划分

```
src/
├── main.ts
├── app.module.ts
├── app.controller.ts
├── chat/                          # 对话模块
│   ├── chat.module.ts
│   ├── chat.controller.ts         # 对话相关 HTTP 接口
│   ├── chat.service.ts            # 对话与 LLM 调用逻辑
│   ├── dto/
│   │   ├── createConversation.request.dto.ts
│   │   ├── getConversation.response.dto.ts
│   │   ├── sendMessage.request.dto.ts
│   │   ├── sendMessage.response.dto.ts
│   │   └── ...
│   └── storage/
│       └── chat.file.storage.ts  # 基于文件的持久化实现（会话/消息）
├── llm/                           # 大模型调用（可选独立模块）
│   ├── llm.module.ts
│   ├── llm.service.ts             # 封装具体 LLM SDK（OpenAI API 等）
│   └── llm.types.ts
└── common/                        # 可选：统一响应、异常过滤
    └── ...
```

- **chat**：会话与消息的领域逻辑、REST API、调用 LLM 获取回复。
- **llm**：仅负责「发请求到外部大模型、解析流式/非流式响应」，便于以后换模型或加路由。
- **storage**：抽象「会话/消息的读写」，本期实现为基于文件的 `chat.file.storage.ts`（或 `chat.local.storage.ts` 内使用 fs），后续可替换为 Prisma/DB。

### 2.2 本地持久化存储方案（本期）

- **形式**：使用 `node:fs` 将数据写入本地目录，**进程重启后数据保留**，不依赖数据库。
- **约定**：
  - **存储根目录**：通过环境变量配置（如 `CHAT_STORAGE_PATH`），默认可取 `data/chat`（相对项目根或 service 包根）。
  - **会话列表**：存为单文件，如 `data/chat/conversations.json`，内容为 `Conversation[]`；启动时读取、增删改会话时写回。
  - **消息列表**：按会话 ID 分文件存储，如 `data/chat/messages/{conversationId}.json`，内容为 `Message[]`；按需读取、追加消息时写回对应文件。
  - 写入时先写临时文件再 `rename`，避免写一半崩溃导致文件损坏。
- **数据结构**（与前端对齐）：
  - `Conversation`: `{ id, title, updatedAt, hasPreview? }`
  - `Message`: `{ id, role, content, contentFormat?, createdAt, updatedAt, model?, metadata? }`
- **不使用的部分**：本期不调用 Prisma、不建表；为后续迁移预留接口即可（如 `IChatStorage`）。

### 2.3 API 设计

#### 2.3.1 会话

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat/createConversation` | 创建会话，返回 `Conversation` |
| POST | `/chat/getConversations`  | 会话列表（Body: page?, pageSize?） |
| POST | `/chat/getConversation`   | 单个会话详情（Body: id） |
| POST | `/chat/getMessages`      | 某会话的消息列表（Body: conversationId, page?, pageSize?） |
| POST | `/chat/updateConversation`| 更新会话（Body: id, title?, hasPreview?） |
| POST | `/chat/deleteConversation`| 删除会话及消息（Body: id） |
| POST | `/chat/getMessage`        | 单条消息详情（Body: conversationId, messageId） |
| POST | `/chat/updateMessage`     | 更新单条消息（Body: conversationId, messageId, content） |
| POST | `/chat/deleteMessage`     | 删除单条消息（Body: conversationId, messageId） |

**updateConversation 调用时机**（前端何时调）：

- **title**：用户主动重命名会话时（如侧边栏会话项编辑标题、或首条消息后自动用摘要作为标题）。
- **hasPreview**：当前会话首次出现代码/预览时设为 `true`（如大模型返回可运行代码并打开预览）；或预览被关闭/清空时设为 `false`，以便侧栏用角标或样式区分「有预览」的会话。

#### 2.3.2 对话补全（核心）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/chat/sendMessage` | 发送用户消息并获取助手回复。请求体：`{ conversationId, content }`；响应：**非流式**时返回完整 `Message`（助手一条），**流式**见下。 |
| POST | `/chat/sendMessageStream` | 同上，但响应为 **SSE 流**（`Content-Type: text/event-stream`），前端可逐 chunk 渲染。 |

**请求 DTO 建议**（与前端类型一致）：

- `SendMessageRequestDto`: `{ conversationId: string; content: string }`

**响应**：

- 非流式：`SendMessageResponseDto`: `{ message: Message }`（助手消息）。
- 流式：SSE 事件，每行一个 chunk（或约定 JSON 行），前端拼成完整 `content` 再写入 store。

#### 2.3.3 健康与配置

- 保留 `POST /`、`POST /health`；**所有接口统一使用 POST**，入参在 Body。
- 大模型 API Key 等配置通过 **环境变量**（如 `OPENAI_API_KEY`、`LLM_API_BASE_URL`）注入，不在接口中暴露。

### 2.4 大模型调用（LLM 层）

- **职责**：根据 `llm.service` 的配置调用外部 API（如 OpenAI Compatible），支持：
  - 非流式：请求 → 取完整文本 → 返回。
  - 流式：请求 → 转发 stream → 通过 Nest 的 StreamableFile / Response 写 SSE。
- **配置**：从环境变量读取，默认可用 OpenAI 或兼容接口；具体模型名（如 `gpt-4o-mini`）也可用环境变量配置。
- **错误**：网络/限流/鉴权失败时，在 Service 层捕获并转换为 HTTP 4xx/5xx + 统一错误体，便于前端 toasts。

### 2.5 与数据库的隔离

- 本期 **不** 使用 Prisma 或任何 DB 连接。
- 存储层抽象为接口（如 `IChatStorage`），实现类为基于文件的持久化（如 `ChatFileStorage`），数据落盘、重启不丢。
- 后续接入 DB 时：新增 `ChatDbStorage` 实现同一接口，并在 `ChatModule` 中切换 Provider 即可，业务代码无需大改。

---

## 三、前端设计 (packages/web)

### 3.1 与后端的对接方式

- **Base URL**：前端直接请求后端地址（如 `http://localhost:3000`），由环境变量或构建配置（如 `VITE_API_BASE_URL`）指定；**不配置 Vite proxy**，跨域由后端 CORS 解决（见 2.3.3 / 五、安全与环境）。
- **请求方式**：使用 `fetch` 或封装一层 `lib/api/chatApi.ts`，统一 baseURL、错误处理、请求体格式；类型与后端 DTO 对齐（可复用 `@/types/chat` 或从 DTO 生成）。

### 3.2 现有结构的接入点

- **状态**：继续使用 `chatStore`（Zustand），保留 `conversations`、`messagesByConversationId`、`currentConversationId` 等。
- **数据流**：
  1. 创建会话：可先调 `POST /chat/createConversation`，再用返回的 `Conversation` 调用 `addConversation`；或继续前端生成 id，仅发消息时由后端创建会话（按产品约定二选一）。
  2. 发送消息：用户在 `ConversationPanel` 中发送 → `handleSend` 中先 `addMessage(conversationId, createMessage('user', text))`，再调用 `POST /chat/sendMessage` 或 `POST /chat/sendMessageStream`；收到助手消息后 `addMessage(conversationId, assistantMessage)`。
- **流式**：使用 `EventSource` 或 `fetch` + `ReadableStream` 消费 SSE，在回调中更新一条「进行中」的 assistant 消息的 `content`，结束时标记完成并可能更新会话 `updatedAt`。

### 3.3 建议新增/修改的文件

- `src/lib/api/chatApi.ts`：封装 `createConversation`、`getConversations`、`getMessages`、`sendMessage`、`sendMessageStream` 等。
- `src/types/chat.ts`：与后端 DTO 对齐的请求/响应类型（或从 DTO 复制一份保持命名一致）。
- `conversationPanel.tsx`（或上层调用处）：在 `handleSend` 中调用 `chatApi.sendMessage` / `sendMessageStream`，根据返回或流式 chunk 更新 store；同时处理 loading（如发送中禁用输入、显示 loading 气泡）、错误 toasts。

### 3.4 错误与加载态

- 请求失败：统一在 `chatApi` 或调用处 catch，toast 提示并可选重试；助手消息失败时可在当前会话追加一条「系统/错误」消息或占位文案。
- Loading：发送后到收到首 chunk 或完整响应前，显示「助手正在输入」等状态，避免重复发送。

---

## 四、类型与 DTO 对齐

- 后端 DTO 与前端 `Conversation`、`Message` 等字段保持一致（id、title、content、role、createdAt、updatedAt 等），避免前端再做字段映射。
- 日期格式统一为 ISO 8601 字符串。
- 前后端可共享类型定义（通过 monorepo 公共包或复制），减少不一致。

### 4.1 Message 数据类型（已定稿）

**约定**：

- **updatedAt**：已增加，编辑消息时更新，与 `updateMessage` 一致，用于「已编辑」展示与排序。
- **content 格式**：约定为 **Markdown**；助手消息使用 `contentFormat: 'markdown'`，前端用 MD 渲染（代码块、加粗等）；用户消息可为 `'text'` 或 `'markdown'`。
- **status**：仅前端本地使用（如 `sending` / `streaming` / `failed`），不持久化、不通过 API 同步。
- **model / metadata**：已预留可选字段，供后续多模型或统计使用。
- **attachments**：本期仅文本，不定义附件结构；后续如需多模态再扩展。

**Message 定义**（前后端 + 持久化一致）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 消息唯一标识 |
| role | 'user' \| 'assistant' | 是 | 发送方角色 |
| content | string | 是 | 消息正文（按 contentFormat 解析） |
| contentFormat | 'text' \| 'markdown' | 否 | 默认助手为 markdown、用户为 text |
| createdAt | string | 是 | 创建时间，ISO 8601 |
| updatedAt | string | 是 | 更新时间，ISO 8601；编辑后更新 |
| model | string | 否 | 预留：助手消息模型名 |
| metadata | object | 否 | 预留：token 用量、finish_reason 等 |

前端展示时：根据 `contentFormat` 用 Markdown 或纯文本渲染；`status` 仅在前端状态中维护，不写入 `Message`。

---

## 五、安全与环境

- **API Key**：仅存在于 service 端环境变量，前端不携带、不暴露。
- **CORS**：Nest 中配置允许 web 开发/生产源访问。
- **本地存储**：当前为单机、无多租户；若后续加用户，再考虑鉴权与数据隔离。

---

## 六、实施阶段建议

| 阶段 | 内容 | 产出 |
|------|------|------|
| 1 | Service：基于文件的持久化存储、会话/消息 CRUD API | 可独立用 Postman/curl 验证，重启后数据仍在 |
| 2 | Service：LLM 集成（非流式）`/chat/sendMessage` | 能收到助手完整回复 |
| 3 | Service：流式 `/chat/sendMessageStream` | SSE 可被前端消费 |
| 4 | Web：chatApi + 对接 sendMessage（非流式） | 端到端对话 |
| 5 | Web：流式 UI + loading/错误态 | 完整体验 |

---

## 七、评审要点（供你确认）

1. **本地持久化**：已确定为「基于文件的持久化」（会话列表 + 按会话分文件存消息），本期不启用 Prisma；存储路径通过环境变量 `CHAT_STORAGE_PATH` 配置。
2. **会话创建**：新会话由前端创建后同步到后端，还是由后端 `POST /chat/createConversation` 创建并返回 id？
3. **流式优先**：是否希望首版就上流式（SSE），还是先非流式再迭代？
4. **LLM 选型**：默认对接 OpenAI 还是国内兼容 API（如 DeepSeek/通义）？仅影响 `llm.service` 的 SDK 与 env 配置。
5. **前端持久化**：当前 chatStore 已 persist 到 localStorage；接入后端后，是否仍保留本地 persist 作为「离线/未同步」缓存，还是逐步改为「以服务端为准」？

以上为技术方案正文，可根据你的评审意见调整后再进入实现阶段。
