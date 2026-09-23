import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expõe para a rede local (0.0.0.0) para acessar via celular/QR Code
    port: 5173
  }
})
