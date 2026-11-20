import { useEffect, useRef, useState } from 'react'
import { Library, confirmDiscard, type LibraryTab } from './components/Library'
import { Sidebar } from './components/Sidebar'
import { Stage } from './components/Stage'
import { frameSize } from './domain/scene'
import { copyImage, downloadImage } from './export/exportImage'
import { isVideoFormat, useEditor, type ExportFormat } from './state/editorStore'

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'jpeg', label: 'JPEG' },
  { id: 'mp4', label: 'MP4' },
  { id: 'webm', label: 'WebM' },
  { id: 'gif', label: 'GIF' },
]

export function App() {
  const { mediaUrl, exportFormat, exportScale, project, animation, playhead, ratio, setMedia, set, newProject } =
    useEditor()
  const [busy, setBusy] = useState(false)
  const animated = animation.preset !== 'none'
  const video = isVideoFormat(exportFormat)
  const [library, setLibrary] = useState<LibraryTab | null>(null)
  const [dragging, setDragging] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('')
  const locked = !mediaUrl || busy || playhead !== null

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) setMedia(file)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [setMedia])

  const run = async (label: string, job: (node: HTMLElement) => Promise<void>) => {
    if (!stageRef.current) return
    setStatus(`${label}…`)
    setBusy(true)
    try {
      await job(stageRef.current)
      setStatus(`${label} done`)
    } catch (err) {
      setStatus(`${label} failed: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  const exportCurrent = async (node: HTMLElement) => {
    if (!isVideoFormat(exportFormat)) return downloadImage(node, exportFormat, exportScale)
    // The video encoders are large; load them only when a video is exported.
    const { exportVideo } = await import('./export/exportVideo')
    await exportVideo(node, exportFormat, animation.duration, (done, total) =>
      setStatus(`Rendering frame ${done}/${total}…`),
    )
  }

  const preview = () => {
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (animation.duration * 1000))
      set({ playhead: t })
      if (t < 1) requestAnimationFrame(tick)
      else setTimeout(() => set({ playhead: null }), 500)
    }
    requestAnimationFrame(tick)
  }

  // The wall label states what Export will produce; GIFs are downscaled by the encoder, so they show no size.
  const { width, height } = frameSize(ratio)
  const scale = video ? 1 : exportScale
  const label = [
    exportFormat === 'gif' ? null : `${width * scale} × ${height * scale}`,
    ratio,
    video ? `${exportFormat.toUpperCase()} · ${animation.duration}s` : `${exportFormat.toUpperCase()} · ${exportScale}x`,
  ].filter(Boolean)

  return (
    <div
      className={`app${dragging ? ' dragging' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => e.relatedTarget === null && setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) setMedia(file)
      }}
    >
      <header className="topbar">
        <span className="brand">
          Monkups
          {project && <span className="project">{project.name}</span>}
        </span>
        <nav className="topnav">
          <button className="ghost" onClick={() => confirmDiscard() && newProject()}>
            New
          </button>
          <button className="ghost" onClick={() => setLibrary('templates')}>
            Templates
          </button>
          <button className="ghost" onClick={() => setLibrary('projects')}>
            Projects
          </button>
        </nav>
        <div className="export" role="group" aria-label="Export">
          {animated && (
            <button disabled={busy || playhead !== null} onClick={preview}>
              Preview
            </button>
          )}
          <div className="seg" role="group" aria-label="Format">
            {FORMATS.map((f) => {
              const needsAnimation = isVideoFormat(f.id) && !animated
              return (
                <button
                  key={f.id}
                  aria-pressed={exportFormat === f.id}
                  disabled={needsAnimation}
                  title={needsAnimation ? 'Pick an animation in Extras to export video' : undefined}
                  onClick={() => set({ exportFormat: f.id })}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
          <div className="seg" role="group" aria-label="Scale">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                aria-pressed={!video && exportScale === n}
                disabled={video}
                onClick={() => set({ exportScale: n })}
              >
                {n}x
              </button>
            ))}
          </div>
          <button disabled={locked} onClick={() => run('Copy', (n) => copyImage(n, exportScale))}>
            Copy
          </button>
          <button className="primary" disabled={locked} onClick={() => run('Export', exportCurrent)}>
            Export
          </button>
        </div>
      </header>
      <main className="wall">
        <Stage ref={stageRef} />
        <p className="wall-label" aria-live="polite">
          {label.map((part) => (
            <span key={part}>{part}</span>
          ))}
          {status && <span className="status">{status}</span>}
        </p>
      </main>
      <Sidebar />
      {library && <Library tab={library} stageRef={stageRef} onClose={() => setLibrary(null)} />}
    </div>
  )
}
