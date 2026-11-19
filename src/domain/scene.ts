export type RatioId = '4:3' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16' | '16:9' | '3:2' | '5:4'
export type ShadowMode = 'none' | 'spread' | 'hug'
export type Background =
  | { kind: 'transparent' }
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number }
  | { kind: 'image'; url: string; blur: number; credit?: { name: string; link: string } }

export const RATIOS: { id: RatioId; label: string }[] = [
  { id: '4:3', label: 'Default 4:3' },
  { id: '1:1', label: 'Square 1:1' },
  { id: '4:5', label: 'Portrait 4:5' },
  { id: '3:4', label: 'Portrait 3:4' },
  { id: '2:3', label: 'Portrait 2:3' },
  { id: '9:16', label: 'Story 9:16' },
  { id: '16:9', label: 'Wide 16:9' },
  { id: '3:2', label: 'Landscape 3:2' },
  { id: '5:4', label: 'Landscape 5:4' },
]

export const RADIUS_PRESETS = { Sharp: 0, Curved: 20, Round: 48 } as const

export const GRADIENT_PRESETS: [string, string][] = [
  ['#ff6a3d', '#7b2ff7'],
  ['#00c6ff', '#0072ff'],
  ['#f7971e', '#ffd200'],
  ['#11998e', '#38ef7d'],
  ['#fc466b', '#3f5efb'],
  ['#232526', '#414345'],
]

const LONG_SIDE = 1920

export function frameSize(id: RatioId): { width: number; height: number } {
  const [w, h] = id.split(':').map(Number)
  return w >= h
    ? { width: LONG_SIDE, height: Math.round((LONG_SIDE * h) / w) }
    : { width: Math.round((LONG_SIDE * w) / h), height: LONG_SIDE }
}

export function shadowCss(mode: ShadowMode, opacityPercent: number): string {
  const color = `rgba(0, 0, 0, ${opacityPercent / 100})`
  if (mode === 'spread') return `0 40px 120px ${color}`
  if (mode === 'hug') return `0 6px 18px ${color}`
  return 'none'
}

export function backgroundCss(bg: Background): string {
  if (bg.kind === 'solid') return bg.color
  if (bg.kind === 'gradient') return `linear-gradient(${bg.angle}deg, ${bg.from}, ${bg.to})`
  // JSON string escaping is also valid CSS string escaping.
  if (bg.kind === 'image') return `center / cover no-repeat url(${JSON.stringify(bg.url)})`
  return 'transparent'
}

export type SceneKind = 'none' | 'blinds' | 'window' | 'vignette' | 'shapes'

export const SCENES: { id: SceneKind; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'blinds', label: 'Blinds' },
  { id: 'window', label: 'Window' },
  { id: 'vignette', label: 'Vignette' },
  { id: 'shapes', label: 'Shapes' },
]

const SHADE = 'rgba(0, 0, 0, 0.6)'

/** Procedural overlay for a scene: shadows fall in front of the device, shapes sit behind it. */
export function sceneLayer(kind: SceneKind): { background: string; blur: number; front: boolean } | null {
  switch (kind) {
    case 'blinds':
      return {
        background: `repeating-linear-gradient(115deg, transparent 0 70px, ${SHADE} 70px 140px)`,
        blur: 16,
        front: true,
      }
    case 'window':
      return {
        background: [
          `linear-gradient(90deg, transparent 46%, ${SHADE} 46% 54%, transparent 54%)`,
          `linear-gradient(0deg, transparent 46%, ${SHADE} 46% 54%, transparent 54%)`,
          `linear-gradient(110deg, ${SHADE} 0 18%, transparent 18% 78%, ${SHADE} 78%)`,
        ].join(', '),
        blur: 28,
        front: true,
      }
    case 'vignette':
      return { background: `radial-gradient(ellipse at center, transparent 45%, ${SHADE} 100%)`, blur: 0, front: true }
    case 'shapes':
      return {
        background: [
          'radial-gradient(circle at 18% 24%, rgba(255, 255, 255, 0.5) 0 11%, transparent 11.3%)',
          'radial-gradient(circle at 84% 80%, rgba(255, 255, 255, 0.3) 0 15%, transparent 15.3%)',
          'radial-gradient(circle at 86% 16%, rgba(0, 0, 0, 0.2) 0 6%, transparent 6.3%)',
        ].join(', '),
        blur: 2,
        front: false,
      }
    default:
      return null
  }
}

export type WatermarkPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
