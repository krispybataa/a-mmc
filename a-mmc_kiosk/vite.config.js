import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: ['..'] } },
  resolve: {
    alias: {
      // '@triage': path.resolve(
      //   __dirname,
      //   '../a-mmc_frontend/src/data/triageLogic.js'
      // )
      '@triage': '/src/data/triageLogic.js'
    }
  }
})
