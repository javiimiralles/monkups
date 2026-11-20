import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/project'
import { MAX_SCREENS, useEditor } from './editorStore'

const animated = { ...DEFAULT_SETTINGS.animation, preset: 'zoom-in' as const }

describe('video export formats need an animation', () => {
  beforeEach(() => useEditor.getState().set({ animation: animated, exportFormat: 'gif' }))

  it('falls back to PNG when the preset is set back to None', () => {
    useEditor.getState().set({ animation: DEFAULT_SETTINGS.animation })
    expect(useEditor.getState().exportFormat).toBe('png')
  })

  it('falls back to PNG on New', () => {
    useEditor.getState().newProject()
    expect(useEditor.getState().exportFormat).toBe('png')
  })

  it('falls back to PNG when opening a project saved without animation', () => {
    const { animation, ...older } = DEFAULT_SETTINGS
    useEditor.getState().openProject({ id: 'p', name: 'Old', updatedAt: 1, settings: older as typeof DEFAULT_SETTINGS })
    expect(useEditor.getState().exportFormat).toBe('png')
  })

  it('keeps the video format while an animation is set', () => {
    useEditor.getState().set({ radius: 10 })
    expect(useEditor.getState().exportFormat).toBe('gif')
  })
})

// Node has no Image; this one reports a fixed size as soon as its source is set.
class FakeImage {
  naturalWidth = 300
  naturalHeight = 600
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  set src(_: string) {
    queueMicrotask(() => this.onload?.())
  }
}

const png = () => new File(['x'], 'a.png', { type: 'image/png' })
const flush = () => new Promise((r) => setTimeout(r))
const state = () => useEditor.getState()

describe('screens', () => {
  beforeEach(() => {
    vi.stubGlobal('Image', FakeImage)
    state().newProject()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('fills the selected empty screen first, then appends', async () => {
    const first = state().screens[0].id
    expect(state().addScreens([png(), png()])).toBe(0)
    await flush()
    expect(state().screens).toHaveLength(2)
    expect(state().screens[0].id).toBe(first)
    expect(Object.keys(state().media).sort()).toEqual(state().screens.map((s) => s.id).sort())
    expect(state().media[first].size).toEqual({ width: 300, height: 600 })
  })

  it('fills the other empty screens before appending new ones', async () => {
    state().set({ screens: ['a', 'b', 'c'].map((id) => ({ id, deviceId: 'iphone-16', dx: 0, dy: 0, scale: 1 })) })
    state().set({ selectedScreen: 'a' })
    state().addScreens([png()])
    await flush()
    state().addScreens([png(), png(), png()])
    await flush()
    expect(state().screens.map((s) => s.id).slice(0, 3)).toEqual(['a', 'b', 'c'])
    expect(state().screens).toHaveLength(4)
    expect(Object.keys(state().media)).toHaveLength(4)
  })

  it('caps the design at six screens and reports how many files were refused', async () => {
    expect(state().addScreens(Array.from({ length: 8 }, png))).toBe(2)
    await flush()
    expect(state().screens).toHaveLength(MAX_SCREENS)
    expect(state().notice).toMatch(/2/)
    expect(state().addScreens([png()])).toBe(1)
    expect(state().screens).toHaveLength(MAX_SCREENS)
  })

  it('ignores files that are not images', () => {
    expect(state().addScreens([new File(['x'], 'a.txt', { type: 'text/plain' })])).toBe(0)
    expect(state().screens).toHaveLength(1)
  })

  it('removing a screen revokes its media URL and keeps a valid selection', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL')
    state().addScreens([png(), png()])
    await flush()
    const [a, b] = state().screens
    const url = state().media[b.id].url
    state().set({ selectedScreen: b.id })
    state().removeScreen(b.id)
    expect(revoke).toHaveBeenCalledWith(url)
    expect(state().screens.map((s) => s.id)).toEqual([a.id])
    expect(state().media[b.id]).toBeUndefined()
    expect(state().selectedScreen).toBe(a.id)
  })

  it('removing the last screen only clears its media', async () => {
    state().addScreens([png()])
    await flush()
    const only = state().screens[0].id
    state().removeScreen(only)
    expect(state().screens.map((s) => s.id)).toEqual([only])
    expect(state().media).toEqual({})
  })

  it('reorders screens', async () => {
    state().addScreens([png(), png()])
    await flush()
    const [a, b] = state().screens.map((s) => s.id)
    state().moveScreen(a, 1)
    expect(state().screens.map((s) => s.id)).toEqual([b, a])
    state().moveScreen(a, 1)
    expect(state().screens.map((s) => s.id)).toEqual([b, a])
  })

  it('opens a legacy single-media project as one screen with that media', () => {
    const { screens, layout, ...rest } = DEFAULT_SETTINGS
    state().openProject({
      id: 'old',
      name: 'Old',
      updatedAt: 1,
      settings: { ...rest, deviceId: 'iphone-16' } as unknown as typeof DEFAULT_SETTINGS,
      media: new Blob(['x']),
      mediaSize: { width: 10, height: 20 },
    })
    expect(state().screens).toHaveLength(1)
    expect(state().screens[0].deviceId).toBe('iphone-16')
    const media = state().media[state().screens[0].id]
    expect(media.url).toMatch(/^blob:/)
    expect(media.size).toEqual({ width: 10, height: 20 })
    expect(state().selectedScreen).toBe(state().screens[0].id)
  })
})
