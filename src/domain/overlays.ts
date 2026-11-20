import type { MediaSize } from './project'

/** Curated, locally bundled fonts; `family` is the CSS family name each package registers. */
export const FONTS = [
  { id: 'hanken-grotesk', label: 'Hanken Grotesk', family: "'Hanken Grotesk Variable', sans-serif" },
  { id: 'inter', label: 'Inter', family: "'Inter Variable', sans-serif" },
  { id: 'dm-sans', label: 'DM Sans', family: "'DM Sans Variable', sans-serif" },
  { id: 'space-grotesk', label: 'Space Grotesk', family: "'Space Grotesk Variable', sans-serif" },
  { id: 'fraunces', label: 'Fraunces', family: "'Fraunces Variable', serif" },
  { id: 'instrument-serif', label: 'Instrument Serif', family: "'Instrument Serif', serif" },
] as const

export type FontId = (typeof FONTS)[number]['id']
export const fontFamily = (id: FontId) => (FONTS.find((f) => f.id === id) ?? FONTS[0]).family

/** Position and width are in percent of the stage (x and width of its width, y of its height). */
type Placed = { id: string; x: number; y: number; width: number; rotation: number; opacity: number }

export type TextStyle = {
  text: string
  font: FontId
  /** Font size in percent of the stage width, so text scales with the export like the watermark. */
  size: number
  weight: number
  italic: boolean
  color: string
  align: 'left' | 'center' | 'right'
  lineHeight: number
  /** In em. */
  letterSpacing: number
  uppercase: boolean
}

export type TextOverlay = Placed & TextStyle & { kind: 'text' }
/** A pill: text on a fill. Radius, padding and border are in em, so they follow the text size. */
export type ButtonOverlay = Placed &
  TextStyle & { kind: 'button'; fill: string; radius: number; padX: number; padY: number; border: number }
/** `src` is a blob URL while editing; saved projects keep the image as a blob next to the settings. */
export type LogoOverlay = Placed & { kind: 'logo'; src: string; size: MediaSize }
export type Overlay = TextOverlay | ButtonOverlay | LogoOverlay
export type OverlayKind = Overlay['kind']

const placed = (x: number, y: number, width: number): Placed => ({
  id: crypto.randomUUID(),
  x,
  y,
  width,
  rotation: 0,
  opacity: 100,
})

const textStyle: TextStyle = {
  text: 'Your headline',
  font: 'hanken-grotesk',
  size: 6,
  weight: 800,
  italic: false,
  color: '#ffffff',
  align: 'left',
  lineHeight: 1.1,
  letterSpacing: 0,
  uppercase: false,
}

export function newOverlay(kind: 'text' | 'button'): TextOverlay | ButtonOverlay
export function newOverlay(kind: 'logo', image: { src: string; size: MediaSize }): LogoOverlay
export function newOverlay(kind: OverlayKind, image?: { src: string; size: MediaSize }): Overlay {
  if (kind === 'logo') return { ...placed(6, 6, 14), kind, src: image!.src, size: image!.size }
  if (kind === 'button')
    return {
      ...placed(8, 62, 40),
      ...textStyle,
      kind,
      text: 'Download app',
      size: 2.2,
      weight: 700,
      color: '#111111',
      align: 'center',
      letterSpacing: 0.06,
      uppercase: true,
      fill: '#ffffff',
      radius: 2,
      padX: 1.6,
      padY: 0.8,
      border: 0,
    }
  return { ...placed(8, 24, 50), ...textStyle, kind }
}

/** Stage pixels of an overlay. Text and buttons get their height from their content; a logo from its image. */
export function overlayPx(o: Overlay, stage: { width: number; height: number }) {
  const width = (o.width / 100) * stage.width
  return {
    left: (o.x / 100) * stage.width,
    top: (o.y / 100) * stage.height,
    width,
    height: o.kind === 'logo' ? (width * o.size.height) / o.size.width : undefined,
    fontSize: o.kind === 'logo' ? undefined : (o.size / 100) * stage.width,
  }
}
