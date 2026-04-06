import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  preview: {
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://a-mmc-nginx',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {  
      '@triage': path.resolve(
        __dirname,
        './src/data/triageLogic.js'
      )
    }
  }
})
