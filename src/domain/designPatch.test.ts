import { describe, expect, it } from 'vitest'
import { DesignPatchSchema, applyDesignPatch, describeDesign } from './designPatch'
import { newOverlay } from './overlays'
import { DEFAULT_SETTINGS, newScreen, type Settings } from './project'

const logo = { ...newOverlay('logo', { src: 'blob:logo', size: { width: 10, height: 5 } }), id: 'logo' }
const text = { ...newOverlay('text'), id: 'title', text: 'Old' }
const design: Settings = {
  ...DEFAULT_SETTINGS,
  screens: [newScreen('iphone-16', 'a'), { ...newScreen('screenshot', 'b'), scale: 0.8 }],
  overlays: [logo, text],
}

const parse = (input: unknown) => DesignPatchSchema.parse(input)

describe('DesignPatchSchema', () => {
  it('rejects unknown devices, keys and colours', () => {
    expect(DesignPatchSchema.safeParse({ screens: [{ deviceId: 'nokia' }] }).success).toBe(false)
    expect(DesignPatchSchema.safeParse({ wallpaper: 'red' }).success).toBe(false)
    expect(DesignPatchSchema.safeParse({ background: { kind: 'solid', color: 'red' } }).success).toBe(false)
    expect(DesignPatchSchema.safeParse({ background: { kind: 'image', url: 'x' } }).success).toBe(false)
  })
})

describe('applyDesignPatch', () => {
  it('keeps every key the patch leaves out', () => {
    const out = applyDesignPatch(design, parse({ ratio: '16:9' }))
    expect(out).toEqual({ ...design, ratio: '16:9' })
  })

  it('maps screens by index, keeping ids and unspecified placement', () => {
    const out = applyDesignPatch(design, parse({ screens: [{ deviceId: 'laptop-3d' }, { deviceId: 'phone-3d', dx: 5 }] }))
    expect(out.screens.map((s) => [s.id, s.deviceId])).toEqual([
      ['a', 'laptop-3d'],
      ['b', 'phone-3d'],
    ])
    expect(out.screens[1]).toMatchObject({ scale: 0.8, dx: 5 })
  })

  it('removes extra screens and adds new ones with fresh ids', () => {
    expect(applyDesignPatch(design, parse({ screens: [{ deviceId: 'iphone-16' }] })).screens.map((s) => s.id)).toEqual(['a'])
    const grown = applyDesignPatch(design, parse({ screens: Array(3).fill({ deviceId: 'iphone-16' }) })).screens
    expect(grown).toHaveLength(3)
    expect(grown[2].id).not.toMatch(/^(a|b)$/)
  })

  it('updates listed overlays, adds new ones, drops missing ones and keeps logos', () => {
    const out = applyDesignPatch(
      design,
      parse({ overlays: [{ kind: 'text', id: 'title', text: 'New' }, { kind: 'button', text: 'Get it' }] }),
    )
    expect(out.overlays[0]).toBe(logo)
    expect(out.overlays[1]).toEqual({ ...text, text: 'New' })
    expect(out.overlays[2]).toMatchObject({ kind: 'button', text: 'Get it', fill: '#ffffff' })
    expect(applyDesignPatch(design, parse({ overlays: [] })).overlays).toEqual([logo])
  })
})

describe('describeDesign', () => {
  it('hides blob URLs and reports screen images', () => {
    const out = describeDesign(
      { ...design, background: { kind: 'image', url: 'blob:bg', blur: 2 } },
      { a: { size: { width: 1206, height: 2622 } } },
    )
    expect(out.screens.map((s) => s.image)).toEqual(['1206x2622', null])
    expect(JSON.stringify(out)).not.toContain('blob:')
  })
})
