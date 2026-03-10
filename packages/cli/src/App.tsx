import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Chat } from './components/Chat.js';
import { createProvider, type ProviderType, type AIProvider } from './providers/index.js';
import { getConfig, getApiKey, hasValidConfig } from './config/settings.js';
import { createTools } from './tools/index.js';

interface AppProps {
  providerType?: ProviderType;
  model?: string;
}

export function App({ providerType, model }: AppProps): React.ReactElement {
  const [provider, setProvider] = useState<AIProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initProvider = async () => {
      try {
        const config = getConfig();
        const type = providerType || config.provider;
        const selectedModel = model || config.model;

        if (!hasValidConfig(type)) {
          setError(
            `需要配置 ${type} 的 API Key。\n` +
            `请设置环境变量 ${type === 'anthropic' ? 'ANTHROPIC_API_KEY' : 'OPENAI_API_KEY'}\n` +
            `或运行: vibe config set ${type}ApiKey <your-key>`
          );
          setIsInitializing(false);
          return;
        }

        const apiKey = getApiKey(type);
        const p = createProvider(type, {
          apiKey,
          baseUrl: config.ollamaBaseUrl,
          model: selectedModel,
        });

        setProvider(p);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsInitializing(false);
      }
    };

    initProvider();
  }, [providerType, model]);

  if (isInitializing) {
    return (
      <Box padding={1}>
        <Spinner type="dots" />
        <Text color="cyan"> 初始化 Vibe CLI...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>初始化失败</Text>
        <Text color="red">{error}</Text>
      </Box>
    );
  }

  if (!provider) {
    return (
      <Box padding={1}>
        <Text color="red">无法创建 AI Provider</Text>
      </Box>
    );
  }

  const tools = createTools();

  const systemPrompt = `你是 Vibe，一个强大的 AI 编程助手，运行在用户的终端中。

你的能力：
1. 读取和修改文件
2. 执行终端命令
3. 搜索代码和文件
4. 帮助用户理解和编写代码

工作原则：
- 在修改代码前先理解现有代码
- 提供简洁、准确的回答
- 优先使用工具来完成任务
- 注意安全性，不执行危险操作

当前工作目录: ${process.cwd()}`;

  return <Chat provider={provider} tools={tools} systemPrompt={systemPrompt} />;
}
