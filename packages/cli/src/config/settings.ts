import Conf from 'conf';
import type { ProviderType } from '../providers/index.js';

interface ConfigSchema {
  provider: ProviderType;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  moonshotApiKey?: string;
  ollamaBaseUrl: string;
  model?: string;
  theme: 'dark' | 'light';
}

const config = new Conf<ConfigSchema>({
  projectName: 'vibe-cli',
  defaults: {
    provider: 'moonshot',
    ollamaBaseUrl: 'http://localhost:11434',
    theme: 'dark',
  },
});

export function getConfig(): ConfigSchema {
  return {
    provider: config.get('provider'),
    anthropicApiKey: config.get('anthropicApiKey'),
    openaiApiKey: config.get('openaiApiKey'),
    moonshotApiKey: config.get('moonshotApiKey'),
    ollamaBaseUrl: config.get('ollamaBaseUrl'),
    model: config.get('model'),
    theme: config.get('theme'),
  };
}

export function setConfig<K extends keyof ConfigSchema>(
  key: K,
  value: ConfigSchema[K]
): void {
  config.set(key, value);
}

export function getApiKey(provider: ProviderType): string | undefined {
  switch (provider) {
    case 'anthropic':
      return (
        config.get('anthropicApiKey') || process.env['ANTHROPIC_API_KEY']
      );
    case 'openai':
      return config.get('openaiApiKey') || process.env['OPENAI_API_KEY'];
    case 'moonshot':
      return config.get('moonshotApiKey') || process.env['MOONSHOT_API_KEY'];
    case 'ollama':
      return undefined; // Ollama doesn't need API key
  }
}

export function hasValidConfig(provider: ProviderType): boolean {
  if (provider === 'ollama') return true;
  return !!getApiKey(provider);
}

export { config };
