import { fitBox } from './devices.ts'

export type Rect = { x: number; y: number; width: number; height: number }
export type LayoutPreset = 'row' | 'cascade' | 'grid'
export type Layout = { preset: LayoutPreset; /** Space between screens, in percent of the stage width. */ gap: number }

export const LAYOUT_PRESETS: { id: LayoutPreset; label: string }[] = [
  { id: 'row', label: 'Row' },
  { id: 'cascade', label: 'Cascade' },
  { id: 'grid', label: 'Grid' },
]

/** Space kept around the composition, as a fraction of the stage width on every side. */
export const PADDING = 0.08

/** How far each cascade screen steps right (fraction of the widest screen) and down (fraction of the height). */
const CASCADE = { x: 0.55, y: 0.08 }

/**
 * Slots for screens of the given aspects (width / height), in stage pixels.
 * Every preset puts a single screen in the largest centered box, as a one-device design always did.
 */
export function layoutScreens(
  preset: LayoutPreset,
  gap: number,
  stage: { width: number; height: number },
  aspects: number[],
): Rect[] {
  const pad = PADDING * stage.width
  const inner = { x: pad, y: pad, width: stage.width - 2 * pad, height: stage.height - 2 * pad }
  const g = (gap / 100) * stage.width
  const n = aspects.length
  // Centers a block of the given size on the stage (the padding is symmetric).
  const origin = (w: number, h: number) => ({ x: (stage.width - w) / 2, y: (stage.height - h) / 2 })

  if (n === 1) {
    // Exactly the one-device box, so single-screen designs render as before.
    const size = fitBox(inner, aspects[0])
    return [{ ...origin(size.width, size.height), ...size }]
  }

  if (preset === 'grid') {
    const cols = n <= 2 ? n : n <= 4 ? 2 : 3
    const rows = Math.ceil(n / cols)
    const cell = { width: (inner.width - (cols - 1) * g) / cols, height: (inner.height - (rows - 1) * g) / rows }
    return aspects.map((a, i) => {
      const row = Math.floor(i / cols)
      const inRow = Math.min(cols, n - row * cols)
      // An incomplete last row is centered.
      const x0 = inner.x + ((cols - inRow) * (cell.width + g)) / 2
      const width = Math.min(cell.width, cell.height * a)
      const height = width / a
      return {
        x: x0 + (i % cols) * (cell.width + g) + (cell.width - width) / 2,
        y: inner.y + row * (cell.height + g) + (cell.height - height) / 2,
        width,
        height,
      }
    })
  }

  if (preset === 'cascade') {
    const widest = Math.max(...aspects)
    // Every screen shares one height h; the block is h * (steps + last width) wide and h * (1 + steps) tall.
    const h = Math.min(
      inner.width / (CASCADE.x * widest * (n - 1) + aspects[n - 1]),
      inner.height / (1 + CASCADE.y * (n - 1)),
    )
    const blockW = CASCADE.x * widest * h * (n - 1) + aspects[n - 1] * h
    const o = origin(blockW, h * (1 + CASCADE.y * (n - 1)))
    // A wider earlier screen could stick out past the block; keep each inside the padded stage.
    return aspects.map((a, i) => ({
      x: Math.min(o.x + i * CASCADE.x * widest * h, inner.x + inner.width - a * h),
      y: o.y + i * CASCADE.y * h,
      width: a * h,
      height: h,
    }))
  }

  // Row: one shared height, evenly spaced by the gap.
  const total = aspects.reduce((sum, a) => sum + a, 0)
  const h = Math.min(inner.height, (inner.width - (n - 1) * g) / total)
  const o = origin(total * h + (n - 1) * g, h)
  let x = o.x
  return aspects.map((a) => {
    const rect = { x, y: o.y, width: a * h, height: h }
    x += a * h + g
    return rect
  })
}

/** Applies a screen's own scale (around its slot centre) and offset (percent of the stage). */
export function placeScreen(
  slot: Rect,
  { dx, dy, scale }: { dx: number; dy: number; scale: number },
  stage: { width: number; height: number },
): Rect {
  const width = slot.width * scale
  const height = slot.height * scale
  return {
    x: slot.x + (slot.width - width) / 2 + (dx / 100) * stage.width,
    y: slot.y + (slot.height - height) / 2 + (dy / 100) * stage.height,
    width,
    height,
  }
}
