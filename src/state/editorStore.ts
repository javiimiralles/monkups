import { create } from 'zustand'
import { newOverlay, type Overlay } from '../domain/overlays'
import {
  DEFAULT_SETTINGS,
  MAX_SCREENS,
  newScreen,
  pickSettings,
  restoreSettings,
  savedMedia,
  type MediaSize,
  type ProjectRecord,
  type ScreenSettings,
  type Settings,
} from '../domain/project'

export { MAX_SCREENS }

export type VideoFormat = 'mp4' | 'webm' | 'gif'
export type ExportFormat = 'png' | 'jpeg' | VideoFormat
export const isVideoFormat = (f: ExportFormat): f is VideoFormat => f === 'mp4' || f === 'webm' || f === 'gif'

type Actions =
  | 'addScreens'
  | 'replaceScreenMedia'
  | 'removeScreen'
  | 'moveScreen'
  | 'setScreen'
  | 'setBackgroundImage'
  | 'addOverlay'
  | 'addLogo'
  | 'setOverlay'
  | 'removeOverlay'
  | 'duplicateOverlay'
  | 'moveOverlay'
  | 'startEditing'
  | 'commitEditing'
  | 'cancelEditing'
  | 'openProject'
  | 'newProject'
  | 'set'

export type ScreenMedia = { url: string; size: MediaSize }
export type Selection = { kind: 'screen' | 'overlay'; id: string } | null
// Every overlay kind shares the placement keys; kind-specific keys are only sent for overlays of that kind.
type OverlayPatch = Partial<Omit<Overlay, 'id' | 'kind'>> & Record<string, unknown>

type EditorState = Settings & {
  /** Media of each screen by screen id; a screen without an entry shows a placeholder. */
  media: Record<string, ScreenMedia>
  /** What the stage outlines and the inspector edits; clicking empty stage clears it. */
  selection: Selection
  /** The text or button overlay being edited in place on the stage; exports wait until it is committed. */
  editing: string | null
  /** A non-blocking message for the user, such as files refused over the screen limit. */
  notice: string
  /** The saved project being edited, if any. */
  project: { id: string; name: string } | null
  /** Normalized animation time while previewing or rendering video; null shows the static design. */
  playhead: number | null
  exportFormat: ExportFormat
  exportScale: 1 | 2
  /** Fills the selected screen if empty, then appends screens up to the limit; returns how many images were refused. */
  addScreens: (files: File[]) => number
  replaceScreenMedia: (id: string, file: File) => void
  removeScreen: (id: string) => void
  moveScreen: (id: string, step: -1 | 1) => void
  setScreen: (id: string, patch: Partial<Omit<ScreenSettings, 'id'>>) => void
  setBackgroundImage: (file: File) => void
  /** Adds and selects a text or button overlay; returns its id. */
  addOverlay: (kind: 'text' | 'button') => string
  /** Adds and selects a logo once its image size is known. */
  addLogo: (file: File) => void
  setOverlay: (id: string, patch: OverlayPatch) => void
  removeOverlay: (id: string) => void
  /** Copies an overlay above the others and selects the copy; returns its id. */
  duplicateOverlay: (id: string) => string | undefined
  /** Moves an overlay one step up (1) or down (-1) in the stacking order. */
  moveOverlay: (id: string, step: -1 | 1) => void
  startEditing: (id: string) => void
  commitEditing: (id: string, text: string) => void
  cancelEditing: () => void
  openProject: (record: ProjectRecord) => void
  newProject: () => void
  set: (patch: Partial<Omit<EditorState, Actions>>) => void
}

const revokeBlob = (url: string | null | undefined) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

const logoUrls = (overlays: Overlay[]) => new Set(overlays.flatMap((o) => (o.kind === 'logo' ? [o.src] : [])))

/** The id of the selected screen, if a screen is selected. */
export const selectedScreenId = (selection: Selection) => (selection?.kind === 'screen' ? selection.id : undefined)

export const useEditor = create<EditorState>((rawSet, get) => {
  // Every update goes through here to keep two rules: video formats only make sense while something moves,
  // and a logo URL is released once no overlay uses it (removed, replaced by a template or another project).
  const setState = (patch: Partial<EditorState>) => {
    const before = logoUrls(get().overlays)
    rawSet(patch)
    const after = logoUrls(get().overlays)
    before.forEach((url) => after.has(url) || revokeBlob(url))
    const { animation, exportFormat } = get()
    if (animation.preset === 'none' && isVideoFormat(exportFormat)) rawSet({ exportFormat: 'png' })
  }

  const releaseUrls = () => {
    const { media, background } = get()
    Object.values(media).forEach((m) => revokeBlob(m.url))
    if (background.kind === 'image') revokeBlob(background.url)
  }

  // Images are placed by their aspect, so they are only used once their dimensions are known.
  const loadImage = (file: File, onLoad: (url: string, size: MediaSize) => boolean) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      if (!onLoad(url, { width: img.naturalWidth, height: img.naturalHeight })) URL.revokeObjectURL(url)
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const loadMedia = (id: string, file: File) =>
    loadImage(file, (url, size) => {
      const { media, screens } = get()
      // The screen may have been removed while the image loaded.
      if (!screens.some((s) => s.id === id)) return false
      revokeBlob(media[id]?.url)
      setState({ media: { ...media, [id]: { url, size } } })
      return true
    })

  const addOverlays = (overlay: Overlay) =>
    setState({ overlays: [...get().overlays, overlay], selection: { kind: 'overlay', id: overlay.id } })

  const empty = {
    media: {},
    selection: { kind: 'screen', id: DEFAULT_SETTINGS.screens[0].id } as Selection,
    editing: null,
    notice: '',
  }

  return {
    ...DEFAULT_SETTINGS,
    ...empty,
    project: null,
    playhead: null,
    exportFormat: 'png',
    exportScale: 1,
    addScreens: (files) => {
      const images = files.filter((f) => f.type.startsWith('image/'))
      if (!images.length) return 0
      const { screens, media, selection } = get()
      const selected = screens.find((s) => s.id === selectedScreenId(selection))
      // The selected empty screen first, then the other empty ones, then new screens.
      const emptyIds = screens.filter((s) => !media[s.id]).map((s) => s.id)
      const targets = (selected && !media[selected.id] ? [selected.id, ...emptyIds.filter((id) => id !== selected.id)] : emptyIds).slice(0, images.length)
      const added: ScreenSettings[] = []
      // New screens copy the device of the selected one, so a row of phones stays a row of phones.
      const deviceId = (selected ?? screens[screens.length - 1]).deviceId
      while (targets.length < images.length && screens.length + added.length < MAX_SCREENS) {
        const screen = newScreen(deviceId)
        added.push(screen)
        targets.push(screen.id)
      }
      const refused = images.length - targets.length
      setState({
        screens: [...screens, ...added],
        selection: targets[0] ? { kind: 'screen', id: targets[0] } : selection,
        notice: refused ? `Up to ${MAX_SCREENS} screens fit on one canvas; ${refused} image${refused > 1 ? 's were' : ' was'} not added.` : '',
      })
      targets.forEach((id, i) => loadMedia(id, images[i]))
      return refused
    },
    replaceScreenMedia: (id, file) => {
      if (file.type.startsWith('image/')) loadMedia(id, file)
    },
    removeScreen: (id) => {
      const { screens, media, selection } = get()
      revokeBlob(media[id]?.url)
      const { [id]: _, ...rest } = media
      // There is always one screen; removing the last one just empties it.
      if (screens.length === 1) return setState({ media: rest })
      const index = screens.findIndex((s) => s.id === id)
      const remaining = screens.filter((s) => s.id !== id)
      setState({
        screens: remaining,
        media: rest,
        selection:
          selectedScreenId(selection) === id
            ? { kind: 'screen', id: remaining[Math.min(index, remaining.length - 1)].id }
            : selection,
      })
    },
    moveScreen: (id, step) => {
      const screens = [...get().screens]
      const i = screens.findIndex((s) => s.id === id)
      const j = i + step
      if (i < 0 || j < 0 || j >= screens.length) return
      ;[screens[i], screens[j]] = [screens[j], screens[i]]
      setState({ screens })
    },
    setScreen: (id, patch) => setState({ screens: get().screens.map((s) => (s.id === id ? { ...s, ...patch } : s)) }),
    setBackgroundImage: (file) => {
      if (!file.type.startsWith('image/')) return
      const previous = get().background
      if (previous.kind === 'image') revokeBlob(previous.url)
      setState({ background: { kind: 'image', url: URL.createObjectURL(file), blur: 0 } })
    },
    addOverlay: (kind) => {
      const overlay = newOverlay(kind)
      addOverlays(overlay)
      return overlay.id
    },
    addLogo: (file) => {
      if (!file.type.startsWith('image/')) return
      loadImage(file, (src, size) => {
        addOverlays(newOverlay('logo', { src, size }))
        return true
      })
    },
    setOverlay: (id, patch) =>
      setState({ overlays: get().overlays.map((o) => (o.id === id ? ({ ...o, ...patch } as Overlay) : o)) }),
    removeOverlay: (id) => {
      const { overlays, selection, editing } = get()
      setState({
        overlays: overlays.filter((o) => o.id !== id),
        selection: selection?.id === id ? null : selection,
        editing: editing === id ? null : editing,
      })
    },
    duplicateOverlay: (id) => {
      const source = get().overlays.find((o) => o.id === id)
      if (!source) return
      // Offset the copy so it does not hide exactly over the original; a logo copy shares its image URL.
      const copy = { ...source, id: crypto.randomUUID(), x: source.x + 2, y: source.y + 2 }
      addOverlays(copy)
      return copy.id
    },
    moveOverlay: (id, step) => {
      const overlays = [...get().overlays]
      const i = overlays.findIndex((o) => o.id === id)
      const j = i + step
      if (i < 0 || j < 0 || j >= overlays.length) return
      ;[overlays[i], overlays[j]] = [overlays[j], overlays[i]]
      setState({ overlays })
    },
    startEditing: (id) => {
      const overlay = get().overlays.find((o) => o.id === id)
      if (overlay && overlay.kind !== 'logo') setState({ editing: id, selection: { kind: 'overlay', id } })
    },
    // Only the overlay being edited can be committed, so a blur after Escape changes nothing.
    commitEditing: (id, text) => {
      if (get().editing !== id) return
      setState({ editing: null, overlays: get().overlays.map((o) => (o.id === id ? { ...o, text } : o)) })
    },
    cancelEditing: () => setState({ editing: null }),
    openProject: (record) => {
      releaseUrls()
      const settings = restoreSettings(record.settings)
      const background =
        record.backgroundImage && settings.background.kind === 'image'
          ? { ...settings.background, url: URL.createObjectURL(record.backgroundImage) }
          : settings.background
      const media = Object.fromEntries(
        Object.entries(savedMedia(record, settings.screens)).map(([id, m]) => [
          id,
          { url: URL.createObjectURL(m.blob), size: m.size },
        ]),
      )
      const images = record.overlayImages ?? {}
      // Saved logo URLs are dead; each logo gets a fresh URL for its saved image (none if it was lost).
      const overlays = settings.overlays.map((o) =>
        o.kind === 'logo' ? { ...o, src: images[o.id] ? URL.createObjectURL(images[o.id]) : '' } : o,
      )
      setState({
        ...settings,
        background,
        media,
        overlays,
        selection: { kind: 'screen', id: settings.screens[0].id },
        editing: null,
        notice: '',
        project: { id: record.id, name: record.name },
      })
    },
    newProject: () => {
      releaseUrls()
      setState({ ...DEFAULT_SETTINGS, ...empty, project: null })
    },
    set: (patch) => setState(patch),
  }
})

const blobOf = (url: string) => fetch(url).then((r) => r.blob())

/** The current design as a project record, with its images as blobs; the caller adds the thumbnail. */
export async function toRecord(id: string, name: string): Promise<ProjectRecord> {
  const st = useEditor.getState()
  const bg = st.background
  const logos = st.overlays.flatMap((o) => (o.kind === 'logo' && o.src.startsWith('blob:') ? [o] : []))
  return {
    id,
    name,
    updatedAt: Date.now(),
    settings: pickSettings(st),
    screens: await Promise.all(
      st.screens.map(async ({ id }) => {
        const m = st.media[id]
        return m ? { id, media: await blobOf(m.url), mediaSize: m.size } : { id }
      }),
    ),
    backgroundImage: bg.kind === 'image' && bg.url.startsWith('blob:') ? await blobOf(bg.url) : undefined,
    overlayImages: Object.fromEntries(await Promise.all(logos.map(async (o) => [o.id, await blobOf(o.src)] as const))),
  }
}
