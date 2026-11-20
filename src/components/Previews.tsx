import type { ReactNode } from 'react'
import { deviceAspect, fitBox, getDevice, type Device } from '../domain/devices'
import { backgroundCss, sceneLayer, shadowCss, type Background, type SceneKind, type ShadowMode } from '../domain/scene'
import type { FrameStyle } from '../domain/styles'
import { DeviceFrame } from './DeviceFrame'

// Thumbnails draw a small virtual scene with the same code as the stage, then scale it down,
// so every option previews exactly what it applies.
const VW = 360
const VH = 240
const MEDIA = <div className="thumb-media" />
const WALL = 'linear-gradient(135deg, #c9ced3, #9aa1a8)'

function Mini({ children, background = WALL, zoom }: { children: ReactNode; background?: string; zoom?: boolean }) {
  return (
    <span className={`thumb${zoom ? ' thumb-zoom' : ''}`} aria-hidden="true">
      <span className="thumb-scene" style={{ width: VW, height: VH, background }}>
        {children}
      </span>
    </span>
  )
}

/** The top-left corner of a screenshot frame, cropped close like a detail shot. */
function Corner({ frameStyle = 'default', radius = 20, shadow = 'none' }: { frameStyle?: FrameStyle; radius?: number; shadow?: string }) {
  return (
    <span className="thumb-corner">
      <DeviceFrame
        device={getDevice('screenshot')}
        width={480}
        height={320}
        radius={radius}
        shadow={shadow}
        frameStyle={frameStyle}
      >
        {MEDIA}
      </DeviceFrame>
    </span>
  )
}

export const StylePreview = ({ id }: { id: FrameStyle }) => (
  <Mini zoom>
    <Corner frameStyle={id} />
  </Mini>
)

export const RadiusPreview = ({ radius }: { radius: number }) => (
  <Mini zoom>
    <Corner radius={radius} />
  </Mini>
)

export const ShadowPreview = ({ mode }: { mode: ShadowMode }) => (
  <Mini background="var(--wall)" zoom>
    <Corner shadow={shadowCss(mode, 55)} />
  </Mini>
)

export function DevicePreview({ device: picked }: { device: Device }) {
  // Option tiles never open a WebGL context: realistic devices preview as their flat counterpart, turned slightly.
  const realistic = picked.kind === '3d'
  const device = realistic ? getDevice(picked.model === 'laptop' ? 'macbook-pro-14' : 'iphone-17-pro') : picked
  const size = fitBox({ width: VW * 0.8, height: VH * 0.82 }, deviceAspect(device, 16 / 10))
  return (
    <Mini>
      <span className="thumb-center" style={realistic ? { transform: 'perspective(600px) rotateY(-24deg)' } : undefined}>
        <DeviceFrame device={device} width={size.width} height={size.height} radius={10} shadow="none" frameStyle="default">
          {MEDIA}
        </DeviceFrame>
      </span>
    </Mini>
  )
}

export const FillPreview = ({ background }: { background: Background }) => (
  <span
    className={`thumb${background.kind === 'transparent' ? ' checker' : ''}`}
    aria-hidden="true"
    style={background.kind === 'transparent' ? undefined : { background: backgroundCss(background) }}
  />
)

export function ScenePreview({ kind, background }: { kind: SceneKind; background: string }) {
  const layer = sceneLayer(kind)
  const sceneStyle = layer && {
    background: layer.background,
    filter: layer.blur ? `blur(${layer.blur / 4}px)` : undefined,
    opacity: 0.8,
  }
  return (
    <Mini background={background}>
      {layer && !layer.front && <span className="thumb-layer" style={sceneStyle!} />}
      <span className="thumb-card" />
      {layer?.front && <span className="thumb-layer" style={sceneStyle!} />}
    </Mini>
  )
}

export function RatioPreview({ ratio }: { ratio: string }) {
  const [w, h] = ratio.split(':').map(Number)
  const scale = 22 / Math.max(w, h)
  return (
    <span className="thumb thumb-ratio" aria-hidden="true">
      <span style={{ width: w * scale, height: h * scale }} />
    </span>
  )
}
