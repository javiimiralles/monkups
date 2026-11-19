import { describe, expect, it } from 'vitest'
import { DEVICES } from './devices'
import { DEFAULT_SETTINGS, TEMPLATES, applyTemplate, pickSettings, sortProjects } from './project'

describe('pickSettings', () => {
  it('keeps only the persistable design settings', () => {
    const state = { ...DEFAULT_SETTINGS, mediaUrl: 'blob:x', exportScale: 2, set: () => {} }
    expect(pickSettings(state)).toEqual(DEFAULT_SETTINGS)
  })
})

describe('applyTemplate', () => {
  it('starts from the defaults so earlier tweaks do not leak into a template', () => {
    const tilted = TEMPLATES.find((t) => t.id === 'tilted-iphone')!
    const minimal = TEMPLATES.find((t) => t.id === 'clean-gradient')!
    expect(applyTemplate(tilted).rotation).not.toEqual({ x: 0, y: 0, z: 0 })
    expect(applyTemplate(minimal).rotation).toEqual({ x: 0, y: 0, z: 0 })
  })
})

describe('TEMPLATES', () => {
  it('has unique ids and only uses known devices', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    const known = new Set(DEVICES.map((d) => d.id))
    for (const t of TEMPLATES) expect(known.has(applyTemplate(t).deviceId)).toBe(true)
  })
})

describe('sortProjects', () => {
  it('lists the most recently saved project first', () => {
    const list = [
      { id: 'a', updatedAt: 1 },
      { id: 'b', updatedAt: 3 },
      { id: 'c', updatedAt: 2 },
    ]
    expect(sortProjects(list).map((p) => p.id)).toEqual(['b', 'c', 'a'])
  })
})
