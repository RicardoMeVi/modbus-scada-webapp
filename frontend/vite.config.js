import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Version única: package.json es la fuente de verdad. tauri.conf.json tiene
// su propio campo "version" (el que usan los instaladores .msi/.exe) que
// hay que mantener igual a mano -- ver EJECUTABLE-CAMPO.md en la raíz del
// repo.
const { version } = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf-8')
)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
})
