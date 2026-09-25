import { defineConfig } from 'vite';

export default defineConfig({
  // For GitHub Pages: set to '/<repo-name>/' or '/' if using custom domain
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  server: {
    port: 3000,
    open: true,
  },
});
