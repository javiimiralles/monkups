import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import '@fontsource-variable/hanken-grotesk/wght.css'
// Text overlay fonts are bundled, never fetched at runtime; see FONTS in src/domain/overlays.ts.
import '@fontsource-variable/hanken-grotesk/wght-italic.css'
import '@fontsource-variable/inter/wght.css'
import '@fontsource-variable/inter/wght-italic.css'
import '@fontsource-variable/dm-sans/wght.css'
import '@fontsource-variable/dm-sans/wght-italic.css'
import '@fontsource-variable/space-grotesk/wght.css'
import '@fontsource-variable/fraunces/wght.css'
import '@fontsource-variable/fraunces/wght-italic.css'
import '@fontsource/instrument-serif/400.css'
import '@fontsource/instrument-serif/400-italic.css'
import './styles.css'

// Lets Claude Code edit the design over MCP while the dev server runs; builds leave it (and zod) out.
if (import.meta.env.DEV) void import('./mcp/bridge')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
