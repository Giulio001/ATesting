import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  base: './',
  server: {
    port: 5188,
    strictPort: true,
    proxy: {
      '/multiplayer': {
        target: 'ws://127.0.0.1:2588',
        ws: true,
        rewrite: (p) => p.replace(/^\/multiplayer/, ''),
      },
    },
    fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] },
  },
  build: {
    chunkSizeWarningLimit: 2600,
    rollupOptions: {
      output: {
        manualChunks: (id) =>
          id.includes('rapier')
            ? 'physics'
            : id.includes('three')
              ? 'three'
              : id.includes('colyseus')
                ? 'network'
                : undefined,
      },
    },
  },
});
