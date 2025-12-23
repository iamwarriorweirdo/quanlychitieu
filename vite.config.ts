
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // QUAN TRỌNG: base: './' giúp đường dẫn file thành tương đối (vd: ./assets/...)
  // Điều này bắt buộc để App Capacitor tải được file index.html và js/css
  base: './', 
});
