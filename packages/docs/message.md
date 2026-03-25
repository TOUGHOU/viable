# AI SDK Message & SSE 结构设计规范 v2

> 规范来源：https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text  
> 本文档作为系统重构的唯一权威数据结构参考，所有消息流转、存储、渲染均应严格遵循此规范。

---

## 核心架构概览

系统分为**三个层次**，各层职责严格隔离：

```
┌─────────────────────────────────────────────────────┐
│  UIMessage Layer    前端渲染层                        │
│  role: user | assistant  /  parts: UIMessagePart[]  │
├─────────────────────────────────────────────────────┤
│  SSE Stream Layer   传输层                            │
│  TextStreamPart events over text/event-stream        │
├─────────────────────────────────────────────────────┤
│  ModelMessage Layer 模型调用层                        │
│  role: system | user | assistant | tool              │
└─────────────────────────────────────────────────────┘
```

**数据流向：**

- 请求：UIMessage → ModelMessage（发给 LLM API）
- 响应：LLM 输出 → SSE TextStreamPart（逐块传输）→ UIMessage 增量更新（前端消费）

---

## 一、ModelMessage — 模型调用层

发送给 LLM API 的原始消息格式。四种 role，**不可混用**。

### 类型定义

```typescript
type ModelMessage =
  | SystemModelMessage
  | UserModelMessage
  | AssistantModelMessage
  | ToolModelMessage;
```

### 1.1 SystemModelMessage

仅用于传递系统级指令，每次请求最多一条，置于 messages 数组首位。

```typescript
type SystemModelMessage = {
  role: 'system';
  content: string;
};
```

```json
{
  "role": "system",
  "content": "你是一个专业的代码助手，请用中文回复。遇到代码问题时优先展示可运行示例。"
}
```

### 1.2 UserModelMessage

用户输入，支持纯文本或多模态内容数组。

```typescript
type UserModelMessage = {
  role: 'user';
  content: string | Array<TextPart | ImagePart | FilePart>;
};
```

```json
// 纯文本（快捷写法）
{ "role": "user", "content": "帮我优化这段代码" }

// 多模态
{
  "role": "user",
  "content": [
    { "type": "text", "text": "帮我分析这张图里的代码" },
    { "type": "image", "image": "data:image/png;base64,iVBORw...", "mediaType": "image/png" }
  ]
}
```

### 1.3 AssistantModelMessage

模型回复，内容可混合文本、推理链、工具调用。

```typescript
type AssistantModelMessage = {
  role: 'assistant';
  content: string | Array<TextPart | ReasoningPart | ToolCallPart | FilePart>;
};
```

```json
{
  "role": "assistant",
  "content": [
    { "type": "text", "text": "需要先查询最新信息。" },
    {
      "type": "reasoning",
      "text": "用户问题涉及实时数据，应调用 web_search...",
      "signature": "ErUBCkMIAxgCIj..."
    },
    {
      "type": "tool-call",
      "toolCallId": "call_abc123",
      "toolName": "web_search",
      "input": { "query": "AI SDK v6 changelog" }
    }
  ]
}
```

### 1.4 ToolModelMessage

工具执行结果回传给模型。**必须紧跟包含对应 tool-call 的 AssistantMessage 之后。**

```typescript
type ToolModelMessage = {
  role: 'tool';
  content: ToolResultPart[];
};
```

```json
{
  "role": "tool",
  "content": [
    {
      "type": "tool-result",
      "toolCallId": "call_abc123",
      "toolName": "web_search",
      "result": { "results": [{ "title": "AI SDK v6", "url": "https://ai-sdk.dev" }] },
      "isError": false
    }
  ]
}
```

---

## 二、Content Part 类型

所有消息内容的原子单元，跨层复用（部分 part 类型在 ModelMessage 和 UIMessage 中均出现）。

| Part 类型        | 适用角色         | 核心字段                                                                               | 说明                               |
| ---------------- | ---------------- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| `TextPart`       | user / assistant | `text: string`                                                                         | 普通文本                           |
| `ImagePart`      | user             | `image: string \| URL \| Uint8Array`<br>`mediaType?: string`                           | base64、URL 或二进制               |
| `FilePart`       | user / assistant | `data: string \| URL \| Uint8Array`<br>`mediaType: string`                             | 文件内容，mediaType 必填           |
| `ReasoningPart`  | assistant        | `text: string`<br>`signature?: string`                                                 | 推理链，signature 由模型提供方生成 |
| `ToolCallPart`   | assistant        | `toolCallId: string`<br>`toolName: string`<br>`input: object`                          | 工具调用声明                       |
| `ToolResultPart` | tool             | `toolCallId: string`<br>`toolName: string`<br>`result: unknown`<br>`isError?: boolean` | 工具执行结果                       |

---

## 三、UIMessage — 前端展示层

前端存储与渲染使用的消息格式。**禁止直接将 ModelMessage 暴露给前端。**

### 核心结构

```typescript
interface UIMessage {
  id: string; // 全局唯一消息 ID
  role: 'user' | 'assistant'; // tool 角色不在 UI 层暴露
  parts: UIMessagePart[]; // 有序渲染单元数组
  metadata?: unknown; // 扩展元数据（usage、model、finishReason 等）
}
```

### UIMessagePart 类型

```typescript
type UIMessagePart =
  | { type: 'step-start' } // 多步骤分隔符
  | { type: 'text'; text: string } // 文本内容
  | { type: 'reasoning'; reasoning: string } // 推理链内容
  | { type: 'tool-invocation'; toolInvocation: ToolInvocation } // 工具调用（含结果）
  | { type: 'source'; source: SourcePart } // 引用来源
  | { type: 'file'; file: GeneratedFile }; // 生成的文件
```

### ToolInvocation 三态状态机

tool-invocation part 的 `state` 字段随流进度推进，**只能单向流转**：

```
partial-call ──→ call ──→ result
  (参数流式中)   (参数完整)  (已有执行结果)
```

```typescript
type ToolInvocationState = 'partial-call' | 'call' | 'result';

type ToolInvocation = {
  state: ToolInvocationState;
  toolCallId: string;
  toolName: string;
  input: object; // partial-call 时为不完整 JSON
  output?: unknown; // 仅 state === 'result' 时存在
};
```

### 完整 UIMessage 示例（含 Tool 调用）

```json
{
  "id": "msg_01XyzAbc",
  "role": "assistant",
  "parts": [
    { "type": "step-start" },
    { "type": "reasoning", "reasoning": "用户需要实时数据，应调用 web_search..." },
    { "type": "text", "text": "好的，我来帮你查一下。" },
    {
      "type": "tool-invocation",
      "toolInvocation": {
        "state": "result",
        "toolCallId": "call_abc123",
        "toolName": "web_search",
        "input": { "query": "AI SDK v6 changelog" },
        "output": { "results": [{ "title": "AI SDK v6", "url": "https://ai-sdk.dev" }] }
      }
    },
    { "type": "step-start" },
    { "type": "text", "text": "根据搜索结果，AI SDK v6 主要变更包括..." },
    {
      "type": "source",
      "source": {
        "sourceType": "url",
        "id": "src_001",
        "url": "https://ai-sdk.dev/changelog",
        "title": "AI SDK Changelog"
      }
    }
  ],
  "metadata": {
    "usage": { "inputTokens": 762, "outputTokens": 305, "totalTokens": 1067 },
    "model": "claude-sonnet-4-5",
    "finishReason": "stop"
  }
}
```

---

## 四、SSE 流协议

### 传输规范

```
# 请求
POST /api/chat
Content-Type: application/json
Accept: text/event-stream

# 响应头
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no        # 禁用 Nginx 缓冲

# 每个事件格式（JSON 单行）
data: {<TextStreamPart JSON>}\n\n
```

### TextStreamPart 完整类型

```typescript
type TextStreamPart =
  // ── 生命周期 ──
  | { type: 'start' }
  | { type: 'start-step'; request: { body: string }; warnings: Warning[] }
  | {
      type: 'finish-step';
      response: ResponseMetadata;
      usage: StepUsage;
      finishReason: FinishReason;
      isContinued: boolean;
    }
  | { type: 'finish'; finishReason: FinishReason; totalUsage: TotalUsage }
  // ── 内容增量 ──
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'reasoning-part-finish' }
  // ── 工具调用（流式三阶段） ──
  | { type: 'tool-call-streaming-start'; toolCallId: string; toolName: string }
  | { type: 'tool-call-delta'; toolCallId: string; toolName: string; argsTextDelta: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; input: object }
  | { type: 'tool-result'; toolCallId: string; toolName: string; input: object; output: unknown }
  // ── 来源 ──
  | { type: 'source'; sourceType: 'url'; id: string; url: string; title?: string }
  // ── 异常 ──
  | { type: 'error'; error: unknown }
  | { type: 'abort'; reason?: unknown };
```

### 完整事件序列（含多步 Tool Call）

```
# ════════ 第一步：初始 LLM 调用 ════════

data: {"type":"start"}

data: {"type":"start-step","request":{"body":"{\"model\":\"claude-sonnet-4-5\",...}"},"warnings":[]}

data: {"type":"reasoning","text":"用户询问实时数据，需调用 web_search 工具..."}

data: {"type":"text","text":"好的，"}
data: {"type":"text","text":"我来帮你"}
data: {"type":"text","text":"搜索一下。"}

data: {"type":"tool-call-streaming-start","toolCallId":"call_abc123","toolName":"web_search"}
data: {"type":"tool-call-delta","toolCallId":"call_abc123","toolName":"web_search","argsTextDelta":"{\"quer"}
data: {"type":"tool-call-delta","toolCallId":"call_abc123","toolName":"web_search","argsTextDelta":"y\":\"AI SDK v6\"}"}
data: {"type":"tool-call","toolCallId":"call_abc123","toolName":"web_search","input":{"query":"AI SDK v6"}}

data: {"type":"finish-step","response":{"id":"resp_01","modelId":"claude-sonnet-4-5","timestamp":"2026-03-24T10:00:00.000Z","headers":{}},"usage":{"inputTokens":312,"outputTokens":87},"finishReason":"tool-calls","isContinued":true}

# ════════ 工具执行（服务端） ════════

data: {"type":"tool-result","toolCallId":"call_abc123","toolName":"web_search","input":{"query":"AI SDK v6"},"output":{"results":[{"title":"AI SDK v6","url":"https://ai-sdk.dev"}]}}

# ════════ 第二步：携带工具结果继续生成 ════════

data: {"type":"start-step","request":{"body":"..."},"warnings":[]}

data: {"type":"text","text":"根据搜索结果，AI SDK v6 主要变更包括..."}

data: {"type":"source","sourceType":"url","id":"src_001","url":"https://ai-sdk.dev","title":"AI SDK"}

data: {"type":"finish-step","response":{"id":"resp_02","modelId":"claude-sonnet-4-5","timestamp":"2026-03-24T10:00:01.500Z","headers":{}},"usage":{"inputTokens":450,"outputTokens":218},"finishReason":"stop","isContinued":false}

# ════════ 流结束 ════════

data: {"type":"finish","finishReason":"stop","totalUsage":{"inputTokens":762,"outputTokens":305,"totalTokens":1067}}
```

### 异常事件

```
# 模型或网络错误
data: {"type":"error","error":{"code":"rate_limit_exceeded","message":"Too many requests"}}

# 用户主动取消（AbortSignal）
data: {"type":"abort","reason":"user cancelled"}
```

---

## 五、两层对比速查

| 维度         | ModelMessage                                      | UIMessage                               |
| ------------ | ------------------------------------------------- | --------------------------------------- |
| **用途**     | 发送给 LLM API                                    | 前端存储与渲染                          |
| **role**     | system / user / assistant / tool                  | user / assistant（tool 不暴露）         |
| **内容字段** | `content: string \| Part[]`                       | `parts: UIMessagePart[]`                |
| **工具表示** | ToolCallPart（assistant）+ ToolResultPart（tool） | tool-invocation（三态状态机，单条）     |
| **推理链**   | ReasoningPart（assistant content 内）             | 独立 reasoning UIMessagePart            |
| **元数据**   | 无                                                | `metadata?: unknown`（usage、model 等） |
| **多步分隔** | 无                                                | step-start part 标记每次 LLM call 边界  |

---

## 六、完整 TypeScript 类型定义

```typescript
// ═══════════════════════════════════════
// Content Parts（原子单元，跨层复用）
// ═══════════════════════════════════════

type TextPart = { type: 'text'; text: string };
type ImagePart = { type: 'image'; image: string | URL | Uint8Array; mediaType?: string };
type FilePart = { type: 'file'; data: string | URL | Uint8Array; mediaType: string };
type ReasoningPart = { type: 'reasoning'; text: string; signature?: string };
type ToolCallPart = { type: 'tool-call'; toolCallId: string; toolName: string; input: object };
type ToolResultPart = {
  type: 'tool-result';
  toolCallId: string;
  toolName: string;
  result: unknown;
  isError?: boolean;
};

// ═══════════════════════════════════════
// ModelMessage — 模型调用层
// ═══════════════════════════════════════

type SystemModelMessage = { role: 'system'; content: string };
type UserModelMessage = { role: 'user'; content: string | Array<TextPart | ImagePart | FilePart> };
type AssistantModelMessage = {
  role: 'assistant';
  content: string | Array<TextPart | ReasoningPart | ToolCallPart | FilePart>;
};
type ToolModelMessage = { role: 'tool'; content: ToolResultPart[] };

type ModelMessage =
  | SystemModelMessage
  | UserModelMessage
  | AssistantModelMessage
  | ToolModelMessage;

// ═══════════════════════════════════════
// UIMessage — 前端展示层
// ═══════════════════════════════════════

type ToolInvocationState = 'partial-call' | 'call' | 'result';

type ToolInvocation = {
  state: ToolInvocationState;
  toolCallId: string;
  toolName: string;
  input: object;
  output?: unknown; // 仅 state === 'result' 时存在
};

type SourcePart = {
  sourceType: 'url';
  id: string;
  url: string;
  title?: string;
};

type GeneratedFile = {
  base64: string;
  mediaType: string;
};

type UIMessagePart =
  | { type: 'step-start' }
  | { type: 'text'; text: string }
  | { type: 'reasoning'; reasoning: string }
  | { type: 'tool-invocation'; toolInvocation: ToolInvocation }
  | { type: 'source'; source: SourcePart }
  | { type: 'file'; file: GeneratedFile };

interface UIMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: UIMessagePart[];
  metadata?: {
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
    };
    model?: string;
    finishReason?: FinishReason;
    [key: string]: unknown;
  };
}

// ═══════════════════════════════════════
// SSE TextStreamPart — 传输层
// ═══════════════════════════════════════

type FinishReason = 'stop' | 'length' | 'content-filter' | 'tool-calls' | 'error' | 'other';

type StepUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
};

type TotalUsage = StepUsage;

type ResponseMetadata = {
  id: string;
  modelId: string;
  timestamp: string; // ISO 8601
  headers?: Record<string, string>;
};

type Warning = { type: string; message: string };

type TextStreamPart =
  | { type: 'start' }
  | { type: 'start-step'; request: { body: string }; warnings: Warning[] }
  | { type: 'text'; text: string }
  | { type: 'reasoning'; text: string }
  | { type: 'reasoning-part-finish' }
  | { type: 'source'; sourceType: 'url'; id: string; url: string; title?: string }
  | { type: 'tool-call-streaming-start'; toolCallId: string; toolName: string }
  | { type: 'tool-call-delta'; toolCallId: string; toolName: string; argsTextDelta: string }
  | { type: 'tool-call'; toolCallId: string; toolName: string; input: object }
  | { type: 'tool-result'; toolCallId: string; toolName: string; input: object; output: unknown }
  | {
      type: 'finish-step';
      response: ResponseMetadata;
      usage: StepUsage;
      finishReason: FinishReason;
      isContinued: boolean;
    }
  | { type: 'finish'; finishReason: FinishReason; totalUsage: TotalUsage }
  | { type: 'error'; error: unknown }
  | { type: 'abort'; reason?: unknown };
```

---

## 七、关键约束与实现注意事项

**消息层隔离**

- ModelMessage 仅在服务端使用，禁止序列化后直接返回给客户端
- UIMessage 是前端唯一的消息格式，不包含 system/tool role

**ToolMessage 顺序约束**

- ToolModelMessage 必须紧跟对应的 AssistantModelMessage
- `toolCallId` 必须在 tool-call 和 tool-result 之间严格一一对应

**SSE 事件顺序约束**

- `start` 严格第一，`finish` 严格最后，全流唯一
- 同一工具调用的事件顺序：`tool-call-streaming-start` → `tool-call-delta`（0~N 次）→ `tool-call` → `tool-result`
- `isContinued: true` 表示当前步骤后还有后续步骤（multi-step agent）

**状态机约束**

- ToolInvocation.state 只能单向推进：`partial-call` → `call` → `result`
- 前端收到 `tool-call-streaming-start` 时创建 `partial-call` 条目，收到 `tool-call` 时升级为 `call`，收到 `tool-result` 时升级为 `result`

**Usage 语义**

- `finish-step` 中的 `usage` 是**当前步骤**的 token 消耗
- `finish` 中的 `totalUsage` 是**全部步骤累计**的 token 消耗
- metadata 中的 usage 应存储 totalUsage（全局汇总）
