import { describe, expect, it } from 'vitest'
import { FONTS, newOverlay, overlayPx } from './overlays'
import { DEFAULT_SETTINGS, TEMPLATES, applyTemplate, restoreSettings } from './project'

describe('newOverlay', () => {
  it('gives text, button and logo overlays usable defaults with a fresh id', () => {
    const text = newOverlay('text')
    const button = newOverlay('button')
    const logo = newOverlay('logo', { src: 'blob:x', size: { width: 200, height: 100 } })
    expect(text).toMatchObject({ kind: 'text', rotation: 0, opacity: 100 })
    expect(text.kind === 'text' && text.text.length).toBeGreaterThan(0)
    expect(button).toMatchObject({ kind: 'button', uppercase: true })
    expect(button.kind === 'button' && button.fill).toMatch(/^#/)
    expect(logo).toMatchObject({ kind: 'logo', src: 'blob:x', size: { width: 200, height: 100 } })
    expect(new Set([text.id, button.id, logo.id]).size).toBe(3)
    for (const o of [text, button]) expect(FONTS.map((f) => f.id)).toContain(o.font)
  })
})

describe('overlayPx', () => {
  const text = { ...newOverlay('text'), x: 10, y: 20, width: 50, size: 5 }

  it('places and sizes overlays in percent of the stage, so they keep their look at any export scale', () => {
    const one = overlayPx(text, { width: 1600, height: 900 })
    expect(one).toEqual({ left: 160, top: 180, width: 800, height: undefined, fontSize: 80 })
    const two = overlayPx(text, { width: 3200, height: 1800 })
    expect(two).toEqual({ left: 320, top: 360, width: 1600, height: undefined, fontSize: 160 })
  })

  it('measures width and text size against the stage width across aspect ratios', () => {
    const tall = overlayPx(text, { width: 1600, height: 2000 })
    expect(tall.width).toBe(800)
    expect(tall.fontSize).toBe(80)
    expect(tall.top).toBe(400)
  })

  it('gives a logo the height of its image aspect', () => {
    const logo = { ...newOverlay('logo', { src: 'blob:x', size: { width: 400, height: 100 } }), width: 20 }
    expect(overlayPx(logo, { width: 1000, height: 1000 })).toMatchObject({ width: 200, height: 50 })
  })
})

describe('CTA templates', () => {
  const ctas = TEMPLATES.filter((t) => t.settings.overlays?.length)

  it('ship a headline and a button with placeholder text next to one phone', () => {
    expect(ctas.map((t) => t.name)).toEqual(expect.arrayContaining(['CTA Left', 'Hero Headline']))
    for (const t of ctas) {
      const settings = applyTemplate(t)
      expect(settings.overlays.map((o) => o.kind)).toEqual(['text', 'button'])
      expect(settings.overlays.map((o) => (o.kind === 'logo' ? '' : o.text))).toEqual(['Your headline', 'Download app'])
      expect(settings.screens).toHaveLength(1)
      expect(settings.screens[0].deviceId).toMatch(/^iphone/)
    }
  })

  it('CTA Left is 16:9 with the phone on the right, and keeps the current screens (and so their media)', () => {
    const cta = TEMPLATES.find((t) => t.name === 'CTA Left')!
    const settings = applyTemplate(cta, [{ id: 'mine', deviceId: 'screenshot', dx: 0, dy: 0, scale: 1 }])
    expect(settings.ratio).toBe('16:9')
    expect(settings.screens[0].id).toBe('mine')
    expect(settings.screens[0].dx).toBeGreaterThan(0)
  })

  it('applying a template twice gives new overlay ids, so copies never share an id', () => {
    const cta = TEMPLATES.find((t) => t.name === 'CTA Left')!
    const a = applyTemplate(cta).overlays.map((o) => o.id)
    const b = applyTemplate(cta).overlays.map((o) => o.id)
    expect(a.some((id) => b.includes(id))).toBe(false)
  })
})

describe('overlays in settings', () => {
  it('defaults to no overlays, so projects saved before overlays open unchanged', () => {
    expect(DEFAULT_SETTINGS.overlays).toEqual([])
    const { overlays, ...phase6 } = DEFAULT_SETTINGS
    expect(restoreSettings(phase6).overlays).toEqual([])
  })

  it('keeps saved overlays', () => {
    const overlays = [newOverlay('text')]
    expect(restoreSettings({ overlays }).overlays).toEqual(overlays)
  })

  it('keeps the current overlays when a template has none, and replaces them when it brings its own', () => {
    const mine = [newOverlay('text')]
    const clean = TEMPLATES.find((t) => t.id === 'clean-gradient')!
    expect(applyTemplate(clean, [], mine).overlays).toBe(mine)
    const withText = { id: 't', name: 'T', settings: { overlays: [newOverlay('button')] } }
    const { id, ...button } = withText.settings.overlays[0]
    expect(applyTemplate(withText, [], mine).overlays).toEqual([{ ...button, id: expect.any(String) }])
  })
})
