# Vibe Coding 后端 API 详细设计

本文档描述 `packages/service` 提供的全部 HTTP 接口，包括路径、方法、入参、出参及错误约定。与前端类型定义（`packages/web/src/types/chat.ts`）对齐。

---

## 一、通用约定

### 1.1 基础信息

- **HTTP 方法**：**所有接口统一使用 POST**，路径表示能力/动作，入参统一放在 Body（`application/json`）。
- **Base Path**：无统一前缀（或可按部署加 `/api`）。
- **Content-Type**：请求 `application/json`；响应 `application/json`（流式接口为 `text/event-stream`）。
- **日期格式**：ISO 8601 字符串，如 `2025-03-04T12:00:00.000Z`。

### 1.2 统一错误响应

所有 4xx/5xx 错误建议使用统一结构，便于前端解析：

| 字段 | 类型 | 说明 |
|------|------|------|
| statusCode | number | HTTP 状态码 |
| message | string | 可读错误信息 |
| error | string | 可选，错误类型，如 `Bad Request`、`Not Found` |

**示例**：

```json
{
  "statusCode": 404,
  "message": "会话不存在",
  "error": "Not Found"
}
```

### 1.3 公共数据类型（与前端一致）

**Conversation**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话唯一标识 |
| title | string | 是 | 会话标题 |
| updatedAt | string | 是 | 最后更新时间（ISO 8601） |
| hasPreview | boolean | 否 | 是否有预览，默认 false |

**Message**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 消息唯一标识 |
| role | string | 是 | `user` \| `assistant` |
| content | string | 是 | 消息内容（按 contentFormat 解析） |
| contentFormat | string | 否 | `text` \| `markdown`，默认助手为 markdown、用户为 text |
| createdAt | string | 是 | 创建时间（ISO 8601） |
| updatedAt | string | 是 | 更新时间（ISO 8601），编辑后更新 |
| model | string | 否 | 预留：助手消息模型名 |
| metadata | object | 否 | 预留：token 用量、finish_reason 等 |

**说明**：`status`（sending/streaming/failed）仅前端本地使用，不持久化、不通过 API 同步。本期仅文本，无 attachments。

---

## 二、健康与根路径

### 2.1 POST /

- **说明**：服务存活与基础信息。
- **入参**：Body 可为空 `{}` 或不传。
- **出参**：`200 OK`

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 固定 `ok` |
| message | string | 如 `Vibe Coding Service` |

**示例**：

```json
{
  "status": "ok",
  "message": "Vibe Coding Service"
}
```

### 2.2 POST /health

- **说明**：健康检查（可用于探活）。
- **入参**：Body 可为空 `{}` 或不传。
- **出参**：`200 OK`

| 字段 | 类型 | 说明 |
|------|------|------|
| status | string | 固定 `ok` |

**示例**：

```json
{
  "status": "ok"
}
```

---

## 三、对话历史的增删改查

对话历史分为两层，均提供完整增删改查：

| 层级 | 增 | 删 | 改 | 查 |
|------|----|----|----|-----|
| **会话** | POST /chat/createConversation | POST /chat/deleteConversation | POST /chat/updateConversation | POST /chat/getConversations、POST /chat/getConversation |
| **消息** | POST /chat/sendMessage（追加消息） | POST /chat/deleteMessage | POST /chat/updateMessage | POST /chat/getMessages、POST /chat/getMessage |

以下第四、五节分别列出会话与消息相关 API 及对话补全的详细入参/出参。

---

## 四、会话与消息相关 API

会话层与消息层的增删改查接口如下。

### 3.1 创建会话（对话历史-增）

**POST** `/chat/createConversation`

- **说明**：创建一条新会话，写入持久化存储并返回会话对象。
- **入参**：Body (application/json)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | 否 | 会话标题，缺省可为 `"新对话"` |
| hasPreview | boolean | 否 | 是否有预览，默认 false |

- **出参**：`201 Created`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 会话 ID |
| title | string | 标题 |
| updatedAt | string | ISO 8601 |
| hasPreview | boolean | 是否含预览 |

**响应示例**：

```json
{
  "id": "conv_abc123",
  "title": "新对话",
  "updatedAt": "2025-03-04T12:00:00.000Z",
  "hasPreview": false
}
```

- **错误**：
  - `400` 参数校验失败（如 title 非字符串）

---

### 3.2 会话列表（对话历史-查）

**POST** `/chat/getConversations`

- **说明**：分页获取会话列表，按 `updatedAt` 倒序。
- **入参**：Body (application/json)

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| page | number | 否 | 1 | 页码，从 1 开始 |
| pageSize | number | 否 | 20 | 每页条数，建议最大 100 |

- **出参**：`200 OK`

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Conversation[] | 当前页会话列表 |
| meta | object | 分页元信息 |

**meta 结构**：

| 字段 | 类型 | 说明 |
|------|------|------|
| total | number | 总条数 |
| page | number | 当前页 |
| pageSize | number | 每页条数 |
| totalPages | number | 总页数 |

**响应示例**：

```json
{
  "data": [
    {
      "id": "conv_abc123",
      "title": "新对话",
      "updatedAt": "2025-03-04T12:00:00.000Z",
      "hasPreview": false
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "pageSize": 20,
    "totalPages": 1
  }
}
```

---

### 3.3 获取单个会话（对话历史-查）

**POST** `/chat/getConversation`

- **说明**：根据 ID 获取会话详情。
- **入参**：Body (application/json)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话 ID |

- **出参**：`200 OK` — 直接返回 `Conversation` 对象。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 会话 ID |
| title | string | 标题 |
| updatedAt | string | ISO 8601 |
| hasPreview | boolean | 是否含预览 |

- **错误**：
  - `404` 会话不存在

---

### 3.4 获取会话消息列表（对话历史-查）

**POST** `/chat/getMessages`

- **说明**：获取指定会话的消息列表，按 `createdAt` 正序（时间线顺序）。
- **入参**：Body (application/json)

| 字段 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| conversationId | string | 是 | — | 会话 ID |
| page | number | 否 | 1 | 页码 |
| pageSize | number | 否 | 50 | 每页条数，建议最大 100 |

- **出参**：`200 OK`

| 字段 | 类型 | 说明 |
|------|------|------|
| data | Message[] | 当前页消息列表 |
| meta | object | 分页元信息（同上：total, page, pageSize, totalPages） |

**响应示例**：

```json
{
  "data": [
    {
      "id": "msg_001",
      "role": "user",
      "content": "你好",
      "contentFormat": "text",
      "createdAt": "2025-03-04T12:00:00.000Z",
      "updatedAt": "2025-03-04T12:00:00.000Z"
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "content": "你好！有什么可以帮你的？",
      "contentFormat": "markdown",
      "createdAt": "2025-03-04T12:00:05.000Z",
      "updatedAt": "2025-03-04T12:00:05.000Z"
    }
  ],
  "meta": {
    "total": 2,
    "page": 1,
    "pageSize": 50,
    "totalPages": 1
  }
}
```

- **错误**：
  - `404` 会话不存在

---

### 3.5 更新会话（对话历史-改）

**POST** `/chat/updateConversation`

- **说明**：更新会话字段（如标题、是否有预览）。**调用时机**：① 用户重命名会话（侧栏编辑标题或首条回复后自动用摘要作标题）；② 当前会话首次出现代码/预览时设 `hasPreview: true`，预览被关闭/清空时设 `hasPreview: false`。
- **入参**：Body (application/json)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话 ID |
| title | string | 否 | 新标题 |
| hasPreview | boolean | 否 | 是否含预览 |

- **出参**：`200 OK` — 返回更新后的 `Conversation` 对象（字段同 3.3）。
- **错误**：
  - `404` 会话不存在  
  - `400` 参数校验失败

---

### 3.6 删除会话（对话历史-删）

**POST** `/chat/deleteConversation`

- **说明**：删除会话及其全部消息（持久化中删除会话记录与对应消息文件）。
- **入参**：Body (application/json)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | string | 是 | 会话 ID |

- **出参**：`200 OK` — 可返回空 body 或简单确认。

**响应示例**（可选）：

```json
{
  "success": true
}
```

- **错误**：
  - `404` 会话不存在

---

### 3.7 获取单条消息（对话历史-查单条）

**POST** `/chat/getMessage`

- **说明**：根据会话 ID 与消息 ID 获取单条消息，用于详情或编辑前拉取。
- **入参**：Body (application/json)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | string | 是 | 会话 ID |
| messageId | string | 是 | 消息 ID |

- **出参**：`200 OK` — 直接返回 `Message` 对象（字段：id, role, content, contentFormat?, createdAt, updatedAt, model?, metadata?）。
- **错误**：`404` 会话不存在或消息不存在

---

### 3.8 更新单条消息（对话历史-改）

**POST** `/chat/updateMessage`

- **说明**：更新指定消息的内容（如用户编辑已发送的消息）。仅允许更新 `content`；更新后会话的 `updatedAt` 建议同步更新。
- **入参**：Body (application/json)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | string | 是 | 会话 ID |
| messageId | string | 是 | 消息 ID |
| content | string | 是 | 新的消息内容，非空 |

- **出参**：`200 OK` — 返回更新后的 `Message` 对象。
- **错误**：`400` content 为空；`404` 会话或消息不存在

---

### 3.9 删除单条消息（对话历史-删）

**POST** `/chat/deleteMessage`

- **说明**：删除指定会话中的单条消息；会话保留，仅该条消息从持久化中移除。
- **入参**：Body (application/json)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | string | 是 | 会话 ID |
| messageId | string | 是 | 消息 ID |

- **出参**：`200 OK` — 空 body 或 `{ success: true }`。
- **错误**：`404` 会话或消息不存在

---

## 五、对话补全 API

### 4.1 发送消息（非流式）

**POST** `/chat/sendMessage`

- **说明**：在指定会话中追加一条用户消息，调用大模型生成助手回复，持久化用户消息与助手消息后，返回助手消息。
- **入参**：Body (application/json)

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | string | 是 | 会话 ID；若会话不存在可先创建或返回 404 |
| content | string | 是 | 用户消息内容，非空 |

- **出参**：`200 OK`

| 字段 | 类型 | 说明 |
|------|------|------|
| userMessage | Message | 已持久化的用户消息（含 id、createdAt、updatedAt、contentFormat 等） |
| assistantMessage | Message | 助手回复消息 |

**响应示例**：

```json
{
  "userMessage": {
    "id": "msg_user_001",
    "role": "user",
    "content": "用 TypeScript 写一个 hello world",
    "contentFormat": "text",
    "createdAt": "2025-03-04T12:00:00.000Z",
    "updatedAt": "2025-03-04T12:00:00.000Z"
  },
  "assistantMessage": {
    "id": "msg_asst_001",
    "role": "assistant",
    "content": "console.log('Hello, World!');",
    "contentFormat": "markdown",
    "createdAt": "2025-03-04T12:00:05.000Z",
    "updatedAt": "2025-03-04T12:00:05.000Z"
  }
}
```

- **错误**：
  - `400` 参数缺失或 content 为空  
  - `404` 会话不存在  
  - `502` / `503` 大模型调用失败（网络、限流、鉴权等）

---

### 4.2 发送消息（流式 SSE）

**POST** `/chat/sendMessageStream`

- **说明**：同上，但助手回复以 SSE 流式返回；用户消息与助手消息仍会写入持久化（助手消息在流结束后写入完整 content）。
- **入参**：Body — 与 4.1 相同

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| conversationId | string | 是 | 会话 ID |
| content | string | 是 | 用户消息内容 |

- **出参**：`200 OK`，`Content-Type: text/event-stream`。

**SSE 事件约定**：

1. **用户消息确认**（可选）：发送已持久化的用户消息，便于前端先展示。
   - event: `user_message`
   - data: JSON 字符串，即 `Message` 对象。

2. **流式内容**：逐 chunk 发送助手回复文本。
   - event: `content`
   - data: 纯文本片段（或 JSON 字符串 `{"content":"片段"}`，前后端约定其一即可）。

3. **助手消息结束**：流结束时的完整助手消息（含 id、createdAt），便于前端落库/更新 UI。
   - event: `assistant_message`
   - data: JSON 字符串，即 `Message` 对象。

4. **错误**（若在流式过程中发生）：  
   - event: `error`
   - data: JSON 字符串，如 `{"message":"错误描述"}`。

**示例（简化）**：

```
event: user_message
data: {"id":"msg_u1","role":"user","content":"你好","createdAt":"2025-03-04T12:00:00.000Z"}

event: content
data: 你

event: content
data: 好

event: content
data: ！

event: assistant_message
data: {"id":"msg_a1","role":"assistant","content":"你好！","createdAt":"2025-03-04T12:00:05.000Z"}
```

- **错误**（在未开始流式前返回）：
  - `400` / `404` 同 4.1；此时无 SSE，为普通 JSON 错误体。
  - 流已开始后发生的错误通过 `event: error` 推送。

---

## 六、DTO 与文件对应关系（后端实现参考）

| 接口 | 请求 DTO 文件 | 响应 DTO / 说明 |
|------|----------------|-----------------|
| POST / | 无或空 Body | 根响应（status, message） |
| POST /health | 无或空 Body | 健康响应（status） |
| POST /chat/createConversation | createConversation.request.dto.ts | createConversation.response.dto.ts（即 Conversation） |
| POST /chat/getConversations | getConversations.request.dto.ts（Body: page?, pageSize?） | getConversations.response.dto.ts（data + meta） |
| POST /chat/getConversation | getConversation.request.dto.ts（Body: id） | getConversation.response.dto.ts（Conversation） |
| POST /chat/getMessages | getMessages.request.dto.ts（Body: conversationId, page?, pageSize?） | getMessages.response.dto.ts（data + meta） |
| POST /chat/updateConversation | updateConversation.request.dto.ts（Body: id, title?, hasPreview?） | updateConversation.response.dto.ts（Conversation） |
| POST /chat/deleteConversation | deleteConversation.request.dto.ts（Body: id） | 可选空或 { success } |
| POST /chat/getMessage | getMessage.request.dto.ts（Body: conversationId, messageId） | getMessage.response.dto.ts（Message） |
| POST /chat/updateMessage | updateMessage.request.dto.ts（Body: conversationId, messageId, content） | updateMessage.response.dto.ts（Message） |
| POST /chat/deleteMessage | deleteMessage.request.dto.ts（Body: conversationId, messageId） | 可选空或 { success } |
| POST /chat/sendMessage | sendMessage.request.dto.ts | sendMessage.response.dto.ts（userMessage + assistantMessage） |
| POST /chat/sendMessageStream | sendMessageStream.request.dto.ts（与 sendMessage 可复用同一 DTO） | SSE，无 JSON body；事件 data 为 JSON 字符串 |

---

## 七、汇总表

| 方法 | 路径 | 入参 | 出参 |
|------|------|------|------|
| POST | / | Body 可选空 | `{ status, message }` |
| POST | /health | Body 可选空 | `{ status }` |
| POST | /chat/createConversation | Body: `{ title?, hasPreview? }` | Conversation |
| POST | /chat/getConversations | Body: `{ page?, pageSize? }` | `{ data: Conversation[], meta }` |
| POST | /chat/getConversation | Body: `{ id }` | Conversation |
| POST | /chat/getMessages | Body: `{ conversationId, page?, pageSize? }` | `{ data: Message[], meta }` |
| POST | /chat/updateConversation | Body: `{ id, title?, hasPreview? }` | Conversation |
| POST | /chat/deleteConversation | Body: `{ id }` | 空或 `{ success }` |
| POST | /chat/getMessage | Body: `{ conversationId, messageId }` | Message |
| POST | /chat/updateMessage | Body: `{ conversationId, messageId, content }` | Message |
| POST | /chat/deleteMessage | Body: `{ conversationId, messageId }` | 空或 `{ success }` |
| POST | /chat/sendMessage | Body: `{ conversationId, content }` | `{ userMessage, assistantMessage }` |
| POST | /chat/sendMessageStream | Body: `{ conversationId, content }` | SSE: user_message / content / assistant_message / error |

以上为后端 API 的完整入参与出参设计，**所有接口统一使用 POST**，可直接用于 Nest 控制器与 DTO 实现。
