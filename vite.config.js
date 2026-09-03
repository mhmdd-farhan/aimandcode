import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [],
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
});
