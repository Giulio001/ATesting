import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  server: { port: 5190, strictPort: true },
  build: { chunkSizeWarningLimit: 1600 },
});
