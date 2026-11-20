import { describe, expect, it } from 'vitest'
import { DEVICES } from './devices'
import {
  DEFAULT_SETTINGS,
  TEMPLATES,
  applyTemplate,
  pickSettings,
  restoreSettings,
  savedMedia,
  sortProjects,
  type ProjectRecord,
  type Settings,
} from './project'

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

  it('maps the legacy deviceId shorthand to a single screen', () => {
    const settings = applyTemplate({ id: 't', name: 'T', settings: { deviceId: 'iphone-16' } })
    expect(settings.screens).toHaveLength(1)
    expect(settings.screens[0]).toMatchObject({ deviceId: 'iphone-16', dx: 0, dy: 0, scale: 1 })
    expect(settings).not.toHaveProperty('deviceId')
  })

  it('keeps the ids of the current screens so their media survives', () => {
    const current = [
      { id: 'a', deviceId: 'screenshot', dx: 5, dy: 5, scale: 1.2, angle: 'front' as const, color: 'silver' as const },
      { id: 'b', deviceId: 'screenshot', dx: 0, dy: 0, scale: 1, angle: 'front' as const, color: 'silver' as const },
    ]
    const trio = TEMPLATES.find((t) => t.id === 'app-trio')!
    const three = applyTemplate(trio, current).screens
    expect(three.map((s) => s.id).slice(0, 2)).toEqual(['a', 'b'])
    expect(three).toHaveLength(3)
    expect(three.every((s) => s.deviceId === 'iphone-17-pro' && s.dx === 0 && s.scale === 1)).toBe(true)
    const single = applyTemplate(TEMPLATES.find((t) => t.id === 'dark-browser')!, current).screens
    expect(single.map((s) => [s.id, s.deviceId])).toEqual([
      ['a', 'chrome-dark'],
      ['b', 'chrome-dark'],
    ])
  })
})

describe('TEMPLATES', () => {
  it('has unique ids and only uses known devices', () => {
    const ids = TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    const known = new Set(DEVICES.map((d) => d.id))
    for (const t of TEMPLATES) for (const s of applyTemplate(t).screens) expect(known.has(s.deviceId)).toBe(true)
  })
})

describe('restoreSettings', () => {
  it('turns a project saved before multi-screen into one screen with its device', () => {
    const { screens, layout, ...rest } = DEFAULT_SETTINGS
    const legacy = { ...rest, deviceId: 'macbook-pro-14' } as unknown as Partial<Settings>
    const restored = restoreSettings(legacy)
    expect(restored.screens).toEqual([
      { id: 'screen-1', deviceId: 'macbook-pro-14', dx: 0, dy: 0, scale: 1, angle: 'front', color: 'silver' },
    ])
    expect(restored.layout).toEqual(DEFAULT_SETTINGS.layout)
    expect(restored).not.toHaveProperty('deviceId')
  })

  it('keeps saved screens as they are', () => {
    const screens = [
      { id: 'x', deviceId: 'laptop-3d', dx: 1, dy: 2, scale: 0.8, angle: 'top' as const, color: 'space-black' as const },
      { id: 'y', deviceId: 'phone-3d', dx: 0, dy: 0, scale: 1, angle: 'low-hero' as const, color: 'silver' as const },
    ]
    expect(restoreSettings({ screens }).screens).toEqual(screens)
  })

  it('gives screens saved before realistic devices the default angle and colour', () => {
    const old = [{ id: 'x', deviceId: 'iphone-16', dx: 1, dy: 2, scale: 0.8 }] as Settings['screens']
    expect(restoreSettings({ screens: old }).screens).toEqual([{ ...old[0], angle: 'front', color: 'silver' }])
  })
})

describe('savedMedia', () => {
  const blob = new Blob(['x'])
  const size = { width: 10, height: 20 }
  const base = { id: 'p', name: 'P', updatedAt: 1 }

  it('reads the single media of a legacy record into the first screen', () => {
    const settings = restoreSettings({})
    const record = { ...base, settings, media: blob, mediaSize: size } as ProjectRecord
    expect(savedMedia(record, settings.screens)).toEqual({ [settings.screens[0].id]: { blob, size } })
  })

  it('reads per-screen media and skips empty screens', () => {
    const settings = restoreSettings({})
    const record: ProjectRecord = {
      ...base,
      settings,
      screens: [{ id: 'a', media: blob, mediaSize: size }, { id: 'b' }],
    }
    expect(savedMedia(record, settings.screens)).toEqual({ a: { blob, size } })
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
