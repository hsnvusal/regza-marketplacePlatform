import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Fix for process is not defined
    global: 'globalThis',
    'process.env': {}
  },
  server: {
    port: 5173,
    host: true
  },
  build: {
    rollupOptions: {
      external: []
    }
  }
})