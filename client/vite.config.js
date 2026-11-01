import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    host: true, // accesible desde el móvil en la red local
    proxy: { '/api': 'http://localhost:3000' },
  },
});
