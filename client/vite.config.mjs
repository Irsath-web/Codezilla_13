import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    // Exclude pdfjs from pre-bundling so the ?url worker import resolves correctly
    exclude: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      // Ensure the PDF.js worker is handled as a separate asset
      external: [],
    },
  },
})
