import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      // Forward /api/* to Node.js backend running on port 5000
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Forward /ai/* to FastAPI ai-service running on port 8000
      '/ai': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
