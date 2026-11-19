import { describe, expect, it } from 'vitest'
import { RATIOS, SCENES, backgroundCss, frameSize, sceneLayer, shadowCss } from './scene'

describe('frameSize', () => {
  it('keeps the Shots default of 1920×1440 for 4:3', () => {
    expect(frameSize('4:3')).toEqual({ width: 1920, height: 1440 })
  })

  it('uses a 1920px long side for portrait and square ratios', () => {
    expect(frameSize('9:16')).toEqual({ width: 1080, height: 1920 })
    expect(frameSize('1:1')).toEqual({ width: 1920, height: 1920 })
  })

  it('offers every ratio from the spec, 4:3 first', () => {
    expect(RATIOS.map((r) => r.id)).toEqual(['4:3', '1:1', '4:5', '3:4', '2:3', '9:16', '16:9', '3:2', '5:4'])
  })
})

describe('shadowCss', () => {
  it('returns none for the None mode', () => {
    expect(shadowCss('none', 40)).toBe('none')
  })

  it('maps opacity percent into the shadow color', () => {
    expect(shadowCss('spread', 40)).toBe('0 40px 120px rgba(0, 0, 0, 0.4)')
    expect(shadowCss('hug', 100)).toBe('0 6px 18px rgba(0, 0, 0, 1)')
  })
})

describe('backgroundCss', () => {
  it('renders each background kind', () => {
    expect(backgroundCss({ kind: 'transparent' })).toBe('transparent')
    expect(backgroundCss({ kind: 'solid', color: '#ff0000' })).toBe('#ff0000')
    expect(backgroundCss({ kind: 'gradient', from: '#000000', to: '#ffffff', angle: 135 })).toBe(
      'linear-gradient(135deg, #000000, #ffffff)',
    )
  })
})

describe('image backgrounds', () => {
  it('covers the stage with the image, quoting the url safely', () => {
    expect(backgroundCss({ kind: 'image', url: 'blob:http://x/1', blur: 0 })).toBe(
      'center / cover no-repeat url("blob:http://x/1")',
    )
    expect(backgroundCss({ kind: 'image', url: 'a"b', blur: 0 })).toBe('center / cover no-repeat url("a\\"b")')
  })
})

describe('sceneLayer', () => {
  it('has no layer for None', () => {
    expect(sceneLayer('none')).toBeNull()
  })

  it('casts shadow overlays in front of the device and shapes behind it', () => {
    expect(sceneLayer('blinds')?.front).toBe(true)
    expect(sceneLayer('window')?.front).toBe(true)
    expect(sceneLayer('vignette')?.front).toBe(true)
    expect(sceneLayer('shapes')?.front).toBe(false)
  })

  it('lists every scene with None first', () => {
    expect(SCENES.map((s) => s.id)).toEqual(['none', 'blinds', 'window', 'vignette', 'shapes'])
  })
})
