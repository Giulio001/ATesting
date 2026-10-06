import { defineConfig } from 'vite';
import { catalogPlugin } from './catalog-server.js';
export default defineConfig({
  base: './',
  plugins: [catalogPlugin()],
  server: { port: 5190, strictPort: true },
  build: { chunkSizeWarningLimit: 1600 },
});
