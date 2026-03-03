/**
 * @file vite.config.ts
 * @description Vite 库模式构建配置，多入口打包
 */

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'shared/index': resolve(__dirname, 'src/shared/index.ts'),
        'adapters/vite/plugin': resolve(__dirname, 'src/adapters/vite/plugin.ts'),
        'adapters/turbopack/plugin': resolve(__dirname, 'src/adapters/turbopack/plugin.ts'),
        'adapters/turbopack/loader': resolve(__dirname, 'src/adapters/turbopack/loader.ts'),
        'runtime/inject': resolve(__dirname, 'src/runtime/inject.ts'),
      },
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [
        'vite',
        '@babel/parser',
        '@babel/traverse',
        '@babel/types',
        'magic-string',
        'node:module',
        'node:path',
        'node:url',
        'node:fs',
        'path',
        'url',
        'fs',
      ],
    },
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
  },
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'dist'],
    }),
  ],
});
