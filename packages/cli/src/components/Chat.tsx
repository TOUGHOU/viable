import React, { useState, useCallback, useEffect } from 'react';
import { Box, Text, useApp } from 'ink';
import { Message } from './Message.js';
import { ToolOutput } from './Message.js';
import { Input } from './Input.js';
import type { AIProvider, Message as MessageType, Tool, StreamChunk } from '../providers/types.js';

interface ToolExecution {
  toolName: string;
  output: string;
  isError?: boolean;
}

interface ChatProps {
  provider: AIProvider;
  tools?: Tool[];
  systemPrompt?: string;
}

export function Chat({ provider, tools, systemPrompt }: ChatProps): React.ReactElement {
  const { exit } = useApp();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [toolOutputs, setToolOutputs] = useState<ToolExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  // 初始化系统提示
  useEffect(() => {
    if (systemPrompt) {
      setMessages([{ role: 'system', content: systemPrompt }]);
    }
  }, [systemPrompt]);

  const handleToolCall = useCallback(async (toolName: string, args: Record<string, unknown>): Promise<string> => {
    const tool = tools?.find(t => t.name === toolName);
    if (!tool) {
      return `工具 "${toolName}" 不存在`;
    }

    try {
      const result = await tool.execute(args);
      setToolOutputs(prev => [...prev, { toolName, output: result }]);
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setToolOutputs(prev => [...prev, { toolName, output: errorMsg, isError: true }]);
      return `错误: ${errorMsg}`;
    }
  }, [tools]);

  const sendMessage = useCallback(async (content: string) => {
    if (content === '/exit' || content === '/quit') {
      exit();
      return;
    }

    if (content === '/clear') {
      setMessages(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []);
      setToolOutputs([]);
      setError(null);
      return;
    }

    const userMessage: MessageType = { role: 'user', content };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setStreamingContent('');
    setError(null);

    try {
      const allMessages = [...messages, userMessage];
      let fullContent = '';

      // 使用流式响应
      for await (const chunk of provider.streamChat({
        messages: allMessages,
        tools
      })) {
        if (chunk.type === 'text' && chunk.content) {
          fullContent += chunk.content;
          setStreamingContent(fullContent);
        } else if (chunk.type === 'tool_call' && chunk.toolCall) {
          const result = await handleToolCall(chunk.toolCall.name, chunk.toolCall.arguments);
          // 添加工具结果到上下文
          fullContent += `\n[已执行工具 ${chunk.toolCall.name}]\n`;
        } else if (chunk.type === 'error') {
          setError(chunk.error || '未知错误');
        }
      }

      // 添加助手消息
      if (fullContent) {
        setMessages(prev => [...prev, { role: 'assistant', content: fullContent }]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [messages, provider, tools, systemPrompt, handleToolCall, exit]);

  const visibleMessages = messages.filter(m => m.role !== 'system');

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1} borderStyle="double" borderColor="cyan" paddingX={2}>
        <Text color="cyan" bold>
          Vibe CLI - AI 编程助手
        </Text>
        <Text color="gray"> | </Text>
        <Text color="yellow">{provider.name}</Text>
        <Text color="gray"> | </Text>
        <Text color="gray">输入 /help 获取帮助</Text>
      </Box>

      {/* Messages */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleMessages.map((msg, idx) => (
          <Message key={idx} message={msg} />
        ))}

        {/* Streaming content */}
        {streamingContent && (
          <Message
            message={{ role: 'assistant', content: streamingContent }}
            isStreaming={true}
          />
        )}

        {/* Tool outputs */}
        {toolOutputs.map((to, idx) => (
          <ToolOutput
            key={`tool-${idx}`}
            toolName={to.toolName}
            output={to.output}
            isError={to.isError}
          />
        ))}

        {/* Error */}
        {error && (
          <Box marginY={1}>
            <Text color="red">错误: {error}</Text>
          </Box>
        )}
      </Box>

      {/* Input */}
      <Box marginTop={1}>
        <Input
          onSubmit={sendMessage}
          isLoading={isLoading}
          placeholder={isLoading ? '等待响应...' : '输入消息 (/exit 退出, /clear 清空)'}
        />
      </Box>
    </Box>
  );
}
