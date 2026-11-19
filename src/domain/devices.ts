export type DeviceKind = 'screenshot' | 'browser' | 'phone' | 'tablet' | 'laptop'

export type Device = {
  id: string
  label: string
  kind: DeviceKind
  /** Native screen resolution in pixels, for fixed-screen hardware. */
  screen?: [number, number]
  browser?: 'safari' | 'chrome'
  theme?: 'light' | 'dark'
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
]

export const DEVICE_GROUPS: { label: string; kind: DeviceKind }[] = [
  { label: 'Screenshot', kind: 'screenshot' },
  { label: 'Browser', kind: 'browser' },
  { label: 'iPhone', kind: 'phone' },
  { label: 'iPad', kind: 'tablet' },
  { label: 'Mac', kind: 'laptop' },
]

export function getDevice(id: string): Device {
  return DEVICES.find((d) => d.id === id) ?? DEVICES[0]
}

/** Width / height of the whole device, frame included. */
export function deviceAspect(device: Device, mediaAspect: number): number {
  const screenAspect = device.screen ? device.screen[0] / device.screen[1] : mediaAspect
  const g = GEOMETRY
  switch (device.kind) {
    case 'browser':
      return 100 / (100 / mediaAspect + g.toolbar[device.browser ?? 'safari'])
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
    default:
      return mediaAspect
  }
}

/** Largest box with the given aspect (width / height) that fits inside `box`. */
export function fitBox(box: { width: number; height: number }, aspect: number) {
  const width = Math.min(box.width, box.height * aspect)
  return { width, height: width / aspect }
}
