/**
 * @file: vite.config.ts
 * @author: houfujian houfujian@jd.com
 */
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import inspectorPlugin from '@vibe/utils-inspector';

export default defineConfig({
  plugins: [react(), inspectorPlugin({ bundler: 'vite' })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 9876,
  },
});
