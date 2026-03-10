import type { Tool } from '../providers/types.js';
import { createReadTool, createWriteTool, createEditTool } from './file.js';
import { createBashTool } from './bash.js';
import { createGlobTool, createGrepTool } from './search.js';

export function createTools(): Tool[] {
  return [
    createReadTool(),
    createWriteTool(),
    createEditTool(),
    createBashTool(),
    createGlobTool(),
    createGrepTool(),
  ];
}

export { createTool, formatToolError } from './base.js';
export { createReadTool, createWriteTool, createEditTool } from './file.js';
export { createBashTool } from './bash.js';
export { createGlobTool, createGrepTool } from './search.js';
