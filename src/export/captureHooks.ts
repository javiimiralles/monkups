/**
 * Work the stage must do before it is rasterized, such as drawing 3D canvases at the export pixel ratio.
 * Stage parts register a hook; every export runs inside `withCapture`.
 */
type Hook = (pixelRatio: number) => void | Promise<void>

/** Pixel ratio of on-screen rendering: one canvas pixel per stage pixel (the stage is shown scaled down). */
export const DISPLAY_RATIO = 1

const hooks = new Set<Hook>()

/** Registers a hook; returns its removal. */
export function beforeCapture(hook: Hook) {
  hooks.add(hook)
  return () => {
    hooks.delete(hook)
  }
}

const prepare = (pixelRatio: number) => Promise.all([...hooks].map((hook) => hook(pixelRatio)))

/** Runs `job` with the stage prepared at `pixelRatio`, then returns it to the display ratio. */
export async function withCapture<T>(pixelRatio: number, job: () => Promise<T>): Promise<T> {
  await prepare(pixelRatio)
  try {
    return await job()
  } finally {
    await prepare(DISPLAY_RATIO)
  }
}
