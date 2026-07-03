import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // sockjs-client (utilise pour le canal temps reel des alertes) reference l'objet
  // Node "global", absent du navigateur : on le fait pointer vers globalThis.
  define: {
    global: 'globalThis',
  },
  server: {
    port: 5173,
  },
})
