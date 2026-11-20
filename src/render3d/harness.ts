/**
 * Dev-only spike harness (T1): renders every model x angle, then proves the canvases survive the
 * app's export paths (domToBlob at 1x/2x and the video exporter's createContext + domToCanvas loop).
 * Open /render3d.html under `pnpm dev`; `window.spike()` returns the measurements.
 */
import { createContext, destroyContext, domToBlob, domToCanvas } from 'modern-screenshot'
import { ANGLE_PRESETS, type AnglePreset, type DeviceColor, type DeviceModel } from './angles'
import { createDeviceRenderer, projectedAspect, type DeviceRenderer, type RenderOptions } from './renderer'

/** A fake app screenshot drawn in code (no external images). */
function sampleScreen(width: number, height: number, hue: number) {
  const c = document.createElement('canvas')
  c.width = width
  c.height = height
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, width, height)
  grad.addColorStop(0, `hsl(${hue} 80% 58%)`)
  grad.addColorStop(1, `hsl(${hue + 60} 75% 42%)`)
  g.fillStyle = grad
  g.fillRect(0, 0, width, height)
  const u = Math.min(width, height) / 20
  g.fillStyle = 'rgba(255,255,255,0.95)'
  g.font = `700 ${u * 1.6}px system-ui, sans-serif`
  g.fillText('Monkups', u * 1.2, u * 3.4)
  g.font = `400 ${u * 0.7}px system-ui, sans-serif`
  g.fillText('Realistic device spike', u * 1.2, u * 4.6)
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.65)'
    g.beginPath()
    g.roundRect(u * 1.2, u * (6 + i * 3.2), width - u * 2.4, u * 2.6, u * 0.6)
    g.fill()
    g.fillStyle = `hsl(${hue + i * 25} 70% 50%)`
    g.beginPath()
    g.arc(u * 2.6, u * (7.3 + i * 3.2), u * 0.8, 0, Math.PI * 2)
    g.fill()
  }
  return c
}

// Decoded like a real upload: large GPU canvases cannot be used as textures directly (see RenderOptions.screen).
async function asImage(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
  const img = new Image()
  img.src = URL.createObjectURL(blob)
  await img.decode()
  return img
}

const screens = {
  phone: await asImage(sampleScreen(1179, 2556, 210)),
  laptop: await asImage(sampleScreen(2880, 1800, 260)),
}
const HEIGHT = 300

interface Card {
  node: HTMLElement
  canvas: HTMLCanvasElement
  renderer: DeviceRenderer
  opts: RenderOptions
}

function addCard(model: DeviceModel, angle: AnglePreset, color: DeviceColor, preserveDrawingBuffer = true): Card {
  const wrap = document.createElement('div')
  wrap.className = 'card'
  const node = document.createElement('div')
  const width = Math.round(HEIGHT * projectedAspect(model, angle))
  node.style.cssText = `width:${width}px;height:${HEIGHT}px`
  const canvas = document.createElement('canvas')
  canvas.style.cssText = `width:${width}px;height:${HEIGHT}px`
  node.append(canvas)
  const label = document.createElement('p')
  label.textContent = `${model} · ${angle} · ${color}${preserveDrawingBuffer ? '' : ' · no-preserve'}`
  wrap.append(node, label)
  document.getElementById('grid')!.append(wrap)
  const renderer = createDeviceRenderer(canvas, { preserveDrawingBuffer })
  const opts: RenderOptions = { model, angle, color, screen: screens[model], width, height: HEIGHT, pixelRatio: 1 }
  renderer.render(opts)
  return { node, canvas, renderer, opts }
}

const cards: Card[] = []
for (const model of ['phone', 'laptop'] as const)
  for (const angle of ANGLE_PRESETS) cards.push(addCard(model, angle, angle === 'low-hero' ? 'space-black' : 'silver'))
const unpreserved = addCard('laptop', 'three-quarter-left', 'silver', false)

/** Counts non-transparent pixels in a decoded image. */
async function opaquePixels(source: Blob | HTMLCanvasElement) {
  const bmp = source instanceof Blob ? await createImageBitmap(source) : source
  const c = document.createElement('canvas')
  c.width = bmp.width
  c.height = bmp.height
  const g = c.getContext('2d')!
  g.drawImage(bmp, 0, 0)
  const data = g.getImageData(0, 0, c.width, c.height).data
  let n = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] > 8) n++
  return { opaque: n, total: c.width * c.height, width: c.width, height: c.height }
}

const toDataUrl = (b: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.readAsDataURL(b)
  })

/** Synchronous GPU timing: a 1px readback forces the queued frame to finish. */
function timeRenders(width: number, height: number, pixelRatio: number, frames = 8) {
  const canvas = document.createElement('canvas')
  const r = createDeviceRenderer(canvas)
  const gl = canvas.getContext('webgl2')!
  const px = new Uint8Array(4)
  const out: Record<string, number> = {}
  for (const model of ['phone', 'laptop'] as const) {
    const opts: RenderOptions = { model, angle: 'three-quarter-left', color: 'silver', screen: screens[model], width, height, pixelRatio }
    r.render(opts)
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    const t0 = performance.now()
    for (let i = 0; i < frames; i++) {
      r.render({ ...opts, angle: i % 2 ? 'three-quarter-left' : 'three-quarter-right' })
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px)
    }
    out[model] = +((performance.now() - t0) / frames).toFixed(1)
  }
  r.dispose()
  return out
}

async function spike() {
  const result: Record<string, unknown> = {}
  const gl = cards[0].canvas.getContext('webgl2')
  result.gpu = gl?.getParameter(gl.getExtension('WEBGL_debug_renderer_info')?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER)

  // 1. Still exports at 1x and 2x, transparent node so every opaque pixel comes from WebGL.
  const stills = []
  const images: Record<string, string> = {}
  for (const card of cards) {
    const { model, angle } = card.opts
    const s1 = await domToBlob(card.node, { scale: 1, type: 'image/png' })
    const s2Stale = await domToBlob(card.node, { scale: 2, type: 'image/png' })
    card.renderer.render({ ...card.opts, pixelRatio: 2 })
    const s2 = await domToBlob(card.node, { scale: 2, type: 'image/png' })
    card.renderer.render(card.opts)
    stills.push({ model, angle, x1: await opaquePixels(s1), x2: await opaquePixels(s2) })
    images[`${model}-${angle}-1x`] = await toDataUrl(s1)
    images[`${model}-${angle}-2x-rerendered`] = await toDataUrl(s2)
    if (model === 'laptop' && angle === 'three-quarter-left') images[`${model}-${angle}-2x-stale`] = await toDataUrl(s2Stale)
  }
  result.stills = stills

  // 2. Without preserveDrawingBuffer, after the frame has been composited.
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  const lost = await domToBlob(unpreserved.node, { scale: 1, type: 'image/png' })
  unpreserved.renderer.render(unpreserved.opts)
  const sameTask = domToBlob(unpreserved.node, { scale: 1, type: 'image/png' })
  result.noPreserve = { afterComposite: await opaquePixels(lost), renderedRightBefore: await opaquePixels(await sameTask) }
  images['no-preserve-after-composite'] = await toDataUrl(lost)

  // 3. Video path: one context, synchronous re-render per frame, then domToCanvas.
  const card = cards.find((c) => c.opts.model === 'laptop' && c.opts.angle === 'front')!
  const ctx = await createContext(card.node, { width: card.node.offsetWidth, height: card.node.offsetHeight, scale: 2 })
  const frames = []
  const sequence: AnglePreset[] = ['front', 'three-quarter-left', 'three-quarter-right', 'top']
  try {
    for (const [i, angle] of sequence.entries()) {
      const t0 = performance.now()
      card.renderer.render({ ...card.opts, angle, pixelRatio: 2 })
      const frame = await domToCanvas(ctx)
      const ms = performance.now() - t0
      const stats = await opaquePixels(frame)
      images[`video-frame-${i}-${angle}`] = frame.toDataURL('image/png')
      frames.push({ angle, ms: +ms.toFixed(1), ...stats })
    }
  } finally {
    destroyContext(ctx)
    card.renderer.render(card.opts)
  }
  result.video = frames

  // 4. Render cost per frame.
  result.timing = {
    '1920x1440': timeRenders(1920, 1440, 1),
    '3840x2880': timeRenders(1920, 1440, 2),
  }
  return { result, images }
}

;(window as unknown as { spike: typeof spike }).spike = spike
