export * from './types.js';
export { AnthropicProvider } from './anthropic.js';
export { OpenAIProvider } from './openai.js';
export { OllamaProvider } from './ollama.js';
export { MoonshotProvider } from './moonshot.js';

import type { AIProvider, ProviderOptions } from './types.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import { OllamaProvider } from './ollama.js';
import { MoonshotProvider } from './moonshot.js';

export type ProviderType = 'anthropic' | 'openai' | 'ollama' | 'moonshot';

export function createProvider(
  type: ProviderType,
  options: ProviderOptions
): AIProvider {
  switch (type) {
    case 'anthropic':
      if (!options.apiKey) {
        throw new Error('Anthropic API key is required');
      }
      return new AnthropicProvider(options.apiKey, options.model);

    case 'openai':
      if (!options.apiKey) {
        throw new Error('OpenAI API key is required');
      }
      return new OpenAIProvider(options.apiKey, options.model);

    case 'moonshot':
      if (!options.apiKey) {
        throw new Error('Moonshot API key is required');
      }
      return new MoonshotProvider(options.apiKey, options.model);

    case 'ollama':
      return new OllamaProvider(options.baseUrl, options.model);

    default:
      throw new Error(`Unknown provider type: ${type}`);
  }
}
