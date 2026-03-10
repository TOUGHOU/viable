#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import { Command } from 'commander';
import { App } from './App.js';
import { getConfig, setConfig } from './config/settings.js';
import type { ProviderType } from './providers/index.js';

const program = new Command();

program
  .name('vibe')
  .description('Vibe CLI - AI 编程助手')
  .version('0.0.1');

program
  .command('chat', { isDefault: true })
  .description('启动交互式聊天')
  .option('-p, --provider <provider>', '选择 AI 提供者 (moonshot/anthropic/openai/ollama)')
  .option('-m, --model <model>', '选择模型')
  .action((options) => {
    render(
      <App
        providerType={options.provider as ProviderType}
        model={options.model}
      />
    );
  });

program
  .command('config')
  .description('管理配置')
  .argument('<action>', '操作: get, set, list')
  .argument('[key]', '配置键')
  .argument('[value]', '配置值')
  .action((action, key, value) => {
    const config = getConfig();

    switch (action) {
      case 'list':
        console.log('当前配置:');
        console.log(`  provider: ${config.provider}`);
        console.log(`  model: ${config.model || '(默认)'}`);
        console.log(`  moonshotApiKey: ${config.moonshotApiKey ? '****' : '(未设置)'}`);
        console.log(`  anthropicApiKey: ${config.anthropicApiKey ? '****' : '(未设置)'}`);
        console.log(`  openaiApiKey: ${config.openaiApiKey ? '****' : '(未设置)'}`);
        console.log(`  ollamaBaseUrl: ${config.ollamaBaseUrl}`);
        break;

      case 'get':
        if (!key) {
          console.error('请指定配置键');
          process.exit(1);
        }
        const configValue = config[key as keyof typeof config];
        if (key.includes('ApiKey') && configValue) {
          console.log('****');
        } else {
          console.log(configValue ?? '(未设置)');
        }
        break;

      case 'set':
        if (!key || value === undefined) {
          console.error('请指定配置键和值');
          process.exit(1);
        }
        setConfig(key as keyof typeof config, value);
        console.log(`已设置 ${key}`);
        break;

      default:
        console.error(`未知操作: ${action}`);
        process.exit(1);
    }
  });

program.parse();
