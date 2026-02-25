import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // Для встраивания в существующий сайт можно использовать библиотечный режим:
    // lib: {
    //   entry: './src/main.js',
    //   name: 'ProLifeGoldCalc',
    //   fileName: 'pro-life-gold-calc',
    // },
    outDir: 'dist',
    sourcemap: false,
  },
});
