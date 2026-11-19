import { GIFEncoder, applyPalette, quantize } from 'gifenc'
import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  Quality,
  WebMOutputFormat,
  canEncodeVideo,
} from 'mediabunny'
import { createContext, destroyContext, domToCanvas } from 'modern-screenshot'
import { flushSync } from 'react-dom'
import { frameTimes } from '../domain/animation'
import { useEditor, type VideoFormat } from '../state/editorStore'
import { saveBlob } from './exportImage'

const FPS: Record<VideoFormat, number> = { mp4: 30, webm: 30, gif: 15 }
const GIF_WIDTH = 720
type Progress = (done: number, total: number) => void

/**
 * Renders the stage once per frame: sets the playhead synchronously, then rasterizes the DOM.
 * Video codecs have no alpha here, so every frame is flattened onto white like JPEG exports.
 */
async function renderFrames(
  node: HTMLElement,
  times: number[],
  size: { width: number; height: number },
  draw: (g: OffscreenCanvasRenderingContext2D, i: number) => Promise<void>,
  onProgress: Progress,
) {
  const canvas = new OffscreenCanvas(size.width, size.height)
  const g = canvas.getContext('2d', { willReadFrequently: true })!
  const scale = size.width / node.offsetWidth
  const ctx = await createContext(node, { width: node.offsetWidth, height: node.offsetHeight, scale })
  const { set } = useEditor.getState()
  try {
    for (let i = 0; i < times.length; i++) {
      flushSync(() => set({ playhead: times[i] }))
      const frame = await domToCanvas(ctx)
      g.fillStyle = '#ffffff'
      g.fillRect(0, 0, size.width, size.height)
      g.drawImage(frame, 0, 0, size.width, size.height)
      await draw(g, i)
      onProgress(i + 1, times.length)
    }
  } finally {
    destroyContext(ctx)
    set({ playhead: null })
  }
  return canvas
}

async function encodeVideo(node: HTMLElement, format: 'mp4' | 'webm', duration: number, onProgress: Progress) {
  const fps = FPS[format]
  const codec = format === 'mp4' ? 'avc' : 'vp9'
  const size = { width: node.offsetWidth, height: node.offsetHeight }
  if (!(await canEncodeVideo(codec, size))) throw new Error(`this browser cannot encode ${format.toUpperCase()}`)

  const output = new Output({
    format: format === 'mp4' ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
    target: new BufferTarget(),
  })
  let source: CanvasSource | null = null
  try {
    await renderFrames(
      node,
      frameTimes(duration, fps),
      size,
      async (g, i) => {
        if (!source) {
          // The source must wrap the canvas being drawn, which exists only once rendering starts.
          source = new CanvasSource(g.canvas, { codec, quality: new Quality('high') })
          output.addVideoTrack(source, { frameRate: fps })
          await output.start()
        }
        await source.add(i / fps, 1 / fps)
      },
      onProgress,
    )
    await output.finalize()
  } catch (err) {
    // Release the encoder before reporting the failure.
    await output.cancel()
    throw err
  }
  return new Blob([output.target.buffer!], { type: format === 'mp4' ? 'video/mp4' : 'video/webm' })
}

async function encodeGif(node: HTMLElement, duration: number, onProgress: Progress) {
  const fps = FPS.gif
  const scale = Math.min(1, GIF_WIDTH / node.offsetWidth)
  const size = { width: Math.round(node.offsetWidth * scale), height: Math.round(node.offsetHeight * scale) }
  const gif = GIFEncoder()
  await renderFrames(
    node,
    frameTimes(duration, fps),
    size,
    async (g) => {
      const { data } = g.getImageData(0, 0, size.width, size.height)
      const palette = quantize(data, 256)
      gif.writeFrame(applyPalette(data, palette), size.width, size.height, { palette, delay: 1000 / fps })
    },
    onProgress,
  )
  gif.finish()
  return new Blob([gif.bytes()], { type: 'image/gif' })
}

export async function exportVideo(node: HTMLElement, format: VideoFormat, duration: number, onProgress: Progress) {
  const blob =
    format === 'gif'
      ? await encodeGif(node, duration, onProgress)
      : await encodeVideo(node, format, duration, onProgress)
  saveBlob(blob, format)
}
