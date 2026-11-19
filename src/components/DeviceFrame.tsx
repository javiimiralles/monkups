import type { CSSProperties, ReactNode } from 'react'
import { GEOMETRY, type Device } from '../domain/devices'
import { stylePad, type FrameStyle } from '../domain/styles'

type Props = {
  device: Device
  /** Device width in stage pixels; all frame geometry is expressed in em of width / 100. */
  width: number
  height: number
  radius: number
  shadow: string
  /** Applies to screenshots and browser windows only; hardware has its own body. */
  frameStyle: FrameStyle
  children: ReactNode
}

/** Draws the hardware or browser chrome around `children` (the media or placeholder). */
export function DeviceFrame({ device, width, height, radius, shadow, frameStyle, children }: Props) {
  const box: CSSProperties = { width, height, fontSize: width / 100 }
  const drop: CSSProperties = shadow === 'none' ? {} : { filter: `drop-shadow(${shadow})` }
  const g = GEOMETRY
  const pad = stylePad(frameStyle)
  const styled = (inner: ReactNode) => (
    <div
      className={`frame-style ${frameStyle}`}
      style={{ ...box, padding: `${pad}em`, borderRadius: radius + (pad * width) / 100, boxShadow: shadow }}
    >
      {inner}
    </div>
  )

  switch (device.kind) {
    case 'browser': {
      const dark = device.theme === 'dark'
      return styled(
        <div className={`browser ${device.browser} ${dark ? 'dark' : 'light'}`} style={{ borderRadius: radius }}>
          {device.browser === 'chrome' ? (
            <div className="toolbar-chrome" style={{ height: `${g.toolbar.chrome}em` }}>
              <div className="tabs">
                <Lights />
                <div className="tab" />
              </div>
              <div className="bar">
                <div className="omnibox" />
              </div>
            </div>
          ) : (
            <div className="toolbar-safari" style={{ height: `${g.toolbar.safari}em` }}>
              <Lights />
              <div className="address" />
            </div>
          )}
          <div className="screen">{children}</div>
        </div>,
      )
    }
    case 'phone':
    case 'tablet': {
      const bezel = device.kind === 'phone' ? g.phoneBezel : g.tabletBezel
      return (
        <div className={`hardware ${device.kind}`} style={{ ...box, ...drop, padding: `${bezel}em` }}>
          <div className="screen">
            {children}
            {device.kind === 'phone' && <div className="island" />}
          </div>
        </div>
      )
    }
    case 'laptop':
      return (
        <div className="laptop" style={{ ...box, ...drop }}>
          <div className="lid" style={{ width: `${g.laptopLidWidth}em`, padding: `${g.laptopBezel}em` }}>
            <div className="screen">
              {children}
              <div className="notch" />
            </div>
          </div>
          <div className="base" style={{ height: `${g.laptopBase}em` }} />
        </div>
      )
    default:
      return styled(
        <div className="screenshot" style={{ borderRadius: radius }}>
          {children}
        </div>,
      )
  }
}

function Lights() {
  return (
    <div className="lights">
      <span />
      <span />
      <span />
    </div>
  )
}
