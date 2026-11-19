import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../domain/project'
import { useEditor } from './editorStore'

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
