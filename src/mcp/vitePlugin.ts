/**
 * MCP server on the dev server at /mcp (Streamable HTTP, stateless). Each tool call is forwarded to the open
 * Monkups tab over Vite's HMR socket and answered by src/mcp/bridge.ts, where the design state lives.
 * Vite's own host check and localhost-only CORS keep other web pages from calling it.
 */
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node'
import { McpServer } from '@modelcontextprotocol/server'
import type { Plugin, ViteDevServer } from 'vite'
import { DesignPatchSchema } from '../domain/designPatch'
import type { BridgeRequest, BridgeResponse, BridgeTool } from './bridge'

const TIMEOUT_MS = 10_000

function createBrowserLink(server: ViteDevServer) {
  const pending = new Map<string, (r: BridgeResponse) => void>()
  // With several tabs open every one answers; the first answer wins and the rest are ignored.
  server.ws.on('monkups:response', (response: BridgeResponse) => {
    pending.get(response.id)?.(response)
    pending.delete(response.id)
  })
  return (tool: BridgeTool, args?: unknown) =>
    new Promise<unknown>((resolve, reject) => {
      const id = crypto.randomUUID()
      const timer = setTimeout(() => {
        pending.delete(id)
        reject(new Error(`Monkups did not answer. Open ${server.resolvedUrls?.local[0] ?? 'the dev server'} in a browser.`))
      }, TIMEOUT_MS)
      pending.set(id, (r) => {
        clearTimeout(timer)
        if (r.ok) resolve(r.result)
        else reject(new Error(r.error))
      })
      server.ws.send('monkups:request', { id, tool, args } satisfies BridgeRequest)
    })
}

function createMcpServer(ask: ReturnType<typeof createBrowserLink>) {
  const mcp = new McpServer({ name: 'monkups', version: '0.1.0' })
  const json = (value: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] })

  mcp.registerTool(
    'get_design',
    {
      description:
        'Current Monkups design: screens (device, offset, scale, which hold an image), layout, ratio, frame, background, scene, watermark, animation and overlays. Call before apply_design.',
    },
    async () => json(await ask('get_design')),
  )
  mcp.registerTool(
    'apply_design',
    {
      description:
        'Change the open Monkups design. Send only the keys to change; nested objects (layout, shadow, background...) are replaced whole. Screens are listed in full and keep their images by position. Overlays are listed in full: pass an existing id to edit one. Returns the resulting design; check it with get_preview.',
      inputSchema: DesignPatchSchema,
    },
    async (patch) => json(await ask('apply_design', patch)),
  )
  mcp.registerTool(
    'get_preview',
    { description: 'PNG render of the current design, to check how it looks.' },
    async () => ({ content: [{ type: 'image' as const, data: (await ask('get_preview')) as string, mimeType: 'image/png' }] }),
  )
  return mcp
}

export function monkupsMcp(): Plugin {
  return {
    name: 'monkups-mcp',
    apply: 'serve',
    configureServer(server) {
      const ask = createBrowserLink(server)
      server.middlewares.use('/mcp', async (req, res) => {
        // Stateless: a server and transport per request, as the SDK recommends without sessions.
        const mcp = createMcpServer(ask)
        const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
        res.on('close', () => void mcp.close())
        try {
          await mcp.connect(transport)
          await transport.handleRequest(req, res)
        } catch (err) {
          server.config.logger.error(`[monkups-mcp] ${(err as Error).message}`)
          if (!res.headersSent) res.writeHead(500).end()
        }
      })
    },
  }
}
