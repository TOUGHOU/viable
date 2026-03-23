import { SelectedElement } from 'src/type';

/**
 * @file: build-user-prompt.ts
 * @author: houfujian houfujian@jd.com
 */
export function buildUserPrompt(prompt: string, selectedElements?: Array<SelectedElement>) {
  const selectElementPrompt = selectedElements
    ? `
用户选择的元素: \`${JSON.stringify(selectedElements)}\`
  `
    : '';

  return `${prompt}\n\n${selectElementPrompt}`;
}
