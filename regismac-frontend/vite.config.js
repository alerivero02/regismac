import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 600,
  },
  server: {
    host: '0.0.0.0', // Permite acceso desde la red local
    port: 5173, // Puerto por defecto de Vite
    strictPort: false, // Si el puerto está ocupado, intenta el siguiente
  },
})
