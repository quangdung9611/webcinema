import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  
  // Khi đang code thì nên để true để dễ sửa lỗi, khi nào xong xuôi hãy tắt
  css: {
    devSourcemap: true, 
  },

  build: {
    sourcemap: true,
    minify: false, // Tắt nén để Docker chạy nhẹ hơn khi đang dev
  },

  server: {
    watch: {
      usePolling: true, 
    },
    host: '0.0.0.0',    
    port: 5173,        
    strictPort: true,
  }
})