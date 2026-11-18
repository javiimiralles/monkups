import { useEffect, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Stage } from './components/Stage'
import { copyImage, downloadImage } from './export/exportImage'
import { useEditor, type ExportFormat } from './state/editorStore'

export function App() {
  const { mediaUrl, exportFormat, exportScale, setMedia, set } = useEditor()
  const stageRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState('')

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
    try {
      await job(stageRef.current)
      setStatus(`${label} done`)
    } catch (err) {
      setStatus(`${label} failed: ${(err as Error).message}`)
    }
  }

  return (
    <div
      className="app"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        const file = e.dataTransfer.files[0]
        if (file) setMedia(file)
      }}
    >
      <Sidebar />
      <main>
        <header className="toolbar">
          <span className="status">{status}</span>
          <select value={exportFormat} onChange={(e) => set({ exportFormat: e.target.value as ExportFormat })}>
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
          </select>
          <select value={exportScale} onChange={(e) => set({ exportScale: +e.target.value as 1 | 2 })}>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
          </select>
          <button disabled={!mediaUrl} onClick={() => run('Copy', (n) => copyImage(n, exportScale))}>
            Copy
          </button>
          <button
            className="primary"
            disabled={!mediaUrl}
            onClick={() => run('Export', (n) => downloadImage(n, exportFormat, exportScale))}
          >
            Export
          </button>
        </header>
        <Stage ref={stageRef} />
      </main>
    </div>
  )
}
