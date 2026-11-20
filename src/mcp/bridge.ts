/**
 * Answers the MCP tools of the dev server (src/mcp/vitePlugin.ts) from this tab, over Vite's HMR socket.
 * Dev only: `import.meta.hot` is undefined in production builds, so nothing here runs there.
 */
import { DesignPatchSchema, applyDesignPatch, describeDesign } from '../domain/designPatch'
import { pickSettings } from '../domain/project'
import { previewPng } from '../export/exportImage'
import { useEditor } from '../state/editorStore'

export type BridgeTool = 'get_design' | 'apply_design' | 'get_preview'
export type BridgeRequest = { id: string; tool: BridgeTool; args?: unknown }
export type BridgeResponse = { id: string; ok: true; result: unknown } | { id: string; ok: false; error: string }

const design = () => {
  const state = useEditor.getState()
  return describeDesign(pickSettings(state), state.media)
}

function applyDesign(args: unknown) {
  // The plugin validated already; validate again because this is what writes the store.
  const patch = DesignPatchSchema.parse(args)
  const state = useEditor.getState()
  const next = applyDesignPatch(pickSettings(state), patch)
  const screenIds = new Set(next.screens.map((s) => s.id))
  const overlayIds = new Set(next.overlays.map((o) => o.id))
  // Release images of removed screens, and a replaced uploaded background.
  const media = Object.fromEntries(
    Object.entries(state.media).filter(([id, m]) => screenIds.has(id) || (URL.revokeObjectURL(m.url), false)),
  )
  if (patch.background && state.background.kind === 'image' && state.background.url.startsWith('blob:'))
    URL.revokeObjectURL(state.background.url)
  const { selection, editing } = state
  const selected = selection && (selection.kind === 'screen' ? screenIds : overlayIds).has(selection.id)
  state.set({
    ...next,
    media,
    selection: selected ? selection : null,
    editing: editing && overlayIds.has(editing) ? editing : null,
  })
  return design()
}

async function preview() {
  const stage = document.querySelector<HTMLElement>('.stage')
  if (!stage) throw new Error('The stage is not rendered')
  return previewPng(stage)
}

async function run({ tool, args }: BridgeRequest): Promise<unknown> {
  if (tool === 'get_design') return design()
  if (tool === 'apply_design') return applyDesign(args)
  if (tool === 'get_preview') return preview()
  throw new Error(`Unknown tool ${tool}`)
}

if (import.meta.hot) {
  const hot = import.meta.hot
  hot.on('monkups:request', async (request: BridgeRequest) => {
    let response: BridgeResponse
    try {
      response = { id: request.id, ok: true, result: await run(request) }
    } catch (err) {
      response = { id: request.id, ok: false, error: (err as Error).message }
    }
    hot.send('monkups:response', response)
  })
}
