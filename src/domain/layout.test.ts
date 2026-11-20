import { describe, expect, it } from 'vitest'
import { fitBox } from './devices'
import { LAYOUT_PRESETS, PADDING, layoutScreens, placeScreen, type Rect } from './layout'

const stage = { width: 1920, height: 1080 }
const pad = PADDING * stage.width
const inner = { width: stage.width - 2 * pad, height: stage.height - 2 * pad }
const PHONE = 0.47
const mixed = [PHONE, 1.6, 0.75, 1, PHONE, 1.33]
const eps = 1e-6

const inside = (r: Rect) =>
  r.x >= pad - eps &&
  r.y >= pad - eps &&
  r.x + r.width <= stage.width - pad + eps &&
  r.y + r.height <= stage.height - pad + eps

describe('layoutScreens', () => {
  for (const preset of LAYOUT_PRESETS.map((p) => p.id)) {
    it(`${preset}: 1 to 6 screens stay inside the padded stage with their aspect`, () => {
      for (let n = 1; n <= 6; n++) {
        const aspects = mixed.slice(0, n)
        const rects = layoutScreens(preset, 4, stage, aspects)
        expect(rects).toHaveLength(n)
        rects.forEach((r, i) => {
          expect(inside(r)).toBe(true)
          expect(r.width / r.height).toBeCloseTo(aspects[i])
        })
      }
    })

    it(`${preset}: one screen is the single centered box of a one-device design`, () => {
      const size = fitBox(inner, PHONE)
      expect(layoutScreens(preset, 4, stage, [PHONE])).toEqual([
        { x: (stage.width - size.width) / 2, y: (stage.height - size.height) / 2, ...size },
      ])
    })
  }

  it('row: slots never overlap, keep the same height and are evenly spaced by the gap', () => {
    for (let n = 2; n <= 6; n++) {
      const rects = layoutScreens('row', 4, stage, Array(n).fill(PHONE))
      for (let i = 1; i < n; i++) {
        expect(rects[i].x).toBeGreaterThanOrEqual(rects[i - 1].x + rects[i - 1].width - eps)
        expect(rects[i].height).toBeCloseTo(rects[0].height)
        expect(rects[i].x - (rects[i - 1].x + rects[i - 1].width)).toBeCloseTo(0.04 * stage.width)
      }
    }
  })
})

describe('placeScreen', () => {
  it('scales around the slot centre and offsets in percent of the stage', () => {
    const r = placeScreen({ x: 100, y: 100, width: 200, height: 100 }, { dx: 10, dy: -10, scale: 0.5 }, stage)
    expect(r).toEqual({ x: 150 + 192, y: 125 - 108, width: 100, height: 50 })
  })
})
