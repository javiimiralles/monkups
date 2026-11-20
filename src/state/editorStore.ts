import { create } from 'zustand'
import {
  DEFAULT_SETTINGS,
  MAX_SCREENS,
  newScreen,
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
  | 'openProject'
  | 'newProject'
  | 'set'

export type ScreenMedia = { url: string; size: MediaSize }

type EditorState = Settings & {
  /** Media of each screen by screen id; a screen without an entry shows a placeholder. */
  media: Record<string, ScreenMedia>
  selectedScreen: string
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
  openProject: (record: ProjectRecord) => void
  newProject: () => void
  set: (patch: Partial<Omit<EditorState, Actions>>) => void
}

const revokeBlob = (url: string | null | undefined) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

export const useEditor = create<EditorState>((rawSet, get) => {
  // Video formats only make sense while something moves; every update goes through here to keep that rule.
  const setState = (patch: Partial<EditorState>) => {
    rawSet(patch)
    const { animation, exportFormat } = get()
    if (animation.preset === 'none' && isVideoFormat(exportFormat)) rawSet({ exportFormat: 'png' })
  }

  const releaseUrls = () => {
    const { media, background } = get()
    Object.values(media).forEach((m) => revokeBlob(m.url))
    if (background.kind === 'image') revokeBlob(background.url)
  }

  // Frames are sized from the media aspect, so a screen only gets media once its dimensions are known.
  const loadMedia = (id: string, file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const { media, screens } = get()
      // The screen may have been removed while the image loaded.
      if (!screens.some((s) => s.id === id)) return URL.revokeObjectURL(url)
      revokeBlob(media[id]?.url)
      setState({ media: { ...media, [id]: { url, size: { width: img.naturalWidth, height: img.naturalHeight } } } })
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const empty = { media: {}, selectedScreen: DEFAULT_SETTINGS.screens[0].id, notice: '' }

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
      const { screens, media, selectedScreen } = get()
      const selected = screens.find((s) => s.id === selectedScreen)
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
        selectedScreen: targets[0] ?? selectedScreen,
        notice: refused ? `Up to ${MAX_SCREENS} screens fit on one canvas; ${refused} image${refused > 1 ? 's were' : ' was'} not added.` : '',
      })
      targets.forEach((id, i) => loadMedia(id, images[i]))
      return refused
    },
    replaceScreenMedia: (id, file) => {
      if (file.type.startsWith('image/')) loadMedia(id, file)
    },
    removeScreen: (id) => {
      const { screens, media, selectedScreen } = get()
      revokeBlob(media[id]?.url)
      const { [id]: _, ...rest } = media
      // There is always one screen; removing the last one just empties it.
      if (screens.length === 1) return setState({ media: rest })
      const index = screens.findIndex((s) => s.id === id)
      const remaining = screens.filter((s) => s.id !== id)
      setState({
        screens: remaining,
        media: rest,
        selectedScreen: selectedScreen === id ? remaining[Math.min(index, remaining.length - 1)].id : selectedScreen,
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
      setState({
        ...settings,
        background,
        media,
        selectedScreen: settings.screens[0].id,
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
