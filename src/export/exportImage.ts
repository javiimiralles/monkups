import { domToBlob, domToJpeg, domToPng } from 'modern-screenshot'
import type { ExportFormat } from '../state/editorStore'

// The stage is shown through a CSS scale transform; offset sizes ignore it, so the export keeps full resolution.
const fullSize = (node: HTMLElement) => ({ width: node.offsetWidth, height: node.offsetHeight })

export async function downloadImage(node: HTMLElement, format: ExportFormat, scale: number) {
  // JPEG has no alpha: flatten a transparent background onto white.
  const dataUrl =
    format === 'png'
      ? await domToPng(node, { scale, ...fullSize(node) })
      : await domToJpeg(node, { scale, ...fullSize(node), quality: 0.95, backgroundColor: '#ffffff' })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = `monkups-${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`
  a.click()
}

export async function copyImage(node: HTMLElement, scale: number) {
  // The async clipboard only accepts PNG images.
  const blob = await domToBlob(node, { scale, ...fullSize(node), type: 'image/png' })
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
}

/** Small JPEG preview for the project list. */
export function thumbnailBlob(node: HTMLElement): Promise<Blob> {
  return domToBlob(node, {
    ...fullSize(node),
    scale: 360 / node.offsetWidth,
    type: 'image/jpeg',
    quality: 0.8,
    backgroundColor: '#111114',
  })
}
