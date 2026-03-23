/**
 * @file: vite.config.ts
 * @author: houfujian houfujian@jd.com
 * @description Vite library build config for @vibe/shared (ESM + CJS).
 */
import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      outDir: 'dist/types',
      insertTypesEntry: false,
      tsconfigPath: './tsconfig.json',
    }),
  ],
  build: {
    lib: {
      entry: path.resolve(__dirname, './src/index.ts'),
      name: 'VibeShared',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'cjs') return 'cjs/index.cjs';
        return 'es/index.js';
      },
    },
    sourcemap: true,
    rollupOptions: {
      // Keep shared build self-contained; consumers will rely on workspace bundling.
      external: [],
    },
  },
});
