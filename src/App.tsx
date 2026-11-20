import { useEffect, useRef, useState } from 'react'
import { Library, confirmDiscard, type LibraryTab } from './components/Library'
import { Sidebar } from './components/Sidebar'
import { Stage } from './components/Stage'
import { frameSize } from './domain/scene'
import { copyImage, downloadImage } from './export/exportImage'
import { MAX_SCREENS, isVideoFormat, selectedScreenId, useEditor, type ExportFormat } from './state/editorStore'

const FORMATS: { id: ExportFormat; label: string }[] = [
  { id: 'png', label: 'PNG' },
  { id: 'jpeg', label: 'JPEG' },
  { id: 'mp4', label: 'MP4' },
  { id: 'webm', label: 'WebM' },
  { id: 'gif', label: 'GIF' },
]

/** Typing into a field or the text being edited on the stage must not trigger stage shortcuts or paste. */
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || !!target.closest('input, textarea, select'))

export function App() {
  const { media, exportFormat, exportScale, project, animation, playhead, ratio, notice, editing, addScreens, set, newProject } =
    useEditor()
  const [busy, setBusy] = useState(false)
  const animated = animation.preset !== 'none'
  const video = isVideoFormat(exportFormat)
  const [library, setLibrary] = useState<LibraryTab | null>(null)
  const [dragging, setDragging] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('')
  // While text is edited in place, its caret and focus must never reach an export.
  const locked = !Object.keys(media).length || busy || playhead !== null || editing !== null

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      // Pasting into a text field (project name, watermark) must not add a screen.
      if (isTyping(e.target)) return
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (!file) return
      const { screens, selection, replaceScreenMedia } = useEditor.getState()
      const selected = selectedScreenId(selection)
      // With every slot used, a paste replaces the selected screen instead of being refused.
      if (screens.length >= MAX_SCREENS && selected && media[selected]) replaceScreenMedia(selected, file)
      else addScreens([file])
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addScreens, media])

  // Shortcuts for the selected overlay: Delete, arrows nudge (Shift: further), Ctrl+D duplicates, Enter edits.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target) || document.querySelector('[role="dialog"]')) return
      const st = useEditor.getState()
      const overlay = st.selection?.kind === 'overlay' && st.overlays.find((o) => o.id === st.selection!.id)
      if (!overlay || st.editing) return
      const step = e.shiftKey ? 5 : 0.5
      const nudge: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
      }
      if (e.key === 'Delete' || e.key === 'Backspace') st.removeOverlay(overlay.id)
      else if (nudge[e.key]) st.setOverlay(overlay.id, { x: overlay.x + nudge[e.key][0], y: overlay.y + nudge[e.key][1] })
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') st.duplicateOverlay(overlay.id)
      // Enter on a sidebar button clicks it; only Enter on the stage starts editing.
      else if (e.key === 'Enter' && !(e.target as HTMLElement).closest?.('button:not(.selection-box)'))
        st.startEditing(overlay.id)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
        addScreens([...e.dataTransfer.files])
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
            <button disabled={busy || playhead !== null || editing !== null} onClick={preview}>
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
          {notice && <span className="status notice">{notice}</span>}
        </p>
      </main>
      <Sidebar />
      {library && <Library tab={library} stageRef={stageRef} onClose={() => setLibrary(null)} />}
    </div>
  )
}
