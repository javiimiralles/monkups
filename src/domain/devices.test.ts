import { describe, expect, it } from 'vitest'
import { ANGLE_PRESETS } from '../render3d/angles'
import { projectedAspect } from '../render3d/fit'
import { DEVICES, deviceAspect, fitBox, getDevice } from './devices'

describe('fitBox', () => {
  it('fills the width when the box is relatively taller', () => {
    expect(fitBox({ width: 1000, height: 1000 }, 2)).toEqual({ width: 1000, height: 500 })
  })

  it('fills the height when the box is relatively wider', () => {
    expect(fitBox({ width: 1000, height: 400 }, 0.5)).toEqual({ width: 200, height: 400 })
  })
})

describe('deviceAspect', () => {
  const media = 1.5

  it('follows the media for the screenshot frame', () => {
    expect(deviceAspect(getDevice('screenshot'), media)).toBe(1.5)
  })

  it('adds the toolbar height to browser windows', () => {
    // 100em wide; content is 100/1.5em tall plus a 5em Safari toolbar.
    expect(deviceAspect(getDevice('safari-light'), media)).toBeCloseTo(100 / (100 / 1.5 + 5))
  })

  it('ignores the media for fixed-screen hardware', () => {
    const phone = getDevice('iphone-17-pro')
    expect(deviceAspect(phone, media)).toBe(deviceAspect(phone, 0.3))
    expect(deviceAspect(phone, media)).toBeLessThan(0.5)
    expect(deviceAspect(getDevice('macbook-pro-14'), media)).toBeGreaterThan(1.5)
  })
})

describe('realistic devices', () => {
  it('offers a 3D phone and a 3D laptop', () => {
    expect(getDevice('phone-3d')).toMatchObject({ kind: '3d', model: 'phone', label: 'Phone 3D' })
    expect(getDevice('laptop-3d')).toMatchObject({ kind: '3d', model: 'laptop', label: 'Laptop 3D' })
  })

  it('takes the aspect the renderer frames for each angle, whatever the media', () => {
    for (const model of ['phone', 'laptop'] as const)
      for (const angle of ANGLE_PRESETS) {
        const device = getDevice(`${model}-3d`)
        expect(deviceAspect(device, 1.5, 0, angle)).toBeCloseTo(projectedAspect(model, angle), 3)
        expect(deviceAspect(device, 0.4, 3, angle)).toBe(deviceAspect(device, 1.5, 0, angle))
      }
  })
})

describe('DEVICES', () => {
  it('has unique ids and covers every family from the spec', () => {
    const ids = DEVICES.map((d) => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(DEVICES.map((d) => d.kind))).toEqual(new Set(['screenshot', 'browser', 'phone', 'tablet', 'laptop', '3d']))
    expect(ids).toEqual(expect.arrayContaining(['safari-light', 'safari-dark', 'chrome-light', 'chrome-dark']))
  })

  it('falls back to the screenshot frame for unknown ids', () => {
    expect(getDevice('nope').id).toBe('screenshot')
  })
})
