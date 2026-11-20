import { describe, expect, it } from 'vitest'
import { ANGLE_PRESETS, DEVICE_COLORS, cameraPose, coverFit, deviceColors } from './angles'

const len = (v: readonly number[]) => Math.hypot(...v)

describe('cameraPose', () => {
  it('lists the five presets and two colours', () => {
    expect(ANGLE_PRESETS).toEqual(['front', 'three-quarter-left', 'three-quarter-right', 'low-hero', 'top'])
    expect(DEVICE_COLORS).toEqual(['silver', 'space-black'])
  })

  it('returns a unit view direction and a sane field of view for every model and preset', () => {
    for (const model of ['phone', 'laptop'] as const)
      for (const angle of ANGLE_PRESETS) {
        const pose = cameraPose(model, angle)
        expect(len(pose.direction)).toBeCloseTo(1)
        expect(pose.fov).toBeGreaterThanOrEqual(15)
        expect(pose.fov).toBeLessThanOrEqual(50)
      }
  })

  it('looks straight at the phone screen from the front', () => {
    const pose = cameraPose('phone', 'front')
    expect(pose.direction[0]).toBeCloseTo(0)
    expect(pose.direction[1]).toBeCloseTo(0)
    expect(pose.direction[2]).toBeCloseTo(1)
    expect(pose.tilt).toBe(0)
  })

  it('places the camera on the left for 3/4 left and mirrors it for 3/4 right', () => {
    for (const model of ['phone', 'laptop'] as const) {
      const left = cameraPose(model, 'three-quarter-left').direction
      const right = cameraPose(model, 'three-quarter-right').direction
      expect(left[0]).toBeLessThan(0)
      expect(right[0]).toBeCloseTo(-left[0])
      expect(right[1]).toBeCloseTo(left[1])
      expect(right[2]).toBeCloseTo(left[2])
    }
  })

  it('shoots the hero from below the top view and the top view from high above', () => {
    for (const model of ['phone', 'laptop'] as const) {
      expect(cameraPose(model, 'low-hero').direction[1]).toBeLessThan(cameraPose(model, 'front').direction[1] + 0.2)
      expect(cameraPose(model, 'top').direction[1]).toBeGreaterThan(0.75)
    }
  })

  it('lays the phone flat, screen up, for the top view only', () => {
    expect(cameraPose('phone', 'top').tilt).toBeCloseTo(-Math.PI / 2)
    expect(cameraPose('laptop', 'top').tilt).toBe(0)
  })
})

describe('deviceColors', () => {
  it('makes space black darker than silver', () => {
    const lum = (hex: number) => ((hex >> 16) & 255) + ((hex >> 8) & 255) + (hex & 255)
    expect(lum(deviceColors('space-black').body)).toBeLessThan(lum(deviceColors('silver').body))
  })
})

describe('coverFit', () => {
  it('keeps a matching image untouched', () => {
    expect(coverFit(2, 2)).toEqual({ repeat: [1, 1], offset: [0, 0] })
  })

  it('crops the sides of an image wider than the screen, centred', () => {
    const fit = coverFit(2, 1)
    expect(fit.repeat[0]).toBeCloseTo(0.5)
    expect(fit.repeat[1]).toBe(1)
    expect(fit.offset[0]).toBeCloseTo(0.25)
  })

  it('crops the bottom of an image taller than the screen, keeping its top', () => {
    const fit = coverFit(0.5, 1)
    expect(fit.repeat[0]).toBe(1)
    expect(fit.repeat[1]).toBeCloseTo(0.5)
    expect(fit.offset[1]).toBe(0)
  })
})
