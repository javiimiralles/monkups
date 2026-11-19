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
  !useEditor.getState().mediaUrl || window.confirm('Discard the current design? Unsaved changes will be lost.')

const blobOf = (url: string) => fetch(url).then((r) => r.blob())

async function snapshot(node: HTMLElement, id: string, name: string): Promise<ProjectRecord> {
  const st = useEditor.getState()
  const bg = st.background
  return {
    id,
    name,
    updatedAt: Date.now(),
    settings: pickSettings(st),
    media: st.mediaUrl ? await blobOf(st.mediaUrl) : undefined,
    mediaSize: st.mediaSize ?? undefined,
    backgroundImage: bg.kind === 'image' && bg.url.startsWith('blob:') ? await blobOf(bg.url) : undefined,
    thumbnail: await thumbnailBlob(node),
  }
}

export function Library({ tab: initialTab, stageRef, onClose }: Props) {
  const [tab, setTab] = useState(initialTab)
  const { project, set, openProject } = useEditor()
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
          <div className="row tabs-row">
            <button className={tab === 'templates' ? 'on' : ''} onClick={() => setTab('templates')}>
              Templates
            </button>
            <button className={tab === 'projects' ? 'on' : ''} onClick={() => setTab('projects')}>
              Projects
            </button>
          </div>
          <button aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </header>

        {tab === 'templates' ? (
          <div className="cards">
            {TEMPLATES.map((t) => {
              const settings = applyTemplate(t)
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
                    {getDevice(settings.deviceId).label}
                  </div>
                  <span>{t.name}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <>
            <div className="row save-row">
              <input type="text" aria-label="Project name" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="primary" onClick={() => save(false)}>
                {project ? 'Save' : 'Save project'}
              </button>
              {project && <button onClick={() => save(true)}>Save as new</button>}
            </div>
            {status && <p className="hint">{status}</p>}
            <div className="cards">
              {projects.length === 0 && <p className="hint">No saved projects yet.</p>}
              {projects.map((p) => (
                <div key={p.id} className={`card ${project?.id === p.id ? 'on' : ''}`}>
                  <Thumb blob={p.thumbnail} />
                  <span>{p.name}</span>
                  <small>{new Date(p.updatedAt).toLocaleString()}</small>
                  <div className="row">
                    <button
                      onClick={() => {
                        if (!confirmDiscard()) return
                        openProject(p)
                        onClose()
                      }}
                    >
                      Open
                    </button>
                    <button onClick={() => remove(p)}>Delete</button>
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
