import { z } from 'zod'
import { ANIMATION_PRESETS } from './animation'
import { DEVICES } from './devices'
import { LAYOUT_PRESETS } from './layout'
import { FONTS, newOverlay, type Overlay } from './overlays'
import { MAX_SCREENS, newScreen, type MediaSize, type Settings } from './project'
import { RATIOS, SCENES } from './scene'
import { FRAME_STYLES } from './styles'
import { ANGLE_PRESETS, DEVICE_COLORS } from '../render3d/angles'

const oneOf = <T extends string>(values: readonly T[]) => z.enum(values as [T, ...T[]])
const ids = <T extends string>(list: readonly { id: T }[]) => oneOf(list.map((x) => x.id))

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'a #rrggbb colour')
const percent = z.number().min(0).max(100)

const screen = z.strictObject({
  deviceId: ids(DEVICES).describe('Device frame; *-3d are realistic 3D models that use angle and color'),
  dx: z.number().min(-60).max(60).optional().describe('Offset from the layout slot, % of stage width'),
  dy: z.number().min(-60).max(60).optional().describe('Offset from the layout slot, % of stage height'),
  scale: z.number().min(0.2).max(2).optional().describe('Size relative to the layout slot'),
  angle: oneOf(ANGLE_PRESETS).optional(),
  color: oneOf(DEVICE_COLORS).optional(),
})

const textStyle = {
  /** Existing overlay to update; omit to add a new one. */
  id: z.string().optional().describe('Id of an existing overlay to update; omit to add a new one'),
  text: z.string().max(200).optional(),
  x: percent.optional().describe('Left edge, % of stage width'),
  y: percent.optional().describe('Top edge, % of stage height'),
  width: z.number().min(1).max(100).optional().describe('% of stage width'),
  rotation: z.number().min(-180).max(180).optional(),
  opacity: percent.optional(),
  font: ids(FONTS).optional(),
  size: z.number().min(0.5).max(20).optional().describe('Font size, % of stage width'),
  weight: z.number().int().min(100).max(900).optional(),
  italic: z.boolean().optional(),
  color: color.optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  lineHeight: z.number().min(0.6).max(3).optional(),
  letterSpacing: z.number().min(-0.2).max(1).optional().describe('In em'),
  uppercase: z.boolean().optional(),
}

const overlay = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('text'), ...textStyle }),
  z.strictObject({
    kind: z.literal('button'),
    ...textStyle,
    fill: color.optional(),
    radius: z.number().min(0).max(10).optional().describe('In em'),
    padX: z.number().min(0).max(6).optional().describe('In em'),
    padY: z.number().min(0).max(6).optional().describe('In em'),
    border: z.number().min(0).max(1).optional().describe('In em'),
  }),
])

/** What an assistant may change in a design. Images (screens' media, image backgrounds, logos) stay with the user. */
export const DesignPatchSchema = z.strictObject({
  screens: z
    .array(screen)
    .min(1)
    .max(MAX_SCREENS)
    .optional()
    .describe('All screens in order; screen i keeps the image of current screen i, extra current screens are removed'),
  layout: z.strictObject({ preset: ids(LAYOUT_PRESETS), gap: z.number().min(0).max(20) }).optional(),
  ratio: ids(RATIOS).optional(),
  radius: z.number().min(0).max(120).optional().describe('Corner radius of screenshot and browser frames'),
  frameStyle: ids(FRAME_STYLES).optional(),
  rotation: z
    .strictObject({ x: z.number().min(-60).max(60), y: z.number().min(-60).max(60), z: z.number().min(-180).max(180) })
    .optional()
    .describe('3D tilt of the flat frames, in degrees'),
  shadow: z.strictObject({ mode: z.enum(['none', 'spread', 'hug']), opacity: percent }).optional(),
  background: z
    .discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('transparent') }),
      z.strictObject({ kind: z.literal('solid'), color }),
      z.strictObject({ kind: z.literal('gradient'), from: color, to: color, angle: z.number().min(0).max(360) }),
    ])
    .optional(),
  scene: z.strictObject({ kind: ids(SCENES), opacity: percent }).optional().describe('Light and shadow effect'),
  watermark: z
    .strictObject({ text: z.string().max(80), position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']), opacity: percent })
    .optional(),
  animation: z
    .strictObject({
      preset: ids(ANIMATION_PRESETS),
      duration: z.number().min(1).max(20),
      focus: z.strictObject({ x: percent, y: percent }),
    })
    .optional(),
  overlays: z
    .array(overlay)
    .max(20)
    .refine((list) => {
      const ids = list.flatMap((o) => (o.id ? [o.id] : []))
      return new Set(ids).size === ids.length
    }, 'Each overlay id may appear once')
    .optional()
    .describe('All text and button overlays, bottom to top; listed ids are updated, missing ones removed. Logos are kept'),
})

export type DesignPatch = z.infer<typeof DesignPatchSchema>

/** The design with the patch applied; omitted keys keep their current value. */
export function applyDesignPatch(current: Settings, patch: DesignPatch): Settings {
  const { screens, overlays, ...rest } = patch
  const byId = new Map(current.overlays.map((o) => [o.id, o]))
  return {
    ...current,
    ...rest,
    screens: screens
      ? screens.map((s, i) => ({ ...(current.screens[i] ?? newScreen(s.deviceId)), ...s }))
      : current.screens,
    overlays: overlays
      ? [
          ...current.overlays.filter((o) => o.kind === 'logo'),
          ...overlays.map(({ id, ...o }) => {
            const existing = id ? byId.get(id) : undefined
            // An id that names a logo or an overlay of the other kind starts a fresh overlay.
            const base = existing?.kind === o.kind ? existing : newOverlay(o.kind)
            return { ...base, ...o } as Overlay
          }),
        ]
      : current.overlays,
  }
}

/** The design as an assistant sees it: no blob URLs, and which screens hold an image of which size. */
export function describeDesign(settings: Settings, media: Record<string, { size: MediaSize }>) {
  const { background: bg } = settings
  return {
    ...settings,
    screens: settings.screens.map((s) => {
      const size = media[s.id]?.size
      return { ...s, image: size ? `${size.width}x${size.height}` : null }
    }),
    background: bg.kind === 'image' ? { kind: 'image' as const, blur: bg.blur, note: 'user image, not editable' } : bg,
    overlays: settings.overlays.map((o) =>
      o.kind === 'logo' ? { id: o.id, kind: o.kind, x: o.x, y: o.y, width: o.width, note: 'user logo, kept' } : o,
    ),
  }
}
