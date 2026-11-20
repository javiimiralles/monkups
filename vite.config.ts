import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { monkupsMcp } from './src/mcp/vitePlugin'

export default defineConfig({ plugins: [react(), monkupsMcp()] })
