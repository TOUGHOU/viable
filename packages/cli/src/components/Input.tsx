import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';

interface InputProps {
  onSubmit: (value: string) => void;
  isLoading?: boolean;
  placeholder?: string;
}

export function Input({ onSubmit, isLoading, placeholder = '输入消息...' }: InputProps): React.ReactElement {
  const [value, setValue] = useState('');

  const handleSubmit = (submitValue: string) => {
    if (submitValue.trim() && !isLoading) {
      onSubmit(submitValue.trim());
      setValue('');
    }
  };

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      process.exit(0);
    }
  });

  return (
    <Box borderStyle="round" borderColor={isLoading ? 'gray' : 'green'} paddingX={1}>
      <Text color="green" bold>
        {'> '}
      </Text>
      {isLoading ? (
        <Text color="gray">{placeholder}</Text>
      ) : (
        <TextInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          placeholder={placeholder}
        />
      )}
    </Box>
  );
}
