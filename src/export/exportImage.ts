import { domToBlob } from 'modern-screenshot'

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
  const blob =
    format === 'png'
      ? await domToBlob(node, { scale, ...fullSize(node), type: 'image/png' })
      : await domToBlob(node, {
          scale,
          ...fullSize(node),
          type: 'image/jpeg',
          quality: 0.95,
          backgroundColor: '#ffffff',
        })
  saveBlob(blob, format === 'png' ? 'png' : 'jpg')
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
