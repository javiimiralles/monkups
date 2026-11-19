import {
  GRADIENT_PRESETS,
  type Background,
  type RatioId,
  type SceneKind,
  type ShadowMode,
  type WatermarkPosition,
} from './scene'
import type { FrameStyle, Rotation } from './styles'

/** Every design choice a project or template stores; media and export preferences are separate. */
export type Settings = {
  deviceId: string
  ratio: RatioId
  radius: number
  frameStyle: FrameStyle
  rotation: Rotation
  shadow: { mode: ShadowMode; opacity: number }
  background: Background
  scene: { kind: SceneKind; opacity: number }
  watermark: { text: string; position: WatermarkPosition; opacity: number }
}

export const DEFAULT_SETTINGS: Settings = {
  deviceId: 'screenshot',
  ratio: '4:3',
  radius: 20,
  frameStyle: 'default',
  rotation: { x: 0, y: 0, z: 0 },
  shadow: { mode: 'spread', opacity: 40 },
  background: { kind: 'gradient', from: GRADIENT_PRESETS[0][0], to: GRADIENT_PRESETS[0][1], angle: 135 },
  scene: { kind: 'none', opacity: 40 },
  watermark: { text: '', position: 'bottom-right', opacity: 70 },
}

const KEYS = Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]

export function pickSettings(state: Settings): Settings {
  return Object.fromEntries(KEYS.map((k) => [k, state[k]])) as Settings
}

export type Template = { id: string; name: string; settings: Partial<Settings> }

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

export function applyTemplate(template: Template): Settings {
  return { ...DEFAULT_SETTINGS, ...template.settings }
}

export type ProjectRecord = {
  id: string
  name: string
  updatedAt: number
  settings: Settings
  media?: Blob
  mediaSize?: { width: number; height: number }
  /** Uploaded background images live as blobs; remote (Unsplash) backgrounds keep their URL in settings. */
  backgroundImage?: Blob
  thumbnail?: Blob
}

export function sortProjects<T extends { updatedAt: number }>(projects: T[]): T[] {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt)
}
