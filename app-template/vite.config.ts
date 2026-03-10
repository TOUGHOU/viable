/**
 * @file: vite.config.ts
 * @author: houfujian houfujian@jd.com
 */
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import inspectorPlugin from 'vibe-inspector-plugin';

export default defineConfig({
  plugins: [react(), inspectorPlugin({ bundler: 'vite' })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app'],
  },
});
