import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// La página vive en /administracion/ y le habla al servidor de la Mac (puerto 3100).
// En desarrollo, Vite (5180) le pasa las llamadas a /api; el servidor sólo las
// acepta si vienen de un origen de ADMIN_ORIGENES (servidor/.env).
export default defineConfig({
  base: '/administracion/',
  plugins: [react()],
  server: {
    host: 'localhost', // WebAuthn necesita un dominio: «localhost» sí, una IP no
    port: 5180,
    strictPort: true,
    proxy: { '/api': 'http://localhost:3100' },
  },
  build: {
    // Nada incrustado como data:, para que la política de contenido del
    // servidor (sólo archivos del mismo origen) no bloquee nada.
    assetsInlineLimit: 0,
    sourcemap: false,
  },
})
