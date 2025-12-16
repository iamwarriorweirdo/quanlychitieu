import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Xóa cấu hình build.outDir để sử dụng mặc định là 'dist'
});