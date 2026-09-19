import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api → backend so the frontend can call relative '/api/...' URLs
    // in dev without CORS friction. Cookies (credentials: 'include') flow
    // through the proxy transparently.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
