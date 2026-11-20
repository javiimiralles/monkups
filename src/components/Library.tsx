import { useEffect, useState, type RefObject } from 'react'
import { getDevice } from '../domain/devices'
import { TEMPLATES, applyTemplate, pickSettings, type ProjectRecord } from '../domain/project'
import { backgroundCss } from '../domain/scene'
import { thumbnailBlob } from '../export/exportImage'
import { deleteProject, listProjects, saveProject } from '../services/projectDb'
import { useEditor } from '../state/editorStore'

export type LibraryTab = 'templates' | 'projects'

type Props = { tab: LibraryTab; stageRef: RefObject<HTMLDivElement | null>; onClose: () => void }

/** Opening a project replaces the current image; ask first so unsaved work is not lost silently. */
export const confirmDiscard = () =>
  !Object.keys(useEditor.getState().media).length || window.confirm('Discard the current design? Unsaved changes will be lost.')

const blobOf = (url: string) => fetch(url).then((r) => r.blob())

async function snapshot(node: HTMLElement, id: string, name: string): Promise<ProjectRecord> {
  const st = useEditor.getState()
  const bg = st.background
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
    thumbnail: await thumbnailBlob(node),
  }
}

export function Library({ tab: initialTab, stageRef, onClose }: Props) {
  const [tab, setTab] = useState(initialTab)
  const { project, screens, set, openProject } = useEditor()
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const [name, setName] = useState(project?.name ?? 'Untitled')
  const [status, setStatus] = useState('')

  const refresh = () =>
    listProjects()
      .then(setProjects)
      .catch((err) => setStatus(`Could not read projects: ${err.message}`))

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async (asNew: boolean) => {
    if (!stageRef.current) return
    const id = !asNew && project ? project.id : crypto.randomUUID()
    const finalName = name.trim() || 'Untitled'
    setStatus('Saving…')
    try {
      await saveProject(await snapshot(stageRef.current, id, finalName))
      set({ project: { id, name: finalName } })
      setStatus(`Saved “${finalName}”`)
      refresh()
    } catch (err) {
      setStatus(`Save failed: ${(err as Error).message}`)
    }
  }

  const remove = async (p: ProjectRecord) => {
    if (!window.confirm(`Delete “${p.name}”? This cannot be undone.`)) return
    await deleteProject(p.id)
    if (project?.id === p.id) set({ project: null })
    refresh()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-label="Library" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <div className="seg" role="group" aria-label="Library section">
            <button aria-pressed={tab === 'templates'} onClick={() => setTab('templates')}>
              Templates
            </button>
            <button aria-pressed={tab === 'projects'} onClick={() => setTab('projects')}>
              Projects
            </button>
          </div>
          <button className="icon" aria-label="Close" onClick={onClose}>
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {tab === 'templates' ? (
          <div className="cards">
            {TEMPLATES.map((t) => {
              const settings = applyTemplate(t, screens)
              return (
                <button
                  key={t.id}
                  className="card"
                  onClick={() => {
                    set(settings)
                    onClose()
                  }}
                >
                  <div className="card-preview" style={{ background: backgroundCss(settings.background) }}>
                    <span className="tag">
                      {getDevice(settings.screens[0].deviceId).label}
                      {settings.screens.length > 1 && ` ×${settings.screens.length}`}
                    </span>
                  </div>
                  <span>{t.name}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <>
            <div className="save-row">
              <input type="text" aria-label="Project name" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="primary" onClick={() => save(false)}>
                {project ? 'Save' : 'Save project'}
              </button>
              {project && <button onClick={() => save(true)}>Save as new</button>}
            </div>
            {status && <p className="hint">{status}</p>}
            <div className="cards">
              {projects.length === 0 && <p className="hint">No saved projects yet. Name this design and save it.</p>}
              {projects.map((p) => (
                <div key={p.id} className={`card ${project?.id === p.id ? 'on' : ''}`}>
                  <Thumb blob={p.thumbnail} />
                  <span>{p.name}</span>
                  <small>{new Date(p.updatedAt).toLocaleString()}</small>
                  <div className="card-actions">
                    <button
                      onClick={() => {
                        if (!confirmDiscard()) return
                        openProject(p)
                        onClose()
                      }}
                    >
                      Open
                    </button>
                    <button className="danger" onClick={() => remove(p)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Thumb({ blob }: { blob?: Blob }) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!blob) return
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url ? <img className="card-preview" src={url} alt="" /> : <div className="card-preview" />
}
