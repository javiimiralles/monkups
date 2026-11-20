import { rotationCss } from './styles.ts'

export type AnimationPreset = 'none' | 'zoom-in' | 'zoom-out' | 'pan-down' | 'tilt' | 'pop' | 'float'

export type Animation = {
  preset: AnimationPreset
  /** Seconds. */
  duration: number
  /** Zoom focus in percent of the device box. */
  focus: { x: number; y: number }
}

export const ANIMATION_PRESETS: { id: AnimationPreset; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'zoom-in', label: 'Zoom In' },
  { id: 'zoom-out', label: 'Zoom Out' },
  { id: 'pan-down', label: 'Pan Down' },
  { id: 'tilt', label: 'Tilt' },
  { id: 'pop', label: 'Pop' },
  { id: 'float', label: 'Float' },
]

/** Presets that zoom around the focus point. */
export const ZOOM_PRESETS: AnimationPreset[] = ['zoom-in', 'zoom-out', 'pop']

/** Animated offset applied on top of the static design; tx/ty are percent of the device box, angles in degrees. */
export type Pose = { scale: number; tx: number; ty: number; rx: number; ry: number; rz: number }

export const IDENTITY: Pose = { scale: 1, tx: 0, ty: 0, rx: 0, ry: 0, rz: 0 }

const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const easeOutBack = (t: number) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ZOOM = 1.6

/** Pose of a preset at normalized time t in [0, 1]. */
export function poseAt(preset: AnimationPreset, t: number): Pose {
  const e = easeInOut(t)
  switch (preset) {
    case 'zoom-in':
      return { ...IDENTITY, scale: lerp(1, ZOOM, e) }
    case 'zoom-out':
      return { ...IDENTITY, scale: lerp(ZOOM, 1, e) }
    case 'pan-down':
      return { ...IDENTITY, scale: 1.5, ty: lerp(25, -25, e) }
    case 'tilt':
      return { ...IDENTITY, rx: lerp(0, 12, e), ry: lerp(0, -20, e), rz: lerp(0, 4, e) }
    case 'pop':
      return { ...IDENTITY, scale: lerp(0.6, 1, easeOutBack(t)) }
    case 'float': {
      // One full sine period, so the loop is seamless.
      const wave = Math.sin(2 * Math.PI * t)
      return { ...IDENTITY, ty: -3 * wave, rz: 1.5 * wave }
    }
    default:
      return IDENTITY
  }
}

export function poseCss(p: Pose): string {
  const rotation = rotationCss({ x: p.rx, y: p.ry, z: p.rz })
  if (p.scale === 1 && !p.tx && !p.ty && rotation === 'none') return 'none'
  const parts = [`translate(${p.tx}%, ${p.ty}%)`, `scale(${p.scale})`]
  if (rotation !== 'none') parts.push(rotation)
  return parts.join(' ')
}

/** Normalized sample times for an animation rendered at `fps`, both ends included. */
export function frameTimes(duration: number, fps: number): number[] {
  const n = Math.max(2, Math.round(duration * fps))
  return Array.from({ length: n }, (_, i) => i / (n - 1))
}
