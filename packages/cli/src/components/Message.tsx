import React from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { Message as MessageType } from '../providers/types.js';

interface MessageProps {
  message: MessageType;
  isStreaming?: boolean;
}

export function Message({ message, isStreaming }: MessageProps): React.ReactElement {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  const roleColor = isUser ? 'green' : isSystem ? 'yellow' : 'cyan';
  const roleLabel = isUser ? '你' : isSystem ? '系统' : 'Vibe';

  return (
    <Box flexDirection="column" marginY={1}>
      <Box>
        <Text color={roleColor} bold>
          {roleLabel}
        </Text>
        {isStreaming && (
          <Box marginLeft={1}>
            <Spinner type="dots" />
          </Box>
        )}
      </Box>
      <Box marginLeft={2} marginTop={0}>
        <Text wrap="wrap">{message.content}</Text>
      </Box>
    </Box>
  );
}

interface ToolOutputProps {
  toolName: string;
  output: string;
  isError?: boolean;
}

export function ToolOutput({ toolName, output, isError }: ToolOutputProps): React.ReactElement {
  return (
    <Box flexDirection="column" marginY={1} borderStyle="single" borderColor={isError ? 'red' : 'gray'} paddingX={1}>
      <Text color="magenta" bold>
        工具: {toolName}
      </Text>
      <Box marginTop={1}>
        <Text color={isError ? 'red' : 'white'} wrap="wrap">
          {output.length > 500 ? output.slice(0, 500) + '...' : output}
        </Text>
      </Box>
    </Box>
  );
}
