import { describe, expect, it } from 'vitest'
import { ANIMATION_PRESETS, IDENTITY, frameTimes, poseAt, poseCss } from './animation'
import { DEFAULT_SETTINGS, restoreSettings } from './project'

describe('poseAt', () => {
  it('starts and ends each zoom at its keyframes', () => {
    expect(poseAt('zoom-in', 0).scale).toBe(1)
    expect(poseAt('zoom-in', 1).scale).toBeCloseTo(1.6)
    expect(poseAt('zoom-out', 0).scale).toBeCloseTo(1.6)
    expect(poseAt('zoom-out', 1).scale).toBe(1)
  })

  it('eases in and out, moving slowest at both ends', () => {
    const early = poseAt('zoom-in', 0.1).scale - poseAt('zoom-in', 0).scale
    const middle = poseAt('zoom-in', 0.55).scale - poseAt('zoom-in', 0.45).scale
    expect(middle).toBeGreaterThan(early)
  })

  it('pans a zoomed device from its top to its bottom', () => {
    expect(poseAt('pan-down', 0).ty).toBeGreaterThan(0)
    expect(poseAt('pan-down', 1).ty).toBeLessThan(0)
  })

  it('loops float so the last frame matches the first (seamless GIFs)', () => {
    expect(poseAt('float', 1).ty).toBeCloseTo(poseAt('float', 0).ty)
  })

  it('stays still for None', () => {
    expect(poseAt('none', 0.5)).toEqual(IDENTITY)
  })

  it('offers None first', () => {
    expect(ANIMATION_PRESETS[0].id).toBe('none')
  })
})

describe('poseCss', () => {
  it('is none for the identity pose', () => {
    expect(poseCss(IDENTITY)).toBe('none')
  })

  it('composes translate, scale and rotation', () => {
    expect(poseCss({ scale: 1.5, tx: 0, ty: 10, rx: 5, ry: 0, rz: 0 })).toBe(
      'translate(0%, 10%) scale(1.5) perspective(4000px) rotateX(5deg) rotateY(0deg) rotateZ(0deg)',
    )
  })
})

describe('frameTimes', () => {
  it('samples the whole animation including both ends', () => {
    expect(frameTimes(1, 5)).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
})

describe('restoreSettings', () => {
  it('fills settings added after a project was saved', () => {
    const { animation, ...older } = DEFAULT_SETTINGS
    expect(restoreSettings(older).animation).toEqual(animation)
  })
})
