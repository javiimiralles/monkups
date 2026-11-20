import type { AnglePreset, DeviceModel } from '../render3d/angles'

export type DeviceKind = 'screenshot' | 'browser' | 'phone' | 'tablet' | 'laptop' | '3d'

export type Device = {
  id: string
  label: string
  kind: DeviceKind
  /** Native screen resolution in pixels, for fixed-screen hardware. */
  screen?: [number, number]
  browser?: 'safari' | 'chrome'
  theme?: 'light' | 'dark'
  /** Realistic devices: the model the 3D renderer draws. */
  model?: DeviceModel
}

/**
 * Frame geometry in em, where every device is 100em wide.
 * The frame component sets font-size to width/100, so these numbers scale with the device.
 */
export const GEOMETRY = {
  phoneBezel: 4.5,
  tabletBezel: 5,
  laptopLidWidth: 88,
  laptopBezel: 2,
  laptopBase: 3.5,
  toolbar: { safari: 5, chrome: 8 },
} as const

export const DEVICES: Device[] = [
  { id: 'screenshot', label: 'Screenshot', kind: 'screenshot' },
  { id: 'safari-light', label: 'Safari Light', kind: 'browser', browser: 'safari', theme: 'light' },
  { id: 'safari-dark', label: 'Safari Dark', kind: 'browser', browser: 'safari', theme: 'dark' },
  { id: 'chrome-light', label: 'Chrome Light', kind: 'browser', browser: 'chrome', theme: 'light' },
  { id: 'chrome-dark', label: 'Chrome Dark', kind: 'browser', browser: 'chrome', theme: 'dark' },
  { id: 'iphone-17-pro', label: 'iPhone 17 Pro', kind: 'phone', screen: [1206, 2622] },
  { id: 'iphone-17-pro-max', label: 'iPhone 17 Pro Max', kind: 'phone', screen: [1320, 2868] },
  { id: 'iphone-16', label: 'iPhone 16', kind: 'phone', screen: [1179, 2556] },
  { id: 'ipad-pro-11', label: 'iPad Pro 11"', kind: 'tablet', screen: [1668, 2420] },
  { id: 'ipad-pro-13', label: 'iPad Pro 13"', kind: 'tablet', screen: [2064, 2752] },
  { id: 'macbook-air-13', label: 'MacBook Air 13"', kind: 'laptop', screen: [2560, 1664] },
  { id: 'macbook-pro-14', label: 'MacBook Pro 14"', kind: 'laptop', screen: [3024, 1964] },
  { id: 'phone-3d', label: 'Phone 3D', kind: '3d', model: 'phone' },
  { id: 'laptop-3d', label: 'Laptop 3D', kind: '3d', model: 'laptop' },
]

export const DEVICE_GROUPS: { label: string; kind: DeviceKind }[] = [
  { label: 'Screenshot', kind: 'screenshot' },
  { label: 'Browser', kind: 'browser' },
  { label: 'iPhone', kind: 'phone' },
  { label: 'iPad', kind: 'tablet' },
  { label: 'Mac', kind: 'laptop' },
  { label: 'Realistic', kind: '3d' },
]

/**
 * Width / height the 3D renderer frames each model at (`projectedAspect` in src/render3d/fit.ts).
 * Copied here so layout never loads three.js; a unit test keeps both in sync.
 */
const REALISTIC_ASPECT: Record<DeviceModel, Record<AnglePreset, number>> = {
  phone: { front: 0.5879, 'three-quarter-left': 0.5296, 'three-quarter-right': 0.5296, 'low-hero': 0.6058, top: 0.7055 },
  laptop: { front: 1.4925, 'three-quarter-left': 1.3584, 'three-quarter-right': 1.3584, 'low-hero': 1.915, top: 0.981 },
}

export function getDevice(id: string): Device {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0]
}

/**
 * Width / height of the whole device, frame included.
 * `stylePad` (em) is the frame style drawn around screenshots and browser windows; `angle` frames realistic devices.
 */
export function deviceAspect(device: Device, mediaAspect: number, stylePad = 0, angle: AnglePreset = 'front'): number {
  const screenAspect = device.screen ? device.screen[0] / device.screen[1] : mediaAspect
  const g = GEOMETRY
  const inner = 100 - 2 * stylePad
  switch (device.kind) {
    case 'screenshot':
      return 100 / (inner / mediaAspect + 2 * stylePad)
    case 'browser':
      return 100 / (inner / mediaAspect + g.toolbar[device.browser ?? 'safari'] + 2 * stylePad)
    case 'phone': {
      const screenWidth = 100 - 2 * g.phoneBezel
      return 100 / (screenWidth / screenAspect + 2 * g.phoneBezel)
    }
    case 'tablet': {
      const screenWidth = 100 - 2 * g.tabletBezel
      return 100 / (screenWidth / screenAspect + 2 * g.tabletBezel)
    }
    case 'laptop': {
      const screenWidth = g.laptopLidWidth - 2 * g.laptopBezel
      return 100 / (screenWidth / screenAspect + 2 * g.laptopBezel + g.laptopBase)
    }
    case '3d':
      return REALISTIC_ASPECT[device.model ?? 'phone'][angle]
  }
}

/** Largest box with the given aspect (width / height) that fits inside `box`. */
export function fitBox(box: { width: number; height: number }, aspect: number) {
  const width = Math.min(box.width, box.height * aspect)
  return { width, height: width / aspect }
}
