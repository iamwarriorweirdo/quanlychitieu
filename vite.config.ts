import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Đổi tên thư mục xuất file thành 'build' để khớp với cài đặt của Vercel
    outDir: 'build',
  },
});