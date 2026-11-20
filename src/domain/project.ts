import {
  GRADIENT_PRESETS,
  type Background,
  type RatioId,
  type SceneKind,
  type ShadowMode,
  type WatermarkPosition,
} from './scene.ts'
import type { Animation } from './animation.ts'
import type { Layout } from './layout.ts'
import { newOverlay, type Overlay } from './overlays.ts'
import type { FrameStyle, Rotation } from './styles.ts'
import type { AnglePreset, DeviceColor } from '../render3d/angles.ts'

/** One screenshot slot: its device and its own placement on top of the layout preset. */
export type ScreenSettings = {
  id: string
  deviceId: string
  /** Offset from the layout slot, in percent of the stage width / height. */
  dx: number
  dy: number
  /** Size relative to the layout slot. */
  scale: number
  /** Camera angle and body colour of realistic (3D) devices; other devices ignore them. */
  angle: AnglePreset
  color: DeviceColor
}

export const MAX_SCREENS = 6

const FIRST_SCREEN = 'screen-1'
export const newScreen = (deviceId: string, id: string = crypto.randomUUID()): ScreenSettings => ({
  id,
  deviceId,
  dx: 0,
  dy: 0,
  scale: 1,
  angle: 'front',
  color: 'silver',
})

/** Every design choice a project or template stores; media and export preferences are separate. */
export type Settings = {
  /** Frame look (style, radius, shadow, rotation) is shared; the device model is per screen. */
  screens: ScreenSettings[]
  layout: Layout
  ratio: RatioId
  radius: number
  frameStyle: FrameStyle
  rotation: Rotation
  shadow: { mode: ShadowMode; opacity: number }
  background: Background
  scene: { kind: SceneKind; opacity: number }
  watermark: { text: string; position: WatermarkPosition; opacity: number }
  animation: Animation
  /** Text, buttons and logos, drawn above the screens in list order. */
  overlays: Overlay[]
}

export const DEFAULT_SETTINGS: Settings = {
  screens: [newScreen('screenshot', FIRST_SCREEN)],
  layout: { preset: 'row', gap: 4 },
  ratio: '4:3',
  radius: 20,
  frameStyle: 'default',
  rotation: { x: 0, y: 0, z: 0 },
  shadow: { mode: 'spread', opacity: 40 },
  background: { kind: 'gradient', from: GRADIENT_PRESETS[0][0], to: GRADIENT_PRESETS[0][1], angle: 135 },
  scene: { kind: 'none', opacity: 40 },
  watermark: { text: '', position: 'bottom-right', opacity: 70 },
  animation: { preset: 'none', duration: 4, focus: { x: 50, y: 50 } },
  overlays: [],
}

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]

export function pickSettings(state: Settings): Settings {
  return Object.fromEntries(KEYS.map((k) => [k, state[k]])) as Settings
}

/**
 * `deviceId` is shorthand for one screen; `screens` lists the devices of a multi-screen template,
 * or a device with its placement. A template without `overlays` keeps the current ones.
 */
export type Template = {
  id: string
  name: string
  settings: Partial<Omit<Settings, 'screens'>> & {
    deviceId?: string
    screens?: (string | (Pick<ScreenSettings, 'deviceId'> & Partial<Omit<ScreenSettings, 'id'>>))[]
  }
}

const gradient = (from: string, to: string, angle = 135): Background => ({ kind: 'gradient', from, to, angle })

export const TEMPLATES: Template[] = [
  { id: 'clean-gradient', name: 'Clean Gradient', settings: {} },
  {
    id: 'glass-ocean',
    name: 'Glass Ocean',
    settings: { frameStyle: 'glass-light', radius: 24, background: gradient('#00c6ff', '#0072ff') },
  },
  {
    id: 'dark-browser',
    name: 'Dark Browser',
    settings: {
      deviceId: 'chrome-dark',
      shadow: { mode: 'hug', opacity: 60 },
      background: gradient('#232526', '#414345'),
    },
  },
  {
    id: 'safari-tilt',
    name: 'Safari Tilt',
    settings: {
      deviceId: 'safari-light',
      frameStyle: 'inset-light',
      rotation: { x: 8, y: -14, z: 0 },
      background: { kind: 'solid', color: '#e9e6f5' },
    },
  },
  {
    id: 'phone-story',
    name: 'Phone Story',
    settings: {
      deviceId: 'iphone-17-pro',
      ratio: '9:16',
      background: gradient('#fc466b', '#3f5efb', 160),
      scene: { kind: 'shapes', opacity: 60 },
    },
  },
  {
    id: 'tilted-iphone',
    name: 'Tilted iPhone',
    settings: {
      deviceId: 'iphone-17-pro-max',
      rotation: { x: 14, y: -22, z: 6 },
      background: gradient('#f7971e', '#ffd200'),
    },
  },
  {
    id: 'laptop-mood',
    name: 'Laptop Mood',
    settings: {
      deviceId: 'macbook-pro-14',
      ratio: '16:9',
      background: gradient('#11998e', '#38ef7d'),
      scene: { kind: 'blinds', opacity: 35 },
    },
  },
  {
    id: 'ipad-minimal',
    name: 'iPad Minimal',
    settings: {
      deviceId: 'ipad-pro-13',
      ratio: '1:1',
      background: { kind: 'solid', color: '#f4f4f6' },
      shadow: { mode: 'spread', opacity: 25 },
    },
  },
  {
    id: 'app-trio',
    name: 'App Trio',
    settings: {
      screens: ['iphone-17-pro', 'iphone-17-pro', 'iphone-17-pro'],
      layout: { preset: 'row', gap: 4 },
      ratio: '16:9',
      background: gradient('#a1c4fd', '#c2e9fb', 160),
    },
  },
  {
    id: 'cta-left',
    name: 'CTA Left',
    settings: {
      screens: [{ deviceId: 'iphone-17-pro', dx: 22, dy: 0, scale: 1 }],
      ratio: '16:9',
      background: gradient('#0b8f8a', '#3fd0b6', 135),
      overlays: [
        { ...newOverlay('text'), x: 8, y: 28, width: 46, size: 5.6 },
        { ...newOverlay('button'), x: 8, y: 62, size: 1.6 },
      ],
    },
  },
  {
    id: 'hero-headline',
    name: 'Hero Headline',
    settings: {
      screens: [{ deviceId: 'iphone-17-pro', dx: 0, dy: 30, scale: 1 }],
      ratio: '4:3',
      background: gradient('#1d2671', '#c33764', 160),
      overlays: [
        { ...newOverlay('text'), x: 10, y: 7, width: 80, size: 5.4, align: 'center' },
        { ...newOverlay('button'), x: 39, y: 27, size: 1.6 },
      ],
    },
  },
  {
    id: 'laptop-phone-3d',
    name: 'Laptop + Phone',
    settings: {
      // The phone stands in front of the laptop's right corner, at roughly its real size next to it.
      screens: [
        { deviceId: 'laptop-3d', dx: 4, dy: 0, scale: 1, angle: 'three-quarter-left' },
        { deviceId: 'phone-3d', dx: -14, dy: 10, scale: 0.56, angle: 'three-quarter-left' },
      ],
      layout: { preset: 'row', gap: 0 },
      ratio: '16:9',
      background: gradient('#e0e3ea', '#b9c0cc', 160),
    },
  },
  {
    id: 'laptop-hero-3d',
    name: 'Laptop Hero',
    settings: {
      screens: [{ deviceId: 'laptop-3d', dx: 0, dy: 0, scale: 1, angle: 'three-quarter-left', color: 'space-black' }],
      ratio: '16:9',
      background: gradient('#141e30', '#243b55', 160),
    },
  },
  {
    id: 'border-pop',
    name: 'Border Pop',
    settings: {
      frameStyle: 'border',
      radius: 32,
      background: gradient('#f7971e', '#fc466b', 45),
      scene: { kind: 'vignette', opacity: 30 },
    },
  },
]

/**
 * Saved projects may predate newer settings; missing ones fall back to their defaults.
 * Projects saved before multi-screen had one `deviceId`; it becomes the first screen.
 * Screens saved before realistic devices get the default angle and colour.
 */
export function restoreSettings(saved: Partial<Settings> & { deviceId?: string }): Settings {
  const { deviceId, ...rest } = saved
  const screens = rest.screens?.map((s) => ({ ...newScreen(s.deviceId, s.id), ...s })) ?? [
    newScreen(deviceId ?? DEFAULT_SETTINGS.screens[0].deviceId, FIRST_SCREEN),
  ]
  return { ...DEFAULT_SETTINGS, ...rest, screens }
}

/**
 * Template settings on top of the defaults. Passing the current screens keeps their ids (and so their media):
 * there are as many screens as the larger of the two, each with the template device and the layout slot.
 */
export function applyTemplate(template: Template, current: ScreenSettings[] = [], overlays: Overlay[] = []): Settings {
  const { deviceId, screens, ...rest } = template.settings
  const devices = screens ?? [deviceId ?? DEFAULT_SETTINGS.screens[0].deviceId]
  const count = Math.max(devices.length, current.length)
  return {
    ...DEFAULT_SETTINGS,
    ...rest,
    // Fresh ids each time, so overlays from two applications of a template never collide.
    overlays: rest.overlays?.map((o) => ({ ...o, id: crypto.randomUUID() })) ?? overlays,
    screens: Array.from({ length: count }, (_, i) => {
      const d = devices[Math.min(i, devices.length - 1)]
      const screen = newScreen(typeof d === 'string' ? d : d.deviceId, current[i]?.id)
      return typeof d === 'string' ? screen : { ...screen, ...d, id: screen.id }
    }),
  }
}

export type MediaSize = { width: number; height: number }

export type ProjectRecord = {
  id: string
  name: string
  updatedAt: number
  settings: Settings
  screens?: { id: string; media?: Blob; mediaSize?: MediaSize }[]
  /** Single media of projects saved before multi-screen; read only. */
  media?: Blob
  mediaSize?: MediaSize
  /** Uploaded background images live as blobs; remote (Unsplash) backgrounds keep their URL in settings. */
  backgroundImage?: Blob
  /** Logo images by overlay id. */
  overlayImages?: Record<string, Blob>
  thumbnail?: Blob
}

/** The saved media of each screen, by screen id; legacy records hold one media for the first screen. */
export function savedMedia(record: ProjectRecord, screens: ScreenSettings[]): Record<string, { blob: Blob; size: MediaSize }> {
  const saved = record.screens ?? [{ id: screens[0].id, media: record.media, mediaSize: record.mediaSize }]
  return Object.fromEntries(
    saved.flatMap((s) => (s.media && s.mediaSize ? [[s.id, { blob: s.media, size: s.mediaSize }]] : [])),
  )
}

export function sortProjects<T extends { updatedAt: number }>(projects: T[]): T[] {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
}
