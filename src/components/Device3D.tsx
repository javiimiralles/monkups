import { useEffect, useRef } from 'react'
import type { AnglePreset, DeviceColor, DeviceModel } from '../render3d/angles'
import type { DeviceRenderer } from '../render3d/renderer'
import { DISPLAY_RATIO, beforeCapture } from '../export/captureHooks'

type Props = {
  model: DeviceModel
  angle: AnglePreset
  color: DeviceColor
  /** Blob URL of the screenshot shown on the device screen. */
  src?: string
  /** Size in stage pixels; the canvas fills it. */
  width: number
  height: number
}

/**
 * A realistic device drawn by three.js into a transparent canvas, so backgrounds, scenes and overlays
 * stay DOM layers. three.js loads on first use. Exports re-render it at their pixel ratio through `beforeCapture`.
 */
export function Device3D({ model, angle, color, src, width, height }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const live = useRef({
    renderer: null as DeviceRenderer | null,
    screen: null as HTMLImageElement | null,
    ratio: DISPLAY_RATIO,
    rendererReady: Promise.resolve(),
    screenReady: Promise.resolve(),
  })
  const opts = useRef({ model, angle, color, width, height })
  opts.current = { model, angle, color, width, height }
  const draw = () => {
    const l = live.current
    l.renderer?.render({ ...opts.current, screen: l.screen, pixelRatio: l.ratio })
  }

  useEffect(() => {
    const l = live.current
    let disposed = false
    l.rendererReady = import('../render3d/renderer').then(({ createDeviceRenderer }) => {
      if (disposed) return
      l.renderer = createDeviceRenderer(canvasRef.current!)
      draw()
    })
    const off = beforeCapture(async (ratio) => {
      await Promise.all([l.rendererReady, l.screenReady])
      l.ratio = ratio
      draw()
    })
    return () => {
      disposed = true
      off()
      // Releases the WebGL context, so removed devices never count against the browser's context limit.
      l.renderer?.dispose()
      l.renderer = null
    }
  }, [])

  useEffect(() => {
    const l = live.current
    if (!src) {
      l.screen = null
      l.screenReady = Promise.resolve()
      draw()
      return
    }
    let stale = false
    // Decoded images upload reliably; see RenderOptions.screen.
    const img = new Image()
    img.src = src
    l.screenReady = img
      .decode()
      .catch(() => {})
      .then(() => {
        if (stale) return
        l.screen = img
        draw()
      })
    return () => {
      stale = true
    }
  }, [src])

  useEffect(draw, [model, angle, color, width, height])

  return <canvas ref={canvasRef} className="device-3d" style={{ width, height, display: 'block' }} />
}
