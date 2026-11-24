import { defineConfig } from 'vite';
import analog from '@analogjs/platform';
import viteTsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: import.meta.dirname,
  cacheDir: './node_modules/.vite',
  build: {
    outDir: './dist/./client',
    target: ['es2020'],
  },
  plugins: [
    analog({
      ssr: true,
      experimental: { streaming: true },
      prerender: { routes: async () => [] },
      nitro: { preset: 'node-server' },
    }),
    viteTsConfigPaths(),
  ],
  server: {
    fs: {
      allow: ['.'],
    },
  },
});
