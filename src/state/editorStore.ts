import { create } from 'zustand'
import { GRADIENT_PRESETS, type Background, type RatioId, type ShadowMode } from '../domain/scene'

export type ExportFormat = 'png' | 'jpeg'

type EditorState = {
  mediaUrl: string | null
  ratio: RatioId
  radius: number
  shadow: { mode: ShadowMode; opacity: number }
  background: Background
  exportFormat: ExportFormat
  exportScale: 1 | 2
  setMedia: (file: File) => void
  set: (patch: Partial<Omit<EditorState, 'setMedia' | 'set'>>) => void
}

const [from, to] = GRADIENT_PRESETS[0]

export const useEditor = create<EditorState>((setState, get) => ({
  mediaUrl: null,
  ratio: '4:3',
  radius: 20,
  shadow: { mode: 'spread', opacity: 40 },
  background: { kind: 'gradient', from, to, angle: 135 },
  exportFormat: 'png',
  exportScale: 1,
  setMedia: (file) => {
    if (!file.type.startsWith('image/')) return
    const previous = get().mediaUrl
    if (previous) URL.revokeObjectURL(previous)
    setState({ mediaUrl: URL.createObjectURL(file) })
  },
  set: (patch) => setState(patch),
}))
