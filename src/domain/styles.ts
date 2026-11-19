export type FrameStyle = 'default' | 'glass-light' | 'glass-dark' | 'inset-light' | 'inset-dark' | 'outline' | 'border'

/** `pad` is the space the style draws around the frame, in em of a 100em-wide device. */
export const FRAME_STYLES: { id: FrameStyle; label: string; pad: number }[] = [
  { id: 'default', label: 'Default', pad: 0 },
  { id: 'glass-light', label: 'Glass Light', pad: 2.5 },
  { id: 'glass-dark', label: 'Glass Dark', pad: 2.5 },
  { id: 'inset-light', label: 'Inset Light', pad: 2 },
  { id: 'inset-dark', label: 'Inset Dark', pad: 2 },
  { id: 'outline', label: 'Outline', pad: 0 },
  { id: 'border', label: 'Border', pad: 1.2 },
]

export function stylePad(id: FrameStyle): number {
  return FRAME_STYLES.find((s) => s.id === id)?.pad ?? 0
}

export type Rotation = { x: number; y: number; z: number }

export function rotationCss({ x, y, z }: Rotation): string {
  if (!x && !y && !z) return 'none'
  return `perspective(4000px) rotateX(${x}deg) rotateY(${y}deg) rotateZ(${z}deg)`
}
