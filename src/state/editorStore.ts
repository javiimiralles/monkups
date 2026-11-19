import { create } from 'zustand'
import { DEFAULT_SETTINGS, type ProjectRecord, type Settings } from '../domain/project'

export type ExportFormat = 'png' | 'jpeg'

type Actions = 'setMedia' | 'setBackgroundImage' | 'openProject' | 'newProject' | 'set'

type EditorState = Settings & {
  mediaUrl: string | null
  mediaSize: { width: number; height: number } | null
  /** The saved project being edited, if any. */
  project: { id: string; name: string } | null
  exportFormat: ExportFormat
  exportScale: 1 | 2
  setMedia: (file: File) => void
  setBackgroundImage: (file: File) => void
  openProject: (record: ProjectRecord) => void
  newProject: () => void
  set: (patch: Partial<Omit<EditorState, Actions>>) => void
}

const revokeBlob = (url: string | null | undefined) => {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

export const useEditor = create<EditorState>((setState, get) => {
  const releaseUrls = () => {
    const { mediaUrl, background } = get()
    revokeBlob(mediaUrl)
    if (background.kind === 'image') revokeBlob(background.url)
  }

  return {
    ...DEFAULT_SETTINGS,
    mediaUrl: null,
    mediaSize: null,
    project: null,
    exportFormat: 'png',
    exportScale: 1,
    setMedia: (file) => {
      if (!file.type.startsWith('image/')) return
      const url = URL.createObjectURL(file)
      const img = new Image()
      // Frames are sized from the media aspect, so only swap media once its dimensions are known.
      img.onload = () => {
        revokeBlob(get().mediaUrl)
        setState({ mediaUrl: url, mediaSize: { width: img.naturalWidth, height: img.naturalHeight } })
      }
      img.onerror = () => URL.revokeObjectURL(url)
      img.src = url
    },
    setBackgroundImage: (file) => {
      if (!file.type.startsWith('image/')) return
      const previous = get().background
      if (previous.kind === 'image') revokeBlob(previous.url)
      setState({ background: { kind: 'image', url: URL.createObjectURL(file), blur: 0 } })
    },
    openProject: (record) => {
      releaseUrls()
      const { settings } = record
      const background =
        record.backgroundImage && settings.background.kind === 'image'
          ? { ...settings.background, url: URL.createObjectURL(record.backgroundImage) }
          : settings.background
      setState({
        ...settings,
        background,
        mediaUrl: record.media ? URL.createObjectURL(record.media) : null,
        mediaSize: record.mediaSize ?? null,
        project: { id: record.id, name: record.name },
      })
    },
    newProject: () => {
      releaseUrls()
      setState({ ...DEFAULT_SETTINGS, mediaUrl: null, mediaSize: null, project: null })
    },
    set: (patch) => setState(patch),
  }
})
