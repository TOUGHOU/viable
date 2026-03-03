/**
 * @file: vite.config.ts
 * @author: houfujian houfujian@jd.com
 */
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { codeInspectorPlugin } from 'code-inspector-plugin';

export default defineConfig({
  plugins: [
    react(),
    codeInspectorPlugin({
      bundler: 'vite',
      editor: 'cursor',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
