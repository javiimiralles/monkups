import { describe, expect, it } from 'vitest'
import { deviceAspect, getDevice } from './devices'
import { FRAME_STYLES, rotationCss, stylePad } from './styles'

describe('FRAME_STYLES', () => {
  it('offers the Shots style set with Default first', () => {
    expect(FRAME_STYLES.map((s) => s.label)).toEqual([
      'Default',
      'Glass Light',
      'Glass Dark',
      'Inset Light',
      'Inset Dark',
      'Outline',
      'Border',
    ])
  })

  it('pads only the styles that draw around the frame', () => {
    expect(stylePad('default')).toBe(0)
    expect(stylePad('outline')).toBe(0)
    expect(stylePad('glass-light')).toBeGreaterThan(0)
    expect(stylePad('border')).toBeGreaterThan(0)
  })
})

describe('deviceAspect with a style pad', () => {
  it('adds the pad around a screenshot', () => {
    // 100em wide: media is 90em wide and 90/1.5 = 60em tall, plus 5em top and bottom.
    expect(deviceAspect(getDevice('screenshot'), 1.5, 5)).toBeCloseTo(100 / 70)
  })

  it('adds the pad around a browser window and its toolbar', () => {
    expect(deviceAspect(getDevice('safari-light'), 1.5, 5)).toBeCloseTo(100 / (90 / 1.5 + 5 + 10))
  })

  it('keeps hardware frames unchanged', () => {
    const phone = getDevice('iphone-17-pro')
    expect(deviceAspect(phone, 1.5, 5)).toBe(deviceAspect(phone, 1.5))
  })
})

describe('rotationCss', () => {
  it('is none without rotation', () => {
    expect(rotationCss({ x: 0, y: 0, z: 0 })).toBe('none')
  })

  it('composes a perspective transform', () => {
    expect(rotationCss({ x: 10, y: -20, z: 5 })).toBe('perspective(4000px) rotateX(10deg) rotateY(-20deg) rotateZ(5deg)')
  })
})
