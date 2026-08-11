import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Чтобы сборку можно было встраивать в iframe с любого URL-пути.
  // Например, GitHub Pages /repo/ — без сломаных абсолютных путей /assets/...
  base: './',
})
