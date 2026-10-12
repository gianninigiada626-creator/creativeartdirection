import { defineConfig } from 'vite';

// Relative base: the build runs from any sub-path or as a static artifact.
export default defineConfig({
  base: './',
  server: { host: true },
  build: { chunkSizeWarningLimit: 1200 },
});
