import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 3000, host: '0.0.0.0' },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      appwrite: path.resolve(__dirname, './node_modules/appwrite/dist/cjs/sdk.js'),
    }
  }
});
