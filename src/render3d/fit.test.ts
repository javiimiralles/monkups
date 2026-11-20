import { PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { ANGLE_PRESETS } from './angles'
import { applyFraming, framing, projectedAspect } from './fit'
import { LAPTOP, laptopBounds } from './laptop'
import { PHONE } from './phone'

describe('projectedAspect', () => {
  it('frames the front phone close to its real proportions', () => {
    const aspect = projectedAspect('phone', 'front')
    expect(aspect).toBeGreaterThan(PHONE.w / PHONE.h)
    expect(aspect).toBeLessThan((PHONE.w / PHONE.h) * 1.35)
  })

  it('frames the open laptop wider than tall except from above', () => {
    for (const angle of ANGLE_PRESETS.filter((a) => a !== 'top'))
      expect(projectedAspect('laptop', angle)).toBeGreaterThan(1)
    expect(projectedAspect('laptop', 'top')).toBeGreaterThan(0.7)
  })

  it('frames the phone wider when it lies flat for the top view', () => {
    expect(projectedAspect('phone', 'top')).toBeGreaterThan(projectedAspect('phone', 'front'))
  })
})

describe('framing', () => {
  it('keeps every device corner inside the framed region', () => {
    for (const angle of ANGLE_PRESETS) {
      const f = framing('laptop', angle)
      for (const p of laptopBounds()) {
        const q = new Vector3(...p).project(f.camera)
        expect(q.x).toBeGreaterThanOrEqual(f.region.minX)
        expect(q.x).toBeLessThanOrEqual(f.region.maxX)
        expect(q.y).toBeGreaterThanOrEqual(f.region.minY)
        expect(q.y).toBeLessThanOrEqual(f.region.maxY)
      }
    }
  })

  it('puts the laptop on the floor and the open lid above the base', () => {
    const f = framing('laptop', 'front')
    expect(f.floorY).toBe(0)
    const top = Math.max(...laptopBounds().map((p) => p[1]))
    expect(top).toBeGreaterThan(LAPTOP.lidH * 0.9)
  })

  it('crops the camera to the canvas aspect without stretching', () => {
    const f = framing('phone', 'front')
    const cam = new PerspectiveCamera()
    applyFraming(cam, f, 2)
    expect(cam.view!.width / cam.view!.height).toBeCloseTo(2)
    applyFraming(cam, f, 0.25)
    expect(cam.view!.width / cam.view!.height).toBeCloseTo(0.25)
  })
})
