import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '/src': path.resolve(__dirname, 'src')
    }
  },
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});
