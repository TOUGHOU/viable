import OpenAI from 'openai';
import { z } from 'zod';

export const TOOL_SCHEMA: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description:
        'Get the current date and time. Use when you need to know the current time or date for context.',
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description:
        'Read the full contents of a file from the workspace. Use to inspect source code, config files, or any text file.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute or relative path to the file',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description:
        'Create a new file or overwrite an existing file with the given content. Use to create or modify source code and config files.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute or relative path where to write the file',
          },
          content: {
            type: 'string',
            description: 'Full content to write to the file',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description:
        'List files and directories at the given path. Use to explore project structure or find files.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Directory path to list. Defaults to workspace root if omitted.',
            default: '.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_code',
      description:
        'Search for text or pattern in the codebase. Use to find definitions, usages, or specific code snippets.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (keyword or regex pattern)',
          },
          path: {
            type: 'string',
            description: 'Optional directory or file path to limit search scope',
          },
          file_pattern: {
            type: 'string',
            description: 'Optional glob to filter files, e.g. "*.ts" or "**/*.tsx"',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description:
        'Run a shell command in the workspace (e.g. install deps, run tests, build). Use for npm/pnpm/yarn, git, or other CLI tools.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute',
          },
          cwd: {
            type: 'string',
            description: 'Working directory for the command. Defaults to workspace root.',
          },
        },
        required: ['command'],
      },
    },
  },
];
