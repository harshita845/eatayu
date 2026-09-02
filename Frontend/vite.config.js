import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const foodSrc = path.resolve(__dirname, './src/modules/Food')
const servicesApi = path.resolve(__dirname, './src/services/api')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // More specific first so @food/api/* resolves to services (no backend)
      '@food/api/axios': path.resolve(servicesApi, 'axios.js'),
      '@food/api/config': path.resolve(servicesApi, 'config.js'),
      '@food/api': servicesApi,
      '@food': foodSrc,
      '@delivery': path.resolve(__dirname, './src/modules/DeliveryV2'),
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/x-date-pickers',
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('react-router')) return 'vendor-router'
          if (id.includes('@mui/') || id.includes('@emotion/')) return 'vendor-mui'
          if (
            id.includes('stylis') ||
            id.includes('prop-types') ||
            id.includes('hoist-non-react-statics')
          ) {
            return 'vendor-mui'
          }
          if (id.includes('firebase')) return 'vendor-firebase'
          if (id.includes('@react-google-maps') || id.includes('@googlemaps/')) return 'vendor-maps'
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-leaflet'
          if (id.includes('recharts')) return 'vendor-charts'
          if (id.includes('framer-motion') || id.includes('gsap') || id.includes('canvas-confetti') || id.includes('lenis')) {
            return 'vendor-motion'
          }
          if (id.includes('jspdf') || id.includes('jspdf-autotable')) return 'vendor-export-pdf'
          if (id.includes('exceljs')) return 'vendor-export-excel'
          if (id.includes('html2canvas')) return 'vendor-export-canvas'
          return 'vendor-core'
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
    proxy: {
      // Backend API (runs on 5002 to avoid port 5000 conflicts with Tiffinji)
      '/api/v1': {
        target: process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:5002',
        changeOrigin: true,
      },
      // Uploaded images — same origin as frontend in dev (avoids CORP / NotSameOrigin)
      '/uploads': {
        target: process.env.VITE_BACKEND_PROXY_TARGET || 'http://localhost:5002',
        changeOrigin: true,
      },
      // Socket.IO WebSocket proxy (target is same Express port 5002 in local dev)
      '/socket.io': {
        target: 'http://localhost:5002',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
