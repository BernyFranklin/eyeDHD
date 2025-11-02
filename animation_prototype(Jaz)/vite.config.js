import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      fastRefresh: false, // stop React refresh

      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  base: '/',
  build: {
    outDir: 'dist',
  },
  server: {
    hmr: false,          // stop Vite hot reload
    port: 5173,
    strictPort: true,
  },
})
