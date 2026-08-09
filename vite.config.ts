import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' => asset relatif, aman untuk GitHub Pages (root maupun subpath)
export default defineConfig({
  plugins: [react()],
  base: './',
})
