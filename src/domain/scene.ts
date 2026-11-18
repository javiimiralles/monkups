export type RatioId = '4:3' | '1:1' | '4:5' | '3:4' | '2:3' | '9:16' | '16:9' | '3:2' | '5:4'
export type ShadowMode = 'none' | 'spread' | 'hug'
export type Background =
  | { kind: 'transparent' }
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number }

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
  return 'transparent'
}
