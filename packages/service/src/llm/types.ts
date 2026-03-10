/**
 * @file llm.types.ts
 * @author houfujian houfujian@jd.com
 */
export const LLM_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY ?? '',
  baseURL: process.env.LLM_API_BASE_URL,
  model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
} as const;
