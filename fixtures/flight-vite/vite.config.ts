import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
import rsc from './basic/plugin';
import Inspect from 'vite-plugin-inspect';

export default defineConfig({
  base: process.env.TEST_BASE ? '/custom-base/' : undefined,
  clearScreen: false,
  build: {
    minify: false,
  },
  plugins: [
    react(),
    rsc({
      entries: {
        browser: '/src/entry.browser.tsx',
        rsc: '/src/entry.rsc.tsx',
        ssr: '/src/entry.ssr.tsx',
      },
    }),
    Inspect(),
  ],
  optimizeDeps: {
    include: ['rsc-html-stream/client'],
  },
}) as any;
