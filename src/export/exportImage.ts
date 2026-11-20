import { domToBlob, domToPng } from 'modern-screenshot'
import { DISPLAY_RATIO, withCapture } from './captureHooks'

// The stage is shown through a CSS scale transform; offset sizes ignore it, so the export keeps full resolution.
const fullSize = (node: HTMLElement) => ({ width: node.offsetWidth, height: node.offsetHeight })

export function saveBlob(blob: Blob, extension: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `monkups-${Date.now()}.${extension}`
  a.click()
  // Give the browser time to start the download before releasing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function downloadImage(node: HTMLElement, format: 'png' | 'jpeg', scale: number) {
  // JPEG has no alpha: flatten a transparent background onto white.
  const blob = await withCapture(scale, () =>
    format === 'png'
      ? domToBlob(node, { scale, ...fullSize(node), type: 'image/png' })
      : domToBlob(node, {
          scale,
          ...fullSize(node),
          type: 'image/jpeg',
          quality: 0.95,
          backgroundColor: '#ffffff',
        }),
  )
  saveBlob(blob, format === 'png' ? 'png' : 'jpg')
}

export async function copyImage(node: HTMLElement, scale: number) {
  // The async clipboard only accepts PNG images.
  const blob = await withCapture(scale, () => domToBlob(node, { scale, ...fullSize(node), type: 'image/png' }))
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

/** PNG of the stage at most `width` pixels wide, as base64, for an assistant to look at. */
export async function previewPng(node: HTMLElement, width = 1024): Promise<string> {
  const scale = Math.min(1, width / node.offsetWidth)
  const url = await withCapture(DISPLAY_RATIO, () => domToPng(node, { scale, ...fullSize(node) }))
  return url.slice(url.indexOf(',') + 1)
}

/** Small JPEG preview for the project list. */
export function thumbnailBlob(node: HTMLElement): Promise<Blob> {
  return withCapture(DISPLAY_RATIO, () =>
    domToBlob(node, {
      ...fullSize(node),
      scale: 360 / node.offsetWidth,
      type: 'image/jpeg',
      quality: 0.8,
      backgroundColor: '#111114',
    }),
  )
}
