/** Camera presets, device colours and screen fitting: pure data, no three.js. */

export type DeviceModel = 'phone' | 'laptop'
export type AnglePreset = 'front' | 'three-quarter-left' | 'three-quarter-right' | 'low-hero' | 'top'
export type DeviceColor = 'silver' | 'space-black'

export const ANGLE_PRESETS: readonly AnglePreset[] = [
  'front',
  'three-quarter-left',
  'three-quarter-right',
  'low-hero',
  'top',
]
export const DEVICE_COLORS: readonly DeviceColor[] = ['silver', 'space-black']

export type Vec3 = [number, number, number]

export interface CameraPose {
  /** Unit vector from the device towards the camera. */
  direction: Vec3
  /** Vertical field of view in degrees. */
  fov: number
  /** Rotation of the device around X before framing (the phone lies flat for the top view). */
  tilt: number
}

// [azimuth, elevation, fov] in degrees; azimuth 0 faces the screen, negative moves the camera left.
const POSES: Record<DeviceModel, Record<AnglePreset, [number, number, number]>> = {
  phone: {
    front: [0, 0, 26],
    'three-quarter-left': [-34, 8, 26],
    'three-quarter-right': [34, 8, 26],
    'low-hero': [22, -14, 30],
    top: [0, 62, 28],
  },
  laptop: {
    front: [0, 14, 26],
    'three-quarter-left': [-38, 20, 28],
    'three-quarter-right': [38, 20, 28],
    'low-hero': [26, 5, 32],
    top: [0, 58, 28],
  },
}

const rad = (deg: number) => (deg * Math.PI) / 180

export function cameraPose(model: DeviceModel, angle: AnglePreset): CameraPose {
  const [az, el, fov] = POSES[model][angle]
  const tilt = model === 'phone' && angle === 'top' ? -Math.PI / 2 : 0
  const direction: Vec3 = [
    Math.sin(rad(az)) * Math.cos(rad(el)),
    Math.sin(rad(el)),
    Math.cos(rad(az)) * Math.cos(rad(el)),
  ]
  return { direction, fov, tilt }
}

/** sRGB hex colours of the device materials. */
export function deviceColors(color: DeviceColor) {
  return color === 'silver'
    ? { body: 0xc4c7cc, back: 0xd9dbde, keys: 0x0b0b0c, hinge: 0x8c8f94 }
    : { body: 0x3a3b3f, back: 0x2e2f33, keys: 0x070708, hinge: 0x1f2023 }
}

/**
 * Texture repeat/offset that fills a screen of `screenAspect` (width / height) with an image of
 * `imageAspect` like CSS `object-fit: cover`; tall images keep their top, wide ones stay centred.
 * Texture space has v = 0 at the image top (textures are uploaded with `flipY = false`).
 */
export function coverFit(imageAspect: number, screenAspect: number) {
  if (imageAspect > screenAspect) {
    const rx = screenAspect / imageAspect
    return { repeat: [rx, 1] as const, offset: [(1 - rx) / 2, 0] as const }
  }
  const ry = imageAspect / screenAspect
  return { repeat: [1, ry] as const, offset: [0, 0] as const }
}
